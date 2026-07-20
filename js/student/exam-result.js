import {
  APP_CONFIG,
  ATTEMPT_STATUS,
  QUESTION_TYPES,
  ROUTES,
  USER_ROLES,
} from "../core/config.js";

import { requireRole } from "../core/auth.js";

import {
  clearElement,
  createElement,
  getElement,
  getElements,
  setText,
} from "../core/dom.js";

import { showError, showErrorToast } from "../core/alerts.js";

import { getQueryParam, normalizeText, safeNumber } from "../core/utils.js";

import {
  getExamById,
  getQuestionTypeLabel,
} from "../services/exams-service.js";

import {
  calculateScore,
  getAttemptById,
  getAttemptPercentage,
} from "../services/attempts-service.js";

const LOCALE = APP_CONFIG.defaultLocale;
const PASSING_PERCENTAGE = 50;

function make(tag, options = {}, ...children) {
  const element = createElement(tag, options);

  element.append(...children);

  return element;
}

function icon(name) {
  return make("i", {
    className: `bi ${name}`,

    attributes: {
      "aria-hidden": "true",
    },
  });
}

function getPageElements() {
  const statCards = getElements(".exam-result-stat-card");

  if (statCards.length !== 4) {
    throw new Error("The exam result summary cards are incomplete.");
  }

  return {
    title: getElement(".exam-result-title"),

    status: getElement(".exam-result-status"),

    description: getElement(".exam-result-description"),

    score: getElement(".exam-result-score-value strong"),

    totalScore: getElement(".exam-result-score-value span"),

    scoreSummary: getElement(".exam-result-score-card p"),

    correctCard: statCards[0],

    wrongCard: statCards[1],

    dateCard: statCards[2],

    timeCard: statCards[3],

    questionCount: getElement(".exam-result-question-count"),

    reviewCorrect: getElement(".exam-result-review-correct"),

    reviewWrong: getElement(".exam-result-review-wrong"),

    questionList: getElement(".exam-result-question-list"),

    reviewNote: getElement(".exam-result-review-note p"),

    viewExamsLink: getElement(".exam-result-view-exams-btn"),

    dashboardLink: getElement(".exam-result-secondary-btn"),

    historyLink: getElement(".exam-result-primary-btn"),

    backLink: getElement(".exam-result-back-link"),
  };
}

function dateParts(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      full: "Invalid date",

      date: "Invalid date",

      extra: "",
    };
  }

  return {
    full: new Intl.DateTimeFormat(LOCALE, {
      year: "numeric",

      month: "long",

      day: "numeric",

      hour: "2-digit",

      minute: "2-digit",
    }).format(date),

    date: new Intl.DateTimeFormat(LOCALE, {
      month: "long",

      day: "numeric",
    }).format(date),

    extra: new Intl.DateTimeFormat(LOCALE, {
      year: "numeric",

      hour: "2-digit",

      minute: "2-digit",
    }).format(date),
  };
}

function usedMinutes(attempt) {
  const started = new Date(attempt.startedAt).getTime();

  const submitted = new Date(attempt.submittedAt).getTime();

  if (
    !Number.isFinite(started) ||
    !Number.isFinite(submitted) ||
    submitted < started
  ) {
    return 0;
  }

  return Math.max(
    1,

    Math.round((submitted - started) / 60000),
  );
}

function setStatCard(card, value, detail) {
  setText(getElement("strong", card), value);

  setText(getElement("div > span", card), detail);
}

function isCorrect(question, answer) {
  return (
    calculateScore(
      {
        questions: [question],
      },

      {
        [question.id]: answer,
      },
    ).correctAnswers === 1
  );
}

function findOptionText(question, answerId) {
  const normalizedId = normalizeText(answerId);

  return (
    (question.options ?? []).find(
      (option) => normalizeText(option.id) === normalizedId,
    )?.text ?? normalizedId
  );
}

function optionMarker(label, correct) {
  return make(
    "small",
    {},
    icon(correct ? "bi-check-circle" : "bi-x-circle"),
    label,
  );
}

