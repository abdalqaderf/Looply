import { EXAM_STATUS, QUESTION_TYPES, STORAGE_KEYS } from "../core/config.js";

import { readStorage, writeStorage } from "../core/storage.js";

import { generateId, normalizeText } from "../core/utils.js";

const ALLOWED_EXAM_STATUSES = new Set(Object.values(EXAM_STATUS));

const ALLOWED_QUESTION_TYPES = new Set(Object.values(QUESTION_TYPES));
const QUESTION_TYPE_LABELS = Object.freeze({
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Multiple Choice",
  [QUESTION_TYPES.TRUE_FALSE]: "True or False",
  [QUESTION_TYPES.SHORT_ANSWER]: "Short Answer",
  [QUESTION_TYPES.CODE_OUTPUT]: "Code Output",
});
const LEGACY_EXAM_STATUSES = Object.freeze({
  draft: EXAM_STATUS.INACTIVE,
  closed: EXAM_STATUS.END,
});

export function getQuestionTypeLabel(type) {
  return QUESTION_TYPE_LABELS[type] ?? "Question";
}

function migrateStoredExamStatus(exam) {
  const currentStatus = normalizeText(exam?.status).toLowerCase();

  const migratedStatus = LEGACY_EXAM_STATUSES[currentStatus];

  if (!migratedStatus) {
    return {
      exam,
      changed: false,
    };
  }

  return {
    exam: {
      ...exam,
      status: migratedStatus,
    },
    changed: true,
  };
}

export function getAllExams() {
  const storedExams = readStorage(STORAGE_KEYS.EXAMS, []);

  if (!Array.isArray(storedExams)) {
    return [];
  }

  let storageChanged = false;

  const exams = storedExams.map((exam) => {
    const migration = migrateStoredExamStatus(exam);

    storageChanged = storageChanged || migration.changed;

    return migration.exam;
  });

  if (storageChanged) {
    writeStorage(STORAGE_KEYS.EXAMS, exams);
  }

  return exams;
}

export function getExamById(examId, { includeDeleted = true } = {}) {
  const normalizedId = normalizeText(examId);

  if (!normalizedId) {
    return null;
  }

  return (
    getAllExams().find(
      (exam) =>
        exam.id === normalizedId && (includeDeleted || exam.isDeleted !== true),
    ) ?? null
  );
}

export function getActiveExams() {
  return getAllExams()
    .filter(
      (exam) => exam.status === EXAM_STATUS.ACTIVE && exam.isDeleted !== true,
    )
    .sort(
      (firstExam, secondExam) =>
        new Date(firstExam.startAt).getTime() -
        new Date(secondExam.startAt).getTime(),
    );
}

export function getExamsByTeacher(teacherId, { includeDeleted = false } = {}) {
  const normalizedTeacherId = normalizeText(teacherId);

  return getAllExams()
    .filter(
      (exam) =>
        exam.teacherId === normalizedTeacherId &&
        (includeDeleted || exam.isDeleted !== true),
    )
    .sort(
      (firstExam, secondExam) =>
        new Date(secondExam.createdAt).getTime() -
        new Date(firstExam.createdAt).getTime(),
    );
}

function normalizeOptions(options, questionId) {
  if (!options || typeof options !== "object") {
    return [];
  }

  const entries = Array.isArray(options)
    ? options.map((option, index) => [String(index + 1), option])
    : Object.entries(options);

  return entries
    .map(([fallbackId, option], index) => {
      if (typeof option === "string") {
        const text = normalizeText(option);

        return text
          ? {
              id:
                normalizeText(fallbackId) ||
                `${questionId}-option-${index + 1}`,
              text,
            }
          : null;
      }

      const text = normalizeText(option?.text);

      if (!text) {
        return null;
      }

      return {
        id:
          normalizeText(option?.id) ||
          normalizeText(fallbackId) ||
          `${questionId}-option-${index + 1}`,
        text,
      };
    })
    .filter(Boolean);
}

function normalizeQuestion(question = {}, index = 0) {
  const questionId =
    normalizeText(question.id) || generateId(`question-${index + 1}`);

  const type =
    normalizeText(question.type).toLowerCase() ||
    QUESTION_TYPES.MULTIPLE_CHOICE;

  if (!ALLOWED_QUESTION_TYPES.has(type)) {
    throw new Error(`Unsupported question type: ${type}`);
  }

  const text = normalizeText(question.text);
  const points = Number(question.points);

  if (!text) {
    throw new Error("Every question needs question text.");
  }

  if (!Number.isFinite(points) || points <= 0) {
    throw new Error("Every question must have points greater than zero.");
  }

  let options = normalizeOptions(question.options, questionId);

  let correctAnswer = normalizeText(
    question.correctAnswer ?? question.correct_answer,
  );

  if (type === QUESTION_TYPES.TRUE_FALSE) {
    options = [
      {
        id: "true",
        text: "True",
      },
      {
        id: "false",
        text: "False",
      },
    ];

    correctAnswer = correctAnswer.toLowerCase();

    if (!["true", "false"].includes(correctAnswer)) {
      throw new Error("A true-false answer must be true or false.");
    }
  }

  if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    if (options.length < 2) {
      throw new Error("A multiple-choice question needs at least two options.");
    }

    const answerExists = options.some((option) => option.id === correctAnswer);

    if (!answerExists) {
      throw new Error(
        "The correct answer must match one multiple-choice option ID.",
      );
    }
  }

  if (!correctAnswer) {
    throw new Error("Every question needs a correct answer.");
  }

  return {
    id: questionId,
    type,
    text,
    code: String(question.code ?? "").trim(),
    points,
    options,
    correctAnswer,
  };
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) {
    return [];
  }

  return questions.map(normalizeQuestion);
}

