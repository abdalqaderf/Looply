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

import { formatDate } from "../core/utils.js";

import {
  getActiveExams,
  getExamTotalPoints,
} from "../services/exams-service.js";

import { getAttemptsByStudent } from "../services/attempts-service.js";

const LOCALE = APP_CONFIG.defaultLocale;

function node(tag, options = {}, children = []) {
  const element = createElement(tag, options);

  element.append(...children);

  return element;
}

function icon(name) {
  return node("i", {
    className: `bi ${name}`,

    attributes: {
      "aria-hidden": "true",
    },
  });
}

function getElements() {
  return {
    count: getElement("#student-exams-count"),

    list: getElement("#student-exams-list"),
  };
}

function routeToExam(examId) {
  const url = new URL(ROUTES.STUDENT_TAKE_EXAM);

  url.searchParams.set("examId", examId);

  return url.href;
}

function formatTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid time";
  }

  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function detail(iconName, label, value, extra = "") {
  const copy = node("div", {}, [
    node("small", {
      text: label,
    }),

    node("strong", {
      text: value,
    }),
  ]);

  if (extra) {
    copy.append(
      node("span", {
        text: extra,
      }),
    );
  }

  return node(
    "div",
    {
      className: "student-exam-detail",
    },
    [
      node(
        "span",
        {
          className: "student-exam-detail-icon",
        },
        [icon(iconName)],
      ),

      copy,
    ],
  );
}

function availableExams(attempts) {
  const submittedExamIds = new Set(
    attempts
      .filter((attempt) => attempt.status === ATTEMPT_STATUS.SUBMITTED)
      .map((attempt) => attempt.examId),
  );

  const now = Date.now();

  return getActiveExams()
    .filter((exam) => {
      const start = new Date(exam.startAt).getTime();

      const end = new Date(exam.endAt).getTime();

      return (
        Number.isFinite(start) &&
        Number.isFinite(end) &&
        start <= now &&
        end >= now &&
        Array.isArray(exam.questions) &&
        exam.questions.length > 0 &&
        !submittedExamIds.has(exam.id)
      );
    })
    .sort(
      (firstExam, secondExam) =>
        new Date(firstExam.endAt).getTime() -
        new Date(secondExam.endAt).getTime(),
    );
}

function attemptMap(attempts) {
  const map = new Map();

  attempts.forEach((attempt) => {
    if (!map.has(attempt.examId)) {
      map.set(attempt.examId, attempt);
    }
  });

  return map;
}

function examCard(exam, attempt) {
  const inProgress = attempt?.status === ATTEMPT_STATUS.IN_PROGRESS;

  const questionCount = exam.questions.length;

  const title = node(
    "div",
    {
      className: "student-exam-card-title",
    },
    [
      node(
        "div",
        {
          className: "student-exam-title-row",
        },
        [
          node("h3", {
            text: exam.title || "Untitled exam",
          }),

          node("span", {
            className: "student-exam-available",

            text: inProgress ? "In Progress" : "Available",
          }),
        ],
      ),

      node("p", {
        text: exam.description || "No description is available for this exam.",
      }),
    ],
  );

  const details = node(
    "div",
    {
      className: "student-exam-details",

      attributes: {
        "aria-label": `${exam.title || "Exam"} information`,
      },
    },
    [
      detail(
        "bi-list-ol",
        "Questions",
        `${questionCount} ${questionCount === 1 ? "question" : "questions"}`,
      ),

      detail(
        "bi-clock",
        "Duration",
        `${Number(exam.durationMinutes) || 0} minutes`,
      ),

      detail(
        "bi-calendar-event",
        "Available Until",
        formatDate(exam.endAt, LOCALE),
        formatTime(exam.endAt),
      ),

      detail("bi-award", "Total Score", `${getExamTotalPoints(exam)} points`),
    ],
  );

  const main = node(
    "div",
    {
      className: "student-exam-card-main",
    },
    [
      node(
        "div",
        {
          className: "student-exam-card-heading",
        },
        [
          node(
            "span",
            {
              className: "student-exam-card-icon",
            },
            [icon("bi-journal-code")],
          ),

          title,
        ],
      ),

      details,
    ],
  );

  const action = node(
    "a",
    {
      className: "student-exam-start-btn",

      attributes: {
        href: routeToExam(exam.id),

        "aria-label": `${inProgress ? "Continue" : "Start"} ${
          exam.title || "exam"
        }`,
      },
    },
    [
      node("span", {
        text: inProgress ? "Continue Exam" : "Start Exam",
      }),

      icon("bi-arrow-right"),
    ],
  );

  const actions = node(
    "div",
    {
      className: "student-exam-card-actions",
    },
    [
      node(
        "div",
        {
          className: "student-exam-card-note",
        },
        [
          icon("bi-info-circle"),

          node("p", {
            text: inProgress
              ? "Your saved attempt is still in progress."
              : "The timer begins when you start the exam.",
          }),
        ],
      ),

      action,
    ],
  );

  return node(
    "article",
    {
      className: "student-exam-card",
    },
    [main, actions],
  );
}