function createOptionsReview(question, studentAnswer) {
  const options = Array.isArray(question.options) ? question.options : [];

  const container = make("div", {
    className: `exam-result-options${
      options.length === 2 ? " exam-result-options--two" : ""
    }`,
  });

  options.forEach((option, index) => {
    const optionId = normalizeText(option.id);

    const selected = optionId === normalizeText(studentAnswer);

    const correct = optionId === normalizeText(question.correctAnswer);

    const classes = ["exam-result-option"];

    if (selected && correct) {
      classes.push("exam-result-option--correct");
    } else if (selected) {
      classes.push("exam-result-option--wrong");
    } else if (correct) {
      classes.push("exam-result-option--correct-answer");
    }

    const row = make(
      "div",
      {
        className: classes.join(" "),
      },

      make("span", {
        className: "exam-result-option-letter",

        text: String.fromCharCode(65 + index),
      }),

      make("span", {
        text: option.text || `Option ${index + 1}`,
      }),
    );

    if (selected) {
      row.append(optionMarker("Your answer", correct));
    } else if (correct) {
      row.append(optionMarker("Correct answer", true));
    }

    container.append(row);
  });

  return container;
}

function writtenAnswerBlock(label, value, correct) {
  return make(
    "div",
    {
      className: `exam-result-written-answer ${
        correct
          ? "exam-result-written-answer--correct"
          : "exam-result-written-answer--wrong"
      }`,
    },

    make("span", {
      text: label,
    }),

    make("p", {
      text: normalizeText(value) || "No answer submitted.",
    }),
  );
}

function createWrittenReview(question, studentAnswer, correct) {
  return make(
    "div",
    {
      className: "exam-result-written-answers",
    },

    writtenAnswerBlock("Your answer", studentAnswer, correct),

    writtenAnswerBlock("Correct answer", question.correctAnswer, true),
  );
}

function createQuestionReview(question, index, studentAnswer) {
  const correct = isCorrect(question, studentAnswer);

  const points = safeNumber(question.points);

  const earnedPoints = correct ? points : 0;

  const body = make(
    "div",
    {
      className: "exam-result-question-body",
    },

    make("h3", {
      text: question.text || "Untitled question",
    }),
  );

  if (normalizeText(question.code)) {
    body.append(
      make(
        "pre",
        {
          className: "take-exam-code",
        },

        make("code", {
          text: question.code,
        }),
      ),
    );
  }

  if (
    question.type === QUESTION_TYPES.MULTIPLE_CHOICE ||
    question.type === QUESTION_TYPES.TRUE_FALSE
  ) {
    body.append(createOptionsReview(question, studentAnswer));
  } else {
    body.append(createWrittenReview(question, studentAnswer, correct));
  }

  let feedbackText;

  if (correct) {
    feedbackText = "Your answer is correct.";
  } else if (normalizeText(studentAnswer)) {
    const correctAnswer =
      question.type === QUESTION_TYPES.MULTIPLE_CHOICE ||
      question.type === QUESTION_TYPES.TRUE_FALSE
        ? findOptionText(question, question.correctAnswer)
        : question.correctAnswer;

    feedbackText =
      `Your answer is incorrect. ` + `The correct answer is ${correctAnswer}.`;
  } else {
    feedbackText = "This question was not answered.";
  }

  return make(
    "article",
    {
      className: "exam-result-question",
    },

    make(
      "div",
      {
        className: "exam-result-question-header",
      },

      make(
        "div",
        {
          className: "exam-result-question-number",
        },

        make("span", {
          text: "Question",
        }),

        make("strong", {
          text: String(index + 1).padStart(2, "0"),
        }),
      ),

      make(
        "div",
        {
          className: "exam-result-question-meta",
        },

        make("span", {
          className: "exam-result-question-type",

          text: getQuestionTypeLabel(question.type),
        }),

        make("span", {
          className: `exam-result-question-points${
            correct ? "" : " exam-result-question-points--lost"
          }`,

          text: `${earnedPoints} / ${points} points`,
        }),
      ),
    ),

    body,

    make(
      "div",
      {
        className: `exam-result-feedback ${
          correct
            ? "exam-result-feedback--correct"
            : "exam-result-feedback--wrong"
        }`,
      },

      icon(correct ? "bi-check-circle" : "bi-x-circle"),

      make("p", {
        text: feedbackText,
      }),
    ),
  );
}

function setStatus(element, passed) {
  setText(element, passed ? "Passed" : "Failed");

  element.classList.toggle("exam-result-status--failed", !passed);
}

