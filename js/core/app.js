import { ROUTES, USER_ROLES } from "./config.js";

import { seedInitialData } from "./seed.js";

import {
  getCurrentUser,
  logout,
  redirectAuthenticatedUser,
  requireRole,
} from "./auth.js";

import { confirmLogout, showError, showSuccessToast } from "./alerts.js";

let seedWasChecked = false;
let logoutIsInProgress = false;

export function initializeSeedData() {
  if (seedWasChecked) {
    return null;
  }

  seedWasChecked = true;

  try {
    return seedInitialData();
  } catch (error) {
    console.error("Unable to initialize Looply data.", error);

    return null;
  }
}

async function requestLogoutConfirmation() {
  return confirmLogout();
}

async function completeLogout(redirectUrl) {
  logout();

  showSuccessToast("You have been logged out.");

  await new Promise((resolve) => {
    window.setTimeout(resolve, 550);
  });

  window.location.replace(redirectUrl);
}

async function handleLogoutRequest(event) {
  event.preventDefault();

  if (logoutIsInProgress) {
    return;
  }

  logoutIsInProgress = true;

  try {
    const confirmed = await requestLogoutConfirmation();

    if (!confirmed) {
      return;
    }

    const redirectUrl = event.detail?.redirectUrl ?? ROUTES.LOGIN;

    await completeLogout(redirectUrl);
  } catch (error) {
    console.error("Unable to log out.", error);

    await showError(
      "Logout failed",
      "The session could not be closed. Please try again.",
    );
  } finally {
    logoutIsInProgress = false;
  }
}

export function installLogoutHandler() {
  const root = document.documentElement;

  if (root.dataset.looplyLogoutHandler === "true") {
    return false;
  }

  document.addEventListener("looply:logout-requested", handleLogoutRequest);

  root.dataset.looplyLogoutHandler = "true";

  return true;
}

export function initPublicPage(options = {}) {
  const { redirectAuthenticated = false } = options;

  initializeSeedData();
  installLogoutHandler();

  if (redirectAuthenticated && redirectAuthenticatedUser()) {
    return null;
  }

  return getCurrentUser();
}

export function initStudentPage() {
  initializeSeedData();
  installLogoutHandler();

  return requireRole(USER_ROLES.STUDENT, {
    redirect: true,
  });
}

export function initTeacherPage() {
  initializeSeedData();
  installLogoutHandler();

  return requireRole(USER_ROLES.TEACHER, {
    redirect: true,
  });
}

/**
 * Detect the current protected page from its
 * shared component roots, then run the correct
 * role initialization.
 *
 * Public pages do not contain these roots, so
 * importing app.js on Login or Contact is safe.
 */
function initializeCurrentProtectedPage() {
  const studentTopbarRoot = document.querySelector("#student-topbar-root");

  const teacherTopbarRoot = document.querySelector("#teacher-topbar-root");

  if (studentTopbarRoot && teacherTopbarRoot) {
    console.error("The page contains both student and teacher topbar roots.");

    return null;
  }

  let user = null;

  if (studentTopbarRoot) {
    user = initStudentPage();
  } else if (teacherTopbarRoot) {
    user = initTeacherPage();
  }

  if (user) {
    document.body.classList.remove("auth-pending");

    document.documentElement.dataset.looplyAuthReady = "true";
  }

  return user;
}

function initializeApp() {
  initializeCurrentProtectedPage();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp, {
    once: true,
  });
} else {
  initializeApp();
}
