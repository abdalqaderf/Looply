import {
  ATTEMPT_STATUS,
  EXAM_STATUS,
  STORAGE_KEYS,
  USER_ROLES,
} from "./config.js";

import { readStorage, writeStorage } from "./storage.js";

export const CURRENT_SEED_VERSION = "2.1.0";

function shiftDays(date, numberOfDays) {
  const shiftedDate = new Date(date);

  shiftedDate.setDate(shiftedDate.getDate() + numberOfDays);

  return shiftedDate;
}

function setTime(date, hours, minutes = 0) {
  const result = new Date(date);

  result.setHours(hours, minutes, 0, 0);

  return result;
}

function createSeedUsers(referenceDate) {
  const createdAt = shiftDays(referenceDate, -45).toISOString();

  const updatedAt = shiftDays(referenceDate, -2).toISOString();

  return [
    {
      id: "user-teacher-1",
      role: USER_ROLES.TEACHER,
      fullName: "Sereen",
      username: "sereen",
      password: "123456",
      gender: "female",
      nationalId: "1000000001",
      phone: "0790000001",
      isDeleted: false,
      deletedAt: null,
      createdAt,
      updatedAt,
    },
    {
      id: "user-student-1",
      role: USER_ROLES.STUDENT,
      fullName: "Abdalqader Froukh",
      username: "abdalqader",
      password: "123456",
      gender: "male",
      nationalId: "2000000001",
      phone: "0791000001",
      isDeleted: false,
      deletedAt: null,
      createdAt,
      updatedAt,
    },
    {
      id: "user-student-2",
      role: USER_ROLES.STUDENT,
      fullName: "Belal Hamdan",
      username: "belal",
      password: "123456",
      gender: "male",
      nationalId: "2000000002",
      phone: "0791000002",
      isDeleted: false,
      deletedAt: null,
      createdAt,
      updatedAt,
    },
  ];
}

function createSeedExams(referenceDate) {
  const createdAt = shiftDays(referenceDate, -30).toISOString();

  const updatedAt = shiftDays(referenceDate, -1).toISOString();

  const activeStart = setTime(shiftDays(referenceDate, -2), 8);

  const activeEnd = setTime(shiftDays(referenceDate, 5), 23, 59);

  const closedStart = setTime(shiftDays(referenceDate, -25), 8);

  const closedEnd = setTime(shiftDays(referenceDate, -20), 23, 59);

  const upcomingStart = setTime(shiftDays(referenceDate, 2), 8);

  const upcomingEnd = setTime(shiftDays(referenceDate, 8), 23, 59);

  return [
    {
      id: "exam-javascript-basics",
      teacherId: "user-teacher-1",
      title: "JavaScript Fundamentals",
      description:
        "A short exam covering variables, conditions, and basic JavaScript output.",
      instructions:
        "Answer every question, then submit the exam before the timer ends.",
      startAt: activeStart.toISOString(),
      endAt: activeEnd.toISOString(),
      durationMinutes: 30,
      status: EXAM_STATUS.ACTIVE,
      questions: [
        {
          id: "js-question-1",
          type: "multiple-choice",
          text: "Which keyword declares a constant in JavaScript?",
          code: "",
          points: 4,
          options: [
            {
              id: "a",
              text: "let",
            },
            {
              id: "b",
              text: "const",
            },
            {
              id: "c",
              text: "var",
            },
            {
              id: "d",
              text: "static",
            },
          ],
          correctAnswer: "b",
        },
        {
          id: "js-question-2",
          type: "true-false",
          text: "JavaScript arrays can contain values of different types.",
          code: "",
          points: 3,
          options: [
            {
              id: "true",
              text: "True",
            },
            {
              id: "false",
              text: "False",
            },
          ],
          correctAnswer: "true",
        },
        {
          id: "js-question-3",
          type: "code-output",
          text: "What is printed by the following code?",
          code: "console.log(1 + 2);",
          points: 3,
          options: [],
          correctAnswer: "3",
        },
      ],
      isDeleted: false,
      deletedAt: null,
      createdAt,
      updatedAt,
    },
    {
      id: "exam-html-css-basics",
      teacherId: "user-teacher-1",
      title: "HTML and CSS Basics",
      description:
        "A completed exam covering semantic HTML and common CSS concepts.",
      instructions: "Select the best answer for each question.",
      startAt: closedStart.toISOString(),
      endAt: closedEnd.toISOString(),
      durationMinutes: 25,
      status: EXAM_STATUS.END,
      questions: [
        {
          id: "html-question-1",
          type: "multiple-choice",
          text: "Which element represents the main content of a document?",
          code: "",
          points: 5,
          options: [
            {
              id: "a",
              text: "<section>",
            },
            {
              id: "b",
              text: "<main>",
            },
            {
              id: "c",
              text: "<div>",
            },
            {
              id: "d",
              text: "<article>",
            },
          ],
          correctAnswer: "b",
        },
        {
          id: "html-question-2",
          type: "true-false",
          text: "The CSS box model includes content, padding, border, and margin.",
          code: "",
          points: 5,
          options: [
            {
              id: "true",
              text: "True",
            },
            {
              id: "false",
              text: "False",
            },
          ],
          correctAnswer: "true",
        },
      ],
      isDeleted: false,
      deletedAt: null,
      createdAt,
      updatedAt,
    },
    {
      id: "exam-dom-introduction",
      teacherId: "user-teacher-1",
      title: "DOM Introduction",
      description:
        "An upcoming exam about selecting elements and handling browser events.",
      instructions: "Read each question carefully before choosing an answer.",
      startAt: upcomingStart.toISOString(),
      endAt: upcomingEnd.toISOString(),
      durationMinutes: 20,
      status: EXAM_STATUS.ACTIVE,
      questions: [
        {
          id: "dom-question-1",
          type: "multiple-choice",
          text: "Which method selects an element using a CSS selector?",
          code: "",
          points: 5,
          options: [
            {
              id: "a",
              text: "document.querySelector()",
            },
            {
              id: "b",
              text: "document.createElement()",
            },
            {
              id: "c",
              text: "document.write()",
            },
            {
              id: "d",
              text: "window.open()",
            },
          ],
          correctAnswer: "a",
        },
        {
          id: "dom-question-2",
          type: "true-false",
          text: "addEventListener can register a click handler on a button.",
          code: "",
          points: 5,
          options: [
            {
              id: "true",
              text: "True",
            },
            {
              id: "false",
              text: "False",
            },
          ],
          correctAnswer: "true",
        },
      ],
      isDeleted: false,
      deletedAt: null,
      createdAt,
      updatedAt,
    },
    {
      id: "exam-advanced-draft",
      teacherId: "user-teacher-1",
      title: "Advanced JavaScript Inactive",
      description: "A draft exam reserved for later editing by the teacher.",
      instructions: "Draft only.",
      startAt: setTime(shiftDays(referenceDate, 12), 8).toISOString(),
      endAt: setTime(shiftDays(referenceDate, 18), 23, 59).toISOString(),
      durationMinutes: 45,
      status: EXAM_STATUS.INACTIVE,
      questions: [],
      isDeleted: false,
      deletedAt: null,
      createdAt,
      updatedAt,
    },
  ];
}