function renderResult(elements, exam, attempt) {
  const correct = safeNumber(attempt.correctAnswers);

  const totalQuestions = safeNumber(attempt.totalQuestions);

  const incorrect = Math.max(0, totalQuestions - correct);

  const score = safeNumber(attempt.score);

  const totalScore = safeNumber(attempt.totalScore);

  const completed = dateParts(attempt.submittedAt ?? attempt.updatedAt);

  const minutes = usedMinutes(attempt);

  const passed = getAttemptPercentage(attempt) >= PASSING_PERCENTAGE;

  document.title = `Looply | ${exam.title || "Exam Result"}`;

  setText(elements.title, exam.title || "Unavailable exam");

  setStatus(elements.status, passed);

  setText(
    elements.description,

    `Completed on ${completed.full}. ` +
      "Review your score, answers, and corrections below.",
  );

  setText(elements.score, score);

  setText(elements.totalScore, `/ ${totalScore}`);

  setText(
    elements.scoreSummary,

    `You answered ${correct} of ` + `${totalQuestions} questions correctly.`,
  );

  setStatCard(
    elements.correctCard,
    correct,
    `Out of ${totalQuestions} questions`,
  );

  setStatCard(elements.wrongCard, incorrect, "Review corrections below");

  setStatCard(elements.dateCard, completed.date, completed.extra);

  setStatCard(
    elements.timeCard,
    `${minutes} min`,
    `From ${safeNumber(exam.durationMinutes)} minutes`,
  );

  setText(
    elements.questionCount,

    `${totalQuestions} ${totalQuestions === 1 ? "question" : "questions"}`,
  );

  clearElement(elements.reviewCorrect);

  elements.reviewCorrect.append(
    icon("bi-check-circle"),

    `${correct} correct`,
  );

  clearElement(elements.reviewWrong);

  elements.reviewWrong.append(
    icon("bi-x-circle"),

    `${incorrect} incorrect`,
  );

  clearElement(elements.questionList);

  exam.questions.forEach((question, index) => {
    elements.questionList.append(
      createQuestionReview(question, index, attempt.answers?.[question.id]),
    );
  });

  setText(
    elements.reviewNote,

    exam.isDeleted
      ? "This archived exam is kept so your historical result remains available."
      : "All submitted questions and their correct answers are shown above.",
  );

  elements.viewExamsLink.href = ROUTES.STUDENT_EXAMS;

  elements.dashboardLink.href = ROUTES.STUDENT_DASHBOARD;

  elements.historyLink.href = ROUTES.STUDENT_HISTORY;

  elements.backLink.href = ROUTES.STUDENT_HISTORY;
}

function renderLoading(elements) {
  setText(elements.title, "Loading result...");

  setText(elements.status, "Loading");

  setText(elements.description, "Preparing your submitted answers.");

  clearElement(elements.questionList);

  elements.questionList.append(
    make(
      "article",
      {
        className: "exam-result-question",
      },

      make(
        "div",
        {
          className: "exam-result-question-body",
        },

        make("h3", {
          text: "Loading answer review...",
        }),
      ),
    ),
  );
}

async function initializeExamResult() {
  const student = requireRole(USER_ROLES.STUDENT);

  if (!student) {
    return;
  }

  let elements = null;

  try {
    elements = getPageElements();

    renderLoading(elements);

    const attemptId = normalizeText(getQueryParam("attemptId"));

    if (!attemptId) {
      throw new Error("Attempt ID is missing from the page URL.");
    }

    const attempt = getAttemptById(attemptId);

    if (!attempt || attempt.studentId !== student.id) {
      throw new Error("The requested result was not found.");
    }

    if (attempt.status !== ATTEMPT_STATUS.SUBMITTED) {
      throw new Error("This exam attempt has not been submitted yet.");
    }

    const exam = getExamById(attempt.examId, {
      includeDeleted: true,
    });

    if (!exam || !Array.isArray(exam.questions)) {
      throw new Error("The exam linked to this result was not found.");
    }

    renderResult(elements, exam, attempt);
  } catch (error) {
    console.error("Unable to load the exam result.", error);

    if (elements) {
      setText(elements.title, "Result unavailable");

      setText(elements.status, "Unavailable");

      setText(elements.description, "This result could not be loaded.");
    }

    try {
      await showError(
        "Result unavailable",

        error.message || "The exam result could not be loaded.",
      );
    } catch (alertError) {
      console.error("Unable to display the result error alert.", alertError);

      showErrorToast("Unable to load the exam result.");
    }

    window.location.replace(ROUTES.STUDENT_HISTORY);
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      void initializeExamResult();
    },
    {
      once: true,
    },
  );
} else {
  void initializeExamResult();
}
