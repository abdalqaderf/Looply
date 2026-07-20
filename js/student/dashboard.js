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
  hideElement,
  setText,
  showElement,
} from "../core/dom.js";

import { showErrorToast } from "../core/alerts.js";

import {
  calculatePercentage,
  formatDate,
  formatDateTime,
  normalizeText,
} from "../core/utils.js";

import { getActiveExams, getExamById } from "../services/exams-service.js";

import { getAttemptsByStudent } from "../services/attempts-service.js";

const DASHBOARD_EXAM_LIMIT = 3;
const PASSING_PERCENTAGE = 50;
const LOCALE = APP_CONFIG.defaultLocale;

function getDashboardElements() {
  return {
    welcome: getElement("#welcome-message"),

    availableCount: getElement("#stat-available-count"),

    completedCount: getElement("#stat-completed-count"),

    availableList: getElement("#available-exams-container"),

    latestResult: getElement("#latest-result-container"),

    latestEmpty: getElement("#latest-result-empty-container"),

    latestEmptyMessage: getElement("#latest-result-empty-message"),

    latestIcon: getElement("#latest-result-icon-container"),

    latestTitle: getElement("#latest-result-title"),

    latestDate: getElement("#latest-result-date"),

    latestScore: getElement("#latest-result-score"),

    latestMax: getElement("#latest-result-max"),

    latestFraction: getElement("#latest-result-fraction"),

    latestStatus: getElement("#latest-result-status"),

    latestLink: getElement("#latest-result-review-link"),
  };
}

function createRoute(route, parameter, value) {
  const url = new URL(route);

  url.searchParams.set(parameter, normalizeText(value));

  return url.href;
}

function createIcon(iconClass) {
  return createElement("i", {
    className: `bi ${iconClass}`,

    attributes: {
      "aria-hidden": "true",
    },
  });
}

function createMeta(iconClass, text) {
  const item = createElement("span");

  item.append(createIcon(iconClass), text);

  return item;
}

function createStateRow(iconClass, title, detail = "") {
  const row = createElement("article", {
    className: "student-available-exam",
  });

  const identity = createElement("div", {
    className: "student-exam-identity",
  });

  const icon = createElement("span", {
    className: "student-exam-icon",
  });

  const copy = createElement("div", {
    className: "student-exam-copy",
  });

  icon.append(createIcon(iconClass));

  copy.append(
    createElement("h3", {
      text: title,
    }),
  );

  if (detail) {
    const meta = createElement("div", {
      className: "student-exam-meta",
    });

    meta.append(createMeta("bi-info-circle", detail));

    copy.append(meta);
  }

  identity.append(icon, copy);

  row.append(identity);

  return row;
}

function createExamCard(exam, attempt) {
  const row = createElement("article", {
    className: "student-available-exam",
  });

  const identity = createElement("div", {
    className: "student-exam-identity",
  });

  const icon = createElement("span", {
    className: "student-exam-icon",
  });

  const copy = createElement("div", {
    className: "student-exam-copy",
  });

  const meta = createElement("div", {
    className: "student-exam-meta",
  });

  const questionCount = exam.questions.length;

  const questionWord = questionCount === 1 ? "question" : "questions";

  icon.append(createIcon("bi-braces"));

  copy.append(
    createElement("h3", {
      text: exam.title || "Untitled exam",
    }),
  );

  meta.append(
    createMeta("bi-list-ol", `${questionCount} ${questionWord}`),

    createMeta("bi-clock", `${Number(exam.durationMinutes) || 0} minutes`),

    createMeta("bi-calendar-event", `Ends ${formatDate(exam.endAt, LOCALE)}`),
  );

  copy.append(meta);

  identity.append(icon, copy);

  const isInProgress = attempt?.status === ATTEMPT_STATUS.IN_PROGRESS;

  const link = createElement("a", {
    className: "student-start-exam-btn",

    attributes: {
      href: createRoute(ROUTES.STUDENT_TAKE_EXAM, "examId", exam.id),

      "aria-label": `${isInProgress ? "Continue" : "Start"} ${
        exam.title || "exam"
      }`,
    },
  });

  link.append(
    createElement("span", {
      text: isInProgress ? "Continue Exam" : "Start Exam",
    }),

    createIcon("bi-arrow-right"),
  );

  row.append(identity, link);

  return row;
}

function getSubmittedAttempts(attempts) {
  return attempts
    .filter((attempt) => attempt.status === ATTEMPT_STATUS.SUBMITTED)
    .sort((first, second) => {
      const firstTime = new Date(
        first.submittedAt ?? first.updatedAt,
      ).getTime();

      const secondTime = new Date(
        second.submittedAt ?? second.updatedAt,
      ).getTime();

      const safeFirstTime = Number.isFinite(firstTime) ? firstTime : 0;

      const safeSecondTime = Number.isFinite(secondTime) ? secondTime : 0;

      return safeSecondTime - safeFirstTime;
    });
}

function getAvailableExams(attempts) {
  const submittedExamIds = new Set(
    getSubmittedAttempts(attempts).map((attempt) => attempt.examId),
  );

  const now = Date.now();

  return getActiveExams()
    .filter((exam) => {
      const startTime = new Date(exam.startAt).getTime();

      const endTime = new Date(exam.endAt).getTime();

      return (
        Number.isFinite(startTime) &&
        Number.isFinite(endTime) &&
        startTime <= now &&
        endTime >= now &&
        Array.isArray(exam.questions) &&
        exam.questions.length > 0 &&
        !submittedExamIds.has(exam.id)
      );
    })
    .sort(
      (first, second) =>
        new Date(first.endAt).getTime() - new Date(second.endAt).getTime(),
    );
}

