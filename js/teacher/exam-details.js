import {
  APP_CONFIG,
  ATTEMPT_STATUS,
  EXAM_STATUS,
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
  setDisabled,
  setText,
} from "../core/dom.js";

import {
  confirmDelete,
  showError,
  showErrorToast,
  showSuccessToast,
} from "../core/alerts.js";

import { getQueryParam, normalizeText } from "../core/utils.js";

import {
  changeExamStatus,
  deleteExam,
  getExamById,
  getExamTotalPoints,
} from "../services/exams-service.js";

import { getAttemptsByExam } from "../services/attempts-service.js";

import { getUserById } from "../services/users-service.js";

const LOCALE = APP_CONFIG.defaultLocale;

const QUESTION_TYPE_LABELS = {
  [QUESTION_TYPES.MULTIPLE_CHOICE]: "Multiple Choice",
  [QUESTION_TYPES.TRUE_FALSE]: "True or False",
  [QUESTION_TYPES.SHORT_ANSWER]: "Short Answer",
  [QUESTION_TYPES.CODE_OUTPUT]: "Code Output",
};

let currentExam = null;

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
  const informationCards = getElements(".exam-information-card");

  if (informationCards.length !== 5) {
    throw new Error("The exam information cards are incomplete.");
  }

  return {
    title: getElement(".exam-details-title-row .dashboard-page-title"),

    status: getElement("#exam-details-status"),

    description: getElement(
      ".exam-details-header-content > .dashboard-page-description",
    ),

    editLink: getElement(
      ".exam-details-header-actions a.exam-details-action-btn",
    ),

    editQuestionsLink: getElement(".exam-details-small-btn"),

    statusButton: getElement("#exam-status-toggle"),

    deleteButton: getElement("[data-delete-exam]"),

    informationCards,

    overviewDescription: getElement(".exam-details-text-block p"),

    instructions: getElement(".exam-details-instructions"),

    questionCount: getElement(".exam-details-count"),

    questionList: getElement(".exam-questions-list"),

    questionNote: getElement(".exam-questions-note p"),

    resultsCount: getElement("#exam-results-count"),

    resultsBody: getElement("#exam-results-body"),

    backLink: getElement(".exam-details-back-link"),
  };
}

function routeWithExamId(route, examId) {
  const url = new URL(route);

  url.searchParams.set("examId", examId);

  return url.href;
}

function questionTypeLabel(type) {
  return QUESTION_TYPE_LABELS[type] ?? "Question";
}

function isChoiceQuestion(type) {
  return (
    type === QUESTION_TYPES.MULTIPLE_CHOICE ||
    type === QUESTION_TYPES.TRUE_FALSE
  );
}

function effectiveStatus(exam) {
  if ([EXAM_STATUS.INACTIVE, EXAM_STATUS.END].includes(exam.status)) {
    return exam.status;
  }

  const endTime = new Date(exam.endAt).getTime();

  if (Number.isFinite(endTime) && endTime < Date.now()) {
    return EXAM_STATUS.END;
  }

  return EXAM_STATUS.ACTIVE;
}

function statusLabel(status) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatDate(value, options, fallback = "—") {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? fallback
    : new Intl.DateTimeFormat(LOCALE, options).format(date);
}

function dateParts(value) {
  return {
    date: formatDate(
      value,
      { year: "numeric", month: "long", day: "numeric" },
      "Invalid date",
    ),
    time: formatDate(value, { hour: "2-digit", minute: "2-digit" }, ""),
  };
}

function setInformationCard(card, value, detail) {
  setText(getElement("strong", card), value);

  setText(getElement("div > span", card), detail);
}

function answerText(question) {
  if (isChoiceQuestion(question.type)) {
    return (
      (question.options ?? []).find(
        (option) =>
          normalizeText(option.id) === normalizeText(question.correctAnswer),
      )?.text ?? question.correctAnswer
    );
  }

  return question.correctAnswer;
}

