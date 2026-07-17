import {
    ATTEMPT_STATUS,
    EXAM_STATUS,
    STORAGE_KEYS
} from "../core/config.js";

import {
    readStorage,
    writeStorage
} from "../core/storage.js";

import {
    calculatePercentage,
    generateId,
    normalizeText
} from "../core/utils.js";

import {
    getExamById,
    getExamTotalPoints
} from "./exams-service.js";

export function getAllAttempts() {
    const attempts = readStorage(STORAGE_KEYS.ATTEMPTS, []);

    return Array.isArray(attempts) ? attempts : [];
}

export function getAttemptById(attemptId) {
    const normalizedId = normalizeText(attemptId);

    if (!normalizedId) {
        return null;
    }

    return getAllAttempts().find(
        (attempt) => attempt.id === normalizedId
    ) ?? null;
}

export function getAttemptsByStudent(studentId) {
    const normalizedStudentId = normalizeText(studentId);

    return getAllAttempts()
        .filter((attempt) => attempt.studentId === normalizedStudentId)
        .sort((firstAttempt, secondAttempt) => (
            new Date(secondAttempt.startedAt).getTime() -
            new Date(firstAttempt.startedAt).getTime()
        ));
}

export function getAttemptsByExam(examId) {
    const normalizedExamId = normalizeText(examId);

    return getAllAttempts()
        .filter((attempt) => attempt.examId === normalizedExamId)
        .sort((firstAttempt, secondAttempt) => (
            new Date(secondAttempt.startedAt).getTime() -
            new Date(firstAttempt.startedAt).getTime()
        ));
}

export function getStudentExamAttempt(studentId, examId) {
    return getAttemptsByStudent(studentId).find(
        (attempt) => attempt.examId === examId
    ) ?? null;
}

export function hasStudentSubmittedExam(studentId, examId) {
    return getAttemptsByStudent(studentId).some((attempt) => (
        attempt.examId === examId &&
        attempt.status === ATTEMPT_STATUS.SUBMITTED
    ));
}

function assertExamCanBeStarted(exam) {
    if (!exam || exam.isDeleted === true) {
        throw new Error("Exam was not found.");
    }

    if (exam.status !== EXAM_STATUS.ACTIVE) {
        throw new Error("This exam is not active.");
    }

    const currentTime = Date.now();
    const startTime = new Date(exam.startAt).getTime();
    const endTime = new Date(exam.endAt).getTime();

    if (Number.isFinite(startTime) && currentTime < startTime) {
        throw new Error("This exam has not started yet.");
    }

    if (Number.isFinite(endTime) && currentTime > endTime) {
        throw new Error("This exam has already ended.");
    }
}

function normalizeComparableAnswer(answer) {
    if (Array.isArray(answer)) {
        return answer
            .map((item) => normalizeText(item).toLowerCase())
            .sort()
            .join("|");
    }

    return normalizeText(answer)
        .replace(/\r\n/g, "\n")
        .toLowerCase();
}

function sanitizeAnswers(exam, answers = {}) {
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
        return {};
    }

    const questionIds = new Set(
        (exam.questions ?? []).map((question) => question.id)
    );

    return Object.fromEntries(
        Object.entries(answers)
            .filter(([questionId]) => questionIds.has(questionId))
            .map(([questionId, answer]) => [questionId, answer])
    );
}

export function calculateScore(exam, answers = {}) {
    if (!exam || !Array.isArray(exam.questions)) {
        throw new Error("A valid exam is required to calculate the score.");
    }

    let score = 0;
    let correctAnswers = 0;

    exam.questions.forEach((question) => {
        const studentAnswer = normalizeComparableAnswer(
            answers[question.id]
        );

        const correctAnswer = normalizeComparableAnswer(
            question.correctAnswer
        );

        if (studentAnswer && studentAnswer === correctAnswer) {
            score += Number(question.points || 0);
            correctAnswers += 1;
        }
    });

    const totalScore = getExamTotalPoints(exam);

    return {
        score,
        totalScore,
        correctAnswers,
        totalQuestions: exam.questions.length,
        percentage: calculatePercentage(score, totalScore)
    };
}