function stateCard(iconName, title, message) {
  return node(
    "article",
    {
      className: "student-exam-card",
    },
    [
      node(
        "div",
        {
          className: "student-exam-card-main",
        },
        [
          node(
            "div",
            {
              className: "student-exam-card-heading",
            },
            [
              node(
                "span",
                {
                  className: "student-exam-card-icon",
                },
                [icon(iconName)],
              ),

              node(
                "div",
                {
                  className: "student-exam-card-title",
                },
                [
                  node(
                    "div",
                    {
                      className: "student-exam-title-row",
                    },
                    [
                      node("h3", {
                        text: title,
                      }),
                    ],
                  ),

                  node("p", {
                    text: message,
                  }),
                ],
              ),
            ],
          ),
        ],
      ),

      node(
        "div",
        {
          className: "student-exam-card-actions",
        },
        [
          node(
            "div",
            {
              className: "student-exam-card-note",
            },
            [
              icon("bi-info-circle"),

              node("p", {
                text: "Use Exam History to review submitted attempts.",
              }),
            ],
          ),
        ],
      ),
    ],
  );
}

function setCount(element, count) {
  setText(element, `${count} ${count === 1 ? "exam" : "exams"}`);
}

function render(elements, exams, attemptsByExam) {
  setCount(elements.count, exams.length);

  clearElement(elements.list);

  if (exams.length === 0) {
    elements.list.append(
      stateCard(
        "bi-calendar-check",
        "No exams are available right now.",
        "New active exams will appear here when their start time arrives.",
      ),
    );

    return;
  }

  exams.forEach((exam) => {
    elements.list.append(examCard(exam, attemptsByExam.get(exam.id) ?? null));
  });
}

function initializeStudentExams() {
  const student = requireRole(USER_ROLES.STUDENT);

  if (!student) {
    return;
  }

  let elements;

  try {
    elements = getElements();

    setText(elements.count, "-- exams");

    clearElement(elements.list);

    elements.list.append(
      stateCard(
        "bi-hourglass-split",
        "Loading available exams...",
        "Your active exams are being prepared.",
      ),
    );

    const attempts = getAttemptsByStudent(student.id);

    render(elements, availableExams(attempts), attemptMap(attempts));
  } catch (error) {
    console.error("Unable to load available exams.", error);

    if (elements) {
      setText(elements.count, "-- exams");

      clearElement(elements.list);

      elements.list.append(
        stateCard(
          "bi-exclamation-triangle",
          "Unable to load exams.",
          "Refresh the page and try again.",
        ),
      );
    }

    showErrorToast("Unable to load available exams.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeStudentExams, {
    once: true,
  });
} else {
  initializeStudentExams();
}