function normalizeExamData(data = {}, currentExam = null) {
  const status = normalizeText(
    data.status ?? currentExam?.status ?? EXAM_STATUS.INACTIVE,
  ).toLowerCase();

  if (!ALLOWED_EXAM_STATUSES.has(status)) {
    throw new Error("Invalid exam status.");
  }

  const durationMinutes = Number(
    data.durationMinutes ?? data.duration ?? currentExam?.durationMinutes,
  );

  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Exam duration must be a positive whole number.");
  }

  const questions =
    data.questions === undefined
      ? (currentExam?.questions ?? [])
      : normalizeQuestions(data.questions);

  return {
    teacherId: normalizeText(data.teacherId ?? currentExam?.teacherId),
    title: normalizeText(data.title ?? currentExam?.title),
    description: normalizeText(data.description ?? currentExam?.description),
    instructions: normalizeText(data.instructions ?? currentExam?.instructions),
    startAt: String(data.startAt ?? currentExam?.startAt ?? ""),
    endAt: String(data.endAt ?? currentExam?.endAt ?? ""),
    durationMinutes,
    status,
    questions,
  };
}

function validateExamData(exam) {
  if (!exam.teacherId) {
    throw new Error("Teacher ID is required.");
  }

  if (!exam.title) {
    throw new Error("Exam title is required.");
  }
  if (!exam.description) {
    throw new Error("Exam description is required.");
  }

  if (!exam.instructions) {
    throw new Error("Exam instructions are required.");
  }

  const startTime = new Date(exam.startAt).getTime();
  const endTime = new Date(exam.endAt).getTime();

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    throw new Error("Exam start and end dates must be valid.");
  }

  if (endTime <= startTime) {
    throw new Error("Exam end date must be later than its start date.");
  }
}

export function getExamTotalPoints(examOrId) {
  const exam = typeof examOrId === "string" ? getExamById(examOrId) : examOrId;

  if (!exam) {
    return 0;
  }

  return (exam.questions ?? []).reduce(
    (total, question) => total + Number(question.points || 0),
    0,
  );
}

export function createExam(data = {}) {
  const exams = getAllExams();
  const examData = normalizeExamData(data);

  validateExamData(examData);

  const timestamp = new Date().toISOString();

  const exam = {
    id: generateId("exam"),
    ...examData,
    isDeleted: false,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  exams.push(exam);
  writeStorage(STORAGE_KEYS.EXAMS, exams);

  return exam;
}

export function updateExam(examId, changes = {}) {
  const exams = getAllExams();
  const examIndex = exams.findIndex((exam) => exam.id === examId);

  if (examIndex === -1) {
    throw new Error("Exam was not found.");
  }

  if (exams[examIndex].isDeleted === true) {
    throw new Error("A deleted exam cannot be updated.");
  }

  const examData = normalizeExamData(changes, exams[examIndex]);
  validateExamData(examData);

  const updatedExam = {
    ...exams[examIndex],
    ...examData,
    updatedAt: new Date().toISOString(),
  };

  exams[examIndex] = updatedExam;
  writeStorage(STORAGE_KEYS.EXAMS, exams);

  return updatedExam;
}

export function changeExamStatus(examId, status) {
  const normalizedStatus = normalizeText(status).toLowerCase();

  if (!ALLOWED_EXAM_STATUSES.has(normalizedStatus)) {
    throw new Error("Invalid exam status.");
  }

  return updateExam(examId, {
    status: normalizedStatus,
  });
}

export function deleteExam(examId) {
  const exams = getAllExams();
  const examIndex = exams.findIndex((exam) => exam.id === examId);

  if (examIndex === -1) {
    throw new Error("Exam was not found.");
  }

  if (exams[examIndex].isDeleted === true) {
    throw new Error("Exam is already deleted.");
  }

  const timestamp = new Date().toISOString();

  const deletedExam = {
    ...exams[examIndex],
    isDeleted: true,
    deletedAt: timestamp,
    status: EXAM_STATUS.END,
    updatedAt: timestamp,
  };

  exams[examIndex] = deletedExam;
  writeStorage(STORAGE_KEYS.EXAMS, exams);

  return deletedExam;
}

export function restoreExam(examId) {
  const exams = getAllExams();
  const examIndex = exams.findIndex((exam) => exam.id === examId);

  if (examIndex === -1) {
    throw new Error("Exam was not found.");
  }

  if (exams[examIndex].isDeleted !== true) {
    return exams[examIndex];
  }

  const restoredExam = {
    ...exams[examIndex],
    isDeleted: false,
    deletedAt: null,
    status: EXAM_STATUS.INACTIVE,
    updatedAt: new Date().toISOString(),
  };

  exams[examIndex] = restoredExam;
  writeStorage(STORAGE_KEYS.EXAMS, exams);

  return restoredExam;
}