export function startAttempt(examId, studentId) {
    const normalizedExamId = normalizeText(examId);
    const normalizedStudentId = normalizeText(studentId);

    if (!normalizedExamId || !normalizedStudentId) {
        throw new Error("Exam ID and student ID are required.");
    }

    const exam = getExamById(normalizedExamId, {
        includeDeleted: false
    });

    assertExamCanBeStarted(exam);

    const existingAttempt = getStudentExamAttempt(
        normalizedStudentId,
        normalizedExamId
    );

    if (existingAttempt?.status === ATTEMPT_STATUS.SUBMITTED) {
        throw new Error("This exam has already been submitted.");
    }

    if (existingAttempt?.status === ATTEMPT_STATUS.IN_PROGRESS) {
        return existingAttempt;
    }

    const attempts = getAllAttempts();
    const timestamp = new Date().toISOString();

    const attempt = {
        id: generateId("attempt"),
        examId: normalizedExamId,
        studentId: normalizedStudentId,
        answers: {},
        score: 0,
        totalScore: getExamTotalPoints(exam),
        correctAnswers: 0,
        totalQuestions: exam.questions?.length ?? 0,
        percentage: 0,
        status: ATTEMPT_STATUS.IN_PROGRESS,
        startedAt: timestamp,
        submittedAt: null,
        updatedAt: timestamp
    };

    attempts.push(attempt);
    writeStorage(STORAGE_KEYS.ATTEMPTS, attempts);

    return attempt;
}

export function saveAnswer(attemptId, questionId, answer) {
    const attempts = getAllAttempts();
    const attemptIndex = attempts.findIndex(
        (attempt) => attempt.id === attemptId
    );

    if (attemptIndex === -1) {
        throw new Error("Attempt was not found.");
    }

    const currentAttempt = attempts[attemptIndex];

    if (currentAttempt.status !== ATTEMPT_STATUS.IN_PROGRESS) {
        throw new Error("Submitted attempts cannot be changed.");
    }

    const exam = getExamById(currentAttempt.examId);

    if (!exam) {
        throw new Error("The exam linked to this attempt was not found.");
    }

    const normalizedQuestionId = normalizeText(questionId);
    const questionExists = (exam.questions ?? []).some(
        (question) => question.id === normalizedQuestionId
    );

    if (!questionExists) {
        throw new Error("Question was not found in this exam.");
    }

    const updatedAnswers = {
        ...(currentAttempt.answers ?? {})
    };

    const answerIsEmpty =
        answer === null ||
        answer === undefined ||
        normalizeText(answer) === "";

    if (answerIsEmpty) {
        delete updatedAnswers[normalizedQuestionId];
    } else {
        updatedAnswers[normalizedQuestionId] = answer;
    }

    const updatedAttempt = {
        ...currentAttempt,
        answers: updatedAnswers,
        updatedAt: new Date().toISOString()
    };

    attempts[attemptIndex] = updatedAttempt;
    writeStorage(STORAGE_KEYS.ATTEMPTS, attempts);

    return updatedAttempt;
}

export function submitAttempt(attemptId, finalAnswers = null) {
    const attempts = getAllAttempts();
    const attemptIndex = attempts.findIndex(
        (attempt) => attempt.id === attemptId
    );

    if (attemptIndex === -1) {
        throw new Error("Attempt was not found.");
    }

    const currentAttempt = attempts[attemptIndex];

    if (currentAttempt.status === ATTEMPT_STATUS.SUBMITTED) {
        return currentAttempt;
    }

    const exam = getExamById(currentAttempt.examId);

    if (!exam) {
        throw new Error("The exam linked to this attempt was not found.");
    }

    const mergedAnswers = sanitizeAnswers(exam, {
        ...(currentAttempt.answers ?? {}),
        ...(finalAnswers ?? {})
    });

    const result = calculateScore(exam, mergedAnswers);
    const timestamp = new Date().toISOString();

    const submittedAttempt = {
        ...currentAttempt,
        answers: mergedAnswers,
        ...result,
        status: ATTEMPT_STATUS.SUBMITTED,
        submittedAt: timestamp,
        updatedAt: timestamp
    };

    attempts[attemptIndex] = submittedAttempt;
    writeStorage(STORAGE_KEYS.ATTEMPTS, attempts);

    return submittedAttempt;
}