function createQuestionOptions(question) {
  const container = make("div", {
    className: "exam-question-options",
  });

  (question.options ?? []).forEach((option, index) => {
    const correct =
      normalizeText(option.id) === normalizeText(question.correctAnswer);

    container.append(
      make(
        "span",
        {
          className: `exam-question-option${
            correct ? " exam-question-option--correct" : ""
          }`,
        },

        make("b", {
          text: String.fromCharCode(65 + index),
        }),

        make("span", {
          text: option.text || `Option ${index + 1}`,
        }),
      ),
    );
  });

  return container;
}

function createQuestionCard(question, index) {
  const body = make(
    "div",
    {
      className: "exam-question-body",
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
          className: "exam-question-code",
        },

        make("code", {
          text: question.code,
        }),
      ),
    );
  }

  if (isChoiceQuestion(question.type)) {
    body.append(createQuestionOptions(question));
  }

  const answerPrefix =
    question.type === QUESTION_TYPES.SHORT_ANSWER ||
    question.type === QUESTION_TYPES.CODE_OUTPUT
      ? "Expected answer:"
      : "Correct answer:";

  return make(
    "article",
    {
      className: "exam-question-card",
    },

    make(
      "div",
      {
        className: "exam-question-header",
      },

      make(
        "div",
        {
          className: "exam-question-number",
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
          className: "exam-question-tags",
        },

        make("span", {
          className: "exam-question-type",

          text: questionTypeLabel(question.type),
        }),

        make("span", {
          className: "exam-question-points",

          text: `${Number(question.points) || 0} points`,
        }),
      ),
    ),

    body,

    make(
      "div",
      {
        className: "exam-question-answer",
      },

      icon("bi-check-circle"),

      make(
        "span",
        {},
        `${answerPrefix} `,

        make("strong", {
          text: answerText(question) || "Not provided",
        }),
      ),
    ),
  );
}

function createQuestionStateCard(message) {
  return make(
    "article",
    { className: "exam-question-card" },
    make(
      "div",
      { className: "exam-question-body" },
      make("h3", { text: message }),
    ),
  );
}

function renderInstructions(elements, instructions) {
  clearElement(elements.instructions);

  const lines = String(instructions ?? "")
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean);

  const items =
    lines.length > 0 ? lines : ["No student instructions were provided."];

  elements.instructions.append(
    ...items.map((line) => make("li", { text: line })),
  );
}

function configureStatus(elements, exam) {
  const status = effectiveStatus(exam);

  elements.status.classList.remove(
    "exam-details-status--active",
    "exam-details-status--inactive",
    "exam-details-status--end",
  );

  elements.status.classList.add(`exam-details-status--${status}`);

  setText(elements.status, statusLabel(status));

  const storedActive = exam.status === EXAM_STATUS.ACTIVE;

  const nextStatus = storedActive ? EXAM_STATUS.INACTIVE : EXAM_STATUS.ACTIVE;

  elements.statusButton.dataset.examId = exam.id;

  elements.statusButton.dataset.currentStatus = exam.status;

  elements.statusButton.dataset.nextStatus = nextStatus;

  clearElement(elements.statusButton);

  elements.statusButton.append(
    icon(
      nextStatus === EXAM_STATUS.ACTIVE ? "bi-play-circle" : "bi-pause-circle",
    ),

    make("span", {
      text:
        nextStatus === EXAM_STATUS.ACTIVE
          ? "Activate"
          : status === EXAM_STATUS.END
            ? "Move to Draft"
            : "Deactivate",
    }),
  );

  elements.deleteButton.dataset.examId = exam.id;
}

function renderQuestions(elements, exam) {
  const questions = Array.isArray(exam.questions) ? exam.questions : [];

  setText(
    elements.questionCount,

    `${questions.length} ${questions.length === 1 ? "question" : "questions"}`,
  );

  clearElement(elements.questionList);

  if (questions.length === 0) {
    elements.questionList.append(
      createQuestionStateCard("This exam does not contain any questions yet."),
    );

    return;
  }

  elements.questionList.append(
    ...questions.map((question, index) => createQuestionCard(question, index)),
  );
}

