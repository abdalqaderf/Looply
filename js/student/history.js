import {
  APP_CONFIG,
  ATTEMPT_STATUS,
  ROUTES,
  USER_ROLES,
} from "../core/config.js";

import { requireRole } from "../core/auth.js";

import {
  clearElement,
  createElement,
  getElement,
  setText,
} from "../core/dom.js";

import { showErrorToast } from "../core/alerts.js";

import { normalizeText, safeNumber } from "../core/utils.js";

import { getExamById } from "../services/exams-service.js";

import {
  getAttemptPercentage,
  getAttemptsByStudent,
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

function examSummary(iconName, title, message, attributes) {
  const options = {
    className: "student-history-exam",
  };

  if (attributes) {
    options.attributes = attributes;
  }

  return make(
    "div",
    options,

    make(
      "span",
      {
        className: "student-history-exam-icon",
      },

      icon(iconName),
    ),

    make(
      "div",
      {
        className: "student-history-exam-copy",
      },

      make("h3", {
        text: title,
      }),

      make("p", {
        text: message,
      }),
    ),
  );
}

function getPageElements() {
  return {
    count: getElement("#history-total-count"),

    container: getElement("#history-items-container"),
  };
}

function resultRoute(attemptId) {
  const url = new URL(ROUTES.STUDENT_EXAM_RESULT);

  url.searchParams.set("attemptId", attemptId);

  return url.href;
}

function dateParts(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "Invalid date",

      time: "",
    };
  }

  const format = (options) =>
    new Intl.DateTimeFormat(LOCALE, options).format(date);

  return {
    date: format({
      year: "numeric",

      month: "short",

      day: "numeric",
    }),

    time: format({
      hour: "2-digit",

      minute: "2-digit",
    }),
  };
}

function durationMinutes(attempt, exam) {
  const started = new Date(attempt.startedAt).getTime();

  const submitted = new Date(attempt.submittedAt).getTime();

  if (
    Number.isFinite(started) &&
    Number.isFinite(submitted) &&
    submitted >= started
  ) {
    return Math.max(
      1,

      Math.round((submitted - started) / 60000),
    );
  }

  return safeNumber(exam?.durationMinutes);
}

function detail(label, value, extra = "") {
  const children = [
    make("small", {
      text: label,
    }),

    make("strong", {
      text: value,
    }),
  ];

  if (extra) {
    children.push(
      make("span", {
        text: extra,
      }),
    );
  }

  return make(
    "div",
    {
      className: "student-history-detail",
    },

    ...children,
  );
}

function historyItem(attempt) {
  const exam = getExamById(
    attempt.examId,

    {
      includeDeleted: true,
    },
  );

  const title = normalizeText(exam?.title) || "Unavailable exam";

  const submitted = dateParts(attempt.submittedAt ?? attempt.updatedAt);

  const passed = getAttemptPercentage(attempt) >= PASSING_PERCENTAGE;

  const correct = safeNumber(attempt.correctAnswers);

  const totalQuestions = safeNumber(attempt.totalQuestions);

  const score = safeNumber(attempt.score);

  const totalScore = safeNumber(attempt.totalScore);

  const duration = durationMinutes(attempt, exam);

  return make(
    "article",
    {
      className: "student-history-item",
    },

    examSummary(
      "bi-journal-check",

      title,

      exam?.isDeleted ? "Archived exam" : "Completed programming exam",
    ),

    detail("Completed", submitted.date, submitted.time),

    detail(
      "Answers",

      `${correct} / ${totalQuestions} correct`,

      `${duration} ${duration === 1 ? "minute" : "minutes"}`,
    ),

    make(
      "div",
      {
        className: "student-history-score",
      },

      make("small", {
        text: "Score",
      }),

      make(
        "div",
        {},

        make("strong", {
          text: score,
        }),

        make("span", {
          text: `/ ${totalScore}`,
        }),
      ),
    ),

    make(
      "div",
      {
        className: "student-history-result",
      },

      make("span", {
        className: `student-history-status ${
          passed
            ? "student-history-status--passed"
            : "student-history-status--failed"
        }`,

        text: passed ? "Passed" : "Failed",
      }),
    ),

    make(
      "a",
      {
        className: "student-history-review-btn",

        attributes: {
          href: resultRoute(attempt.id),

          "aria-label": `Review result for ${title}`,
        },
      },

      make("span", {
        text: "Review",
      }),

      icon("bi-arrow-right"),
    ),
  );
}

function stateItem(iconName, title, message) {
  return make(
    "article",
    {
      className: "student-history-item",
    },

    examSummary(iconName, title, message, {
      style: "grid-column: 1 / -1;",
    }),
  );
}

function submissionTime(attempt) {
  const value = new Date(attempt.submittedAt ?? attempt.updatedAt).getTime();

  return Number.isFinite(value) ? value : 0;
}

function submittedAttempts(studentId) {
  return getAttemptsByStudent(studentId)
    .filter((attempt) => attempt.status === ATTEMPT_STATUS.SUBMITTED)
    .sort((first, second) => {
      const firstTime = submissionTime(first);

      const secondTime = submissionTime(second);

      return secondTime - firstTime;
    });
}

function render(elements, attempts) {
  setText(
    elements.count,

    `${attempts.length} ${attempts.length === 1 ? "exam" : "exams"}`,
  );

  clearElement(elements.container);

  if (attempts.length === 0) {
    elements.container.append(
      stateItem(
        "bi-clock-history",

        "No completed exams yet.",

        "Submitted exam results will appear here.",
      ),
    );

    return;
  }

  attempts.forEach((attempt) => {
    elements.container.append(historyItem(attempt));
  });
}

function renderState(elements, iconName, title, message) {
  setText(elements.count, "-- exams");

  clearElement(elements.container);

  elements.container.append(stateItem(iconName, title, message));
}

function initializeStudentHistory() {
  const student = requireRole(USER_ROLES.STUDENT);

  if (!student) {
    return;
  }

  let elements;

  try {
    elements = getPageElements();

    renderState(
      elements,

      "bi-hourglass-split",

      "Loading exam history...",

      "Your submitted results are being prepared.",
    );

    render(
      elements,

      submittedAttempts(student.id),
    );
  } catch (error) {
    console.error("Unable to load exam history.", error);

    if (elements) {
      renderState(
        elements,

        "bi-exclamation-triangle",

        "Unable to load exam history.",

        "Refresh the page and try again.",
      );
    }

    showErrorToast("Unable to load exam history.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeStudentHistory, {
    once: true,
  });
} else {
  initializeStudentHistory();
}
