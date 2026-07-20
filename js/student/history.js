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

import { calculatePercentage, normalizeText } from "../core/utils.js";

import { getExamById } from "../services/exams-service.js";

import { getAttemptsByStudent } from "../services/attempts-service.js";

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

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function percentage(attempt) {
  const stored = Number(attempt.percentage);

  if (
    attempt.percentage !== null &&
    attempt.percentage !== undefined &&
    attempt.percentage !== "" &&
    Number.isFinite(stored)
  ) {
    return stored;
  }

  return calculatePercentage(attempt.score, attempt.totalScore);
}

function dateParts(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "Invalid date",

      time: "",
    };
  }

  return {
    date: new Intl.DateTimeFormat(
      LOCALE,

      {
        year: "numeric",

        month: "short",

        day: "numeric",
      },
    ).format(date),

    time: new Intl.DateTimeFormat(
      LOCALE,

      {
        hour: "2-digit",

        minute: "2-digit",
      },
    ).format(date),
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

  const passed = percentage(attempt) >= PASSING_PERCENTAGE;

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

    make(
      "div",
      {
        className: "student-history-exam",
      },

      make(
        "span",
        {
          className: "student-history-exam-icon",
        },

        icon("bi-journal-check"),
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
          text: exam?.isDeleted
            ? "Archived exam"
            : "Completed programming exam",
        }),
      ),
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

    make(
      "div",
      {
        className: "student-history-exam",

        attributes: {
          style: "grid-column: 1 / -1;",
        },
      },

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
    ),
  );
}

function setCount(element, count) {
  setText(
    element,

    `${count} ${count === 1 ? "exam" : "exams"}`,
  );
}

function submittedAttempts(studentId) {
  return getAttemptsByStudent(studentId)
    .filter((attempt) => attempt.status === ATTEMPT_STATUS.SUBMITTED)
    .sort((first, second) => {
      const firstTime = new Date(
        first.submittedAt ?? first.updatedAt,
      ).getTime();

      const secondTime = new Date(
        second.submittedAt ?? second.updatedAt,
      ).getTime();

      return (
        (Number.isFinite(secondTime) ? secondTime : 0) -
        (Number.isFinite(firstTime) ? firstTime : 0)
      );
    });
}

function render(elements, attempts) {
  setCount(elements.count, attempts.length);

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

function initializeStudentHistory() {
  const student = requireRole(USER_ROLES.STUDENT);

  if (!student) {
    return;
  }

  let elements;

  try {
    elements = getPageElements();

    setText(elements.count, "-- exams");

    clearElement(elements.container);

    elements.container.append(
      stateItem(
        "bi-hourglass-split",

        "Loading exam history...",

        "Your submitted results are being prepared.",
      ),
    );

    render(
      elements,

      submittedAttempts(student.id),
    );
  } catch (error) {
    console.error("Unable to load exam history.", error);

    if (elements) {
      setText(elements.count, "-- exams");

      clearElement(elements.container);

      elements.container.append(
        stateItem(
          "bi-exclamation-triangle",

          "Unable to load exam history.",

          "Refresh the page and try again.",
        ),
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