function formatResultDate(value) {
  return formatDate(value, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function createResultStateRow(message) {
  return make(
    "tr",
    {},
    make("td", {
      className: "exam-results-empty",
      text: message,
      attributes: {
        colspan: "6",
      },
    }),
  );
}

function renderStudentResults(elements, exam, attempts) {
  const submittedCount = attempts.filter(
    (attempt) => attempt.status === ATTEMPT_STATUS.SUBMITTED,
  ).length;

  const inProgressCount = attempts.filter(
    (attempt) => attempt.status === ATTEMPT_STATUS.IN_PROGRESS,
  ).length;

  const countParts = [`${submittedCount} submitted`];

  if (inProgressCount > 0) {
    countParts.push(`${inProgressCount} in progress`);
  }

  setText(elements.resultsCount, countParts.join(" • "));

  clearElement(elements.resultsBody);

  if (attempts.length === 0) {
    elements.resultsBody.append(
      createResultStateRow("No students have started this exam yet."),
    );

    return;
  }

  const maximumScore = getExamTotalPoints(exam);

  attempts.forEach((attempt) => {
    const student = getUserById(attempt.studentId, { includeDeleted: true });

    const submitted = attempt.status === ATTEMPT_STATUS.SUBMITTED;
    const score = Number(attempt.score);
    const totalPoints = Number(attempt.totalPoints);
    const percentage = Number(attempt.percentage);
    const display = submitted
      ? {
          score: `${Number.isFinite(score) ? score : 0} / ${
            Number.isFinite(totalPoints) ? totalPoints : maximumScore
          }`,
          percentage: `${
            Number.isFinite(percentage) ? Math.round(percentage) : 0
          }%`,
          status: "Submitted",
          modifier: "submitted",
          submittedAt: formatResultDate(attempt.submittedAt),
        }
      : {
          score: "—",
          percentage: "—",
          status: "In progress",
          modifier: "progress",
          submittedAt: "—",
        };

    const studentName =
      normalizeText(student?.fullName) || "Deleted or unknown student";

    const username = normalizeText(student?.username) || "—";

    const row = make(
      "tr",
      {},
      make(
        "td",
        {},
        make(
          "div",
          { className: "exam-result-student" },
          make(
            "span",
            { className: "exam-result-student-icon" },
            icon("bi-person"),
          ),
          make(
            "div",
            {},
            make("strong", { text: studentName }),
            student?.isDeleted === true
              ? make("small", { text: "Deleted student" })
              : make("small", { text: "Student" }),
          ),
        ),
      ),
      make("td", { text: username }),
      make("td", {
        className: submitted ? "exam-result-score" : "exam-results-muted",
        text: display.score,
      }),
      make("td", {
        className: submitted ? "exam-result-percentage" : "exam-results-muted",
        text: display.percentage,
      }),
      make(
        "td",
        {},
        make("span", {
          className: `exam-result-attempt-status exam-result-attempt-status--${display.modifier}`,
          text: display.status,
        }),
      ),
      make("td", {
        className: "exam-result-date",
        text: display.submittedAt,
      }),
    );

    elements.resultsBody.append(row);
  });
}

function renderExam(elements, exam) {
  const start = dateParts(exam.startAt);

  const end = dateParts(exam.endAt);

  const questions = Array.isArray(exam.questions) ? exam.questions : [];

  const attempts = getAttemptsByExam(exam.id);

  document.title = `Looply | ${exam.title || "Exam Details"}`;

  setText(elements.title, exam.title || "Untitled exam");

  const description =
    exam.description || "No description was provided for this exam.";

  setText(elements.description, description);
  setText(elements.overviewDescription, description);

  [
    [start.date, start.time],
    [end.date, end.time],
    [`${Number(exam.durationMinutes) || 0} minutes`, "Exam time limit"],
    [
      `${questions.length} ${questions.length === 1 ? "question" : "questions"}`,
      "All questions required",
    ],
    [`${getExamTotalPoints(exam)} points`, "Maximum score"],
  ].forEach((values, index) => {
    setInformationCard(elements.informationCards[index], ...values);
  });

  renderInstructions(elements, exam.instructions);

  renderQuestions(elements, exam);

  renderStudentResults(elements, exam, attempts);

  configureStatus(elements, exam);

  const editUrl = routeWithExamId(ROUTES.TEACHER_EXAM_FORM, exam.id);

  elements.editLink.href = editUrl;
  elements.editQuestionsLink.href = editUrl;

  elements.backLink.href = ROUTES.TEACHER_EXAMS;

  setText(
    elements.questionNote,

    attempts.length > 0
      ? `${attempts.length} ${
          attempts.length === 1 ? "attempt depends" : "attempts depend"
        } on this question set. Existing questions are locked in the edit form.`
      : "All questions are shown above. No attempts currently depend on this question set.",
  );
}

function assertCanActivate(exam) {
  if (!Array.isArray(exam.questions) || exam.questions.length === 0) {
    throw new Error(
      "Add at least one valid question before activating this exam.",
    );
  }

  const endTime = new Date(exam.endAt).getTime();

  if (!Number.isFinite(endTime) || endTime <= Date.now()) {
    throw new Error("Update the exam end date before activating it.");
  }
}

async function toggleStatus(elements) {
  const nextStatus = normalizeText(elements.statusButton.dataset.nextStatus);

  if (!currentExam || !nextStatus) {
    return;
  }

  if (nextStatus === EXAM_STATUS.ACTIVE) {
    try {
      assertCanActivate(currentExam);
    } catch (error) {
      await showError("Cannot activate exam", error.message);

      return;
    }
  }

  setDisabled(elements.statusButton, true);

  try {
    currentExam = changeExamStatus(currentExam.id, nextStatus);

    renderExam(elements, currentExam);

    showSuccessToast(
      nextStatus === EXAM_STATUS.ACTIVE
        ? "Exam activated successfully."
        : "Exam moved to draft.",
    );
  } catch (error) {
    console.error("Unable to change exam status.", error);

    await showError(
      "Unable to update exam",

      error.message || "The exam status could not be changed.",
    );
  } finally {
    setDisabled(elements.statusButton, false);
  }
}

async function removeExam(elements) {
  if (!currentExam) {
    return;
  }

  const confirmed = await confirmDelete(currentExam.title || "this exam");

  if (!confirmed) {
    return;
  }

  setDisabled(elements.deleteButton, true);

  try {
    deleteExam(currentExam.id);

    showSuccessToast("Exam removed successfully.");

    window.location.assign(ROUTES.TEACHER_EXAMS);
  } catch (error) {
    console.error("Unable to remove exam.", error);

    await showError(
      "Unable to remove exam",

      error.message || "The exam could not be removed.",
    );
  } finally {
    setDisabled(elements.deleteButton, false);
  }
}

function bindEvents(elements) {
  elements.statusButton.addEventListener("click", () => {
    void toggleStatus(elements);
  });

  elements.deleteButton.addEventListener("click", () => {
    void removeExam(elements);
  });
}

function renderLoading(elements) {
  setText(elements.title, "Loading exam...");

  setText(elements.description, "Preparing exam information.");

  setText(elements.status, "Loading");

  clearElement(elements.questionList);

  clearElement(elements.resultsBody);

  setText(elements.resultsCount, "-- attempts");

  elements.resultsBody.append(
    createResultStateRow("Loading student results..."),
  );

  elements.questionList.append(createQuestionStateCard("Loading questions..."));
}

async function initializeExamDetails() {
  const teacher = requireRole(USER_ROLES.TEACHER);

  if (!teacher) {
    return;
  }

  let elements = null;

  try {
    elements = getPageElements();

    renderLoading(elements);

    const examId = normalizeText(getQueryParam("examId"));

    if (!examId) {
      throw new Error("Exam ID is missing from the page URL.");
    }

    const exam = getExamById(examId, {
      includeDeleted: false,
    });

    if (!exam || exam.teacherId !== teacher.id) {
      throw new Error("The requested exam was not found.");
    }

    currentExam = exam;

    bindEvents(elements);

    renderExam(elements, currentExam);
  } catch (error) {
    console.error("Unable to load exam details.", error);

    try {
      await showError(
        "Exam unavailable",

        error.message || "The exam details could not be loaded.",
      );
    } catch (alertError) {
      console.error(
        "Unable to display the exam details error alert.",
        alertError,
      );

      showErrorToast("Unable to load exam details.");
    }

    window.location.replace(ROUTES.TEACHER_EXAMS);
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      void initializeExamDetails();
    },
    {
      once: true,
    },
  );
} else {
  void initializeExamDetails();
}