function getAttemptsByExam(attempts) {
  const attemptsByExam = new Map();

  attempts.forEach((attempt) => {
    if (!attemptsByExam.has(attempt.examId)) {
      attemptsByExam.set(attempt.examId, attempt);
    }
  });

  return attemptsByExam;
}

function renderLoading(elements) {
  setText(elements.availableCount, "--");

  setText(elements.completedCount, "--");

  clearElement(elements.availableList);

  elements.availableList.append(
    createStateRow("bi-hourglass-split", "Loading available exams..."),
  );

  hideElement(elements.latestResult);

  showElement(elements.latestEmpty);

  setText(elements.latestEmptyMessage, "Loading your latest result...");
}

function renderAvailableExams(elements, exams, attemptsByExam) {
  clearElement(elements.availableList);

  if (exams.length === 0) {
    elements.availableList.append(
      createStateRow(
        "bi-calendar-check",
        "No exams are available right now.",
        "Check the Exams page later for newly activated exams.",
      ),
    );

    return;
  }

  exams.slice(0, DASHBOARD_EXAM_LIMIT).forEach((exam) => {
    elements.availableList.append(
      createExamCard(exam, attemptsByExam.get(exam.id) ?? null),
    );
  });
}

function safeNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getPercentage(attempt) {
  const stored = Number(attempt.percentage);

  const hasStoredValue =
    attempt.percentage !== null &&
    attempt.percentage !== undefined &&
    attempt.percentage !== "";

  if (hasStoredValue && Number.isFinite(stored)) {
    return stored;
  }

  return calculatePercentage(attempt.score, attempt.totalScore);
}

function renderLatestResult(elements, attempt) {
  if (!attempt) {
    hideElement(elements.latestResult);

    showElement(elements.latestEmpty);

    setText(elements.latestEmptyMessage, "No completed exam results found.");

    return;
  }

  const exam = getExamById(attempt.examId, {
    includeDeleted: true,
  });

  const title = normalizeText(exam?.title) || "Unavailable exam";

  const passed = getPercentage(attempt) >= PASSING_PERCENTAGE;

  setText(elements.latestTitle, title);

  setText(
    elements.latestDate,
    `Completed ${formatDateTime(
      attempt.submittedAt ?? attempt.updatedAt,
      LOCALE,
    )}`,
  );

  setText(elements.latestScore, safeNumber(attempt.score));

  setText(elements.latestMax, safeNumber(attempt.totalScore));

  setText(
    elements.latestFraction,
    `${safeNumber(attempt.correctAnswers)} / ${safeNumber(
      attempt.totalQuestions,
    )}`,
  );

  setText(elements.latestStatus, passed ? "Passed" : "Failed");

  elements.latestStatus.classList.toggle("student-result-passed", passed);

  elements.latestStatus.style.color = passed ? "" : "var(--danger)";

  clearElement(elements.latestIcon);

  elements.latestIcon.append(
    createIcon(passed ? "bi-journal-check" : "bi-journal-x"),
  );

  elements.latestIcon.style.color = passed ? "" : "var(--danger)";

  elements.latestLink.href = createRoute(
    ROUTES.STUDENT_EXAM_RESULT,
    "attemptId",
    attempt.id,
  );

  elements.latestLink.setAttribute("aria-label", `Review result for ${title}`);

  hideElement(elements.latestEmpty);

  showElement(elements.latestResult);
}

function renderError(elements) {
  setText(elements.availableCount, "--");

  setText(elements.completedCount, "--");

  clearElement(elements.availableList);

  elements.availableList.append(
    createStateRow(
      "bi-exclamation-triangle",
      "Unable to load available exams.",
      "Refresh the page and try again.",
    ),
  );

  hideElement(elements.latestResult);

  showElement(elements.latestEmpty);

  setText(elements.latestEmptyMessage, "Unable to load your latest result.");
}

function initializeStudentDashboard() {
  const user = requireRole(USER_ROLES.STUDENT, {
    redirect: true,
  });

  if (!user) {
    return;
  }

  let elements = null;

  try {
    elements = getDashboardElements();

    renderLoading(elements);

    const firstName = normalizeText(user.fullName).split(/\s+/)[0] || "Student";

    setText(elements.welcome, `Welcome back, ${firstName}.`);

    const attempts = getAttemptsByStudent(user.id);

    const submittedAttempts = getSubmittedAttempts(attempts);

    const availableExams = getAvailableExams(attempts);

    setText(elements.availableCount, availableExams.length);

    setText(elements.completedCount, submittedAttempts.length);

    renderAvailableExams(elements, availableExams, getAttemptsByExam(attempts));

    renderLatestResult(elements, submittedAttempts[0] ?? null);
  } catch (error) {
    console.error("Unable to load the student dashboard.", error);

    if (elements) {
      renderError(elements);
    }

    try {
      showErrorToast("Unable to load the dashboard data.");
    } catch (alertError) {
      console.error("Unable to display the dashboard error alert.", alertError);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeStudentDashboard, {
    once: true,
  });
} else {
  initializeStudentDashboard();
}