function createSeedAttempts(referenceDate) {
  const firstStartedAt = setTime(shiftDays(referenceDate, -23), 10);

  const firstSubmittedAt = new Date(firstStartedAt.getTime() + 18 * 60 * 1000);

  const secondStartedAt = setTime(shiftDays(referenceDate, -22), 11);

  const secondSubmittedAt = new Date(
    secondStartedAt.getTime() + 20 * 60 * 1000,
  );

  return [
    {
      id: "attempt-html-abdalqader",
      examId: "exam-html-css-basics",
      studentId: "user-student-1",
      answers: {
        "html-question-1": "b",
        "html-question-2": "true",
      },
      score: 10,
      totalScore: 10,
      correctAnswers: 2,
      totalQuestions: 2,
      percentage: 100,
      status: ATTEMPT_STATUS.SUBMITTED,
      startedAt: firstStartedAt.toISOString(),
      submittedAt: firstSubmittedAt.toISOString(),
      updatedAt: firstSubmittedAt.toISOString(),
    },
    {
      id: "attempt-html-belal",
      examId: "exam-html-css-basics",
      studentId: "user-student-2",
      answers: {
        "html-question-1": "b",
        "html-question-2": "false",
      },
      score: 5,
      totalScore: 10,
      correctAnswers: 1,
      totalQuestions: 2,
      percentage: 50,
      status: ATTEMPT_STATUS.SUBMITTED,
      startedAt: secondStartedAt.toISOString(),
      submittedAt: secondSubmittedAt.toISOString(),
      updatedAt: secondSubmittedAt.toISOString(),
    },
  ];
}

function shouldSeedCollection(key, force) {
  if (force) {
    return true;
  }

  const storedValue = readStorage(key, null);

  return !Array.isArray(storedValue) || storedValue.length === 0;
}

export function isSeeded() {
  return readStorage(STORAGE_KEYS.SEED_VERSION, null) === CURRENT_SEED_VERSION;
}

export function seedInitialData({ force = false } = {}) {
  const usersWritten = shouldSeedCollection(STORAGE_KEYS.USERS, force);

  const examsWritten = shouldSeedCollection(STORAGE_KEYS.EXAMS, force);

  const attemptsWritten = shouldSeedCollection(STORAGE_KEYS.ATTEMPTS, force);

  if (
    !force &&
    isSeeded() &&
    !usersWritten &&
    !examsWritten &&
    !attemptsWritten
  ) {
    return {
      seeded: false,
      usersWritten: false,
      examsWritten: false,
      attemptsWritten: false,
    };
  }

  const referenceDate = new Date();

  if (usersWritten) {
    writeStorage(STORAGE_KEYS.USERS, createSeedUsers(referenceDate));
  }

  if (examsWritten) {
    writeStorage(STORAGE_KEYS.EXAMS, createSeedExams(referenceDate));
  }

  if (attemptsWritten) {
    writeStorage(STORAGE_KEYS.ATTEMPTS, createSeedAttempts(referenceDate));
  }

  writeStorage(STORAGE_KEYS.SEED_VERSION, CURRENT_SEED_VERSION);

  return {
    seeded: usersWritten || examsWritten || attemptsWritten,
    usersWritten,
    examsWritten,
    attemptsWritten,
  };
}
