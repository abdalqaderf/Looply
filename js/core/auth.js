import * as CONFIG from "./config.js";
import {
  readSession,
  removeSession,
  StorageCorruptionError,
  writeSession,
} from "./storage.js";

import { getUserById, getUserByUsername } from "../services/users-service.js";

import { normalizeText } from "./utils.js";

const SESSION_KEY =
  CONFIG.SESSION_KEYS?.CURRENT_USER ??
  CONFIG.STORAGE_KEYS?.SESSION ??
  "looply_current_user";

const STUDENT_ROLE = CONFIG.USER_ROLES?.STUDENT ?? "student";
const TEACHER_ROLE = CONFIG.USER_ROLES?.TEACHER ?? "teacher";

function createPublicUser(user) {
  if (!user || typeof user !== "object") {
    return null;
  }

  const { password: _password, ...publicUser } = user;

  return { ...publicUser };
}

function readCurrentSessionValue() {
  return readSession(SESSION_KEY, null);
}

function writeCurrentSessionValue(session) {
  return writeSession(SESSION_KEY, session);
}

function removeCurrentSessionValue() {
  return removeSession(SESSION_KEY);
}

function isSupportedRole(role) {
  return role === STUDENT_ROLE || role === TEACHER_ROLE;
}

function redirectOnce(url) {
  const root = document.documentElement;

  if (root.dataset.looplyAuthRedirect === "true") {
    return false;
  }

  root.dataset.looplyAuthRedirect = "true";
  window.location.replace(url);

  return true;
}

export function getRoleHomeRoute(role) {
  if (role === STUDENT_ROLE) {
    return CONFIG.ROUTES.STUDENT_DASHBOARD;
  }

  if (role === TEACHER_ROLE) {
    return CONFIG.ROUTES.TEACHER_DASHBOARD;
  }

  return CONFIG.ROUTES.LOGIN;
}

export function login(username, password) {
  const normalizedUsername = normalizeText(username).toLowerCase();
  const enteredPassword = String(password ?? "");

  if (!normalizedUsername || !enteredPassword) {
    throw new Error("Username and password are required.");
  }

  const user = getUserByUsername(normalizedUsername, { includeDeleted: true });

  const credentialsAreValid =
    user && String(user.password ?? "") === enteredPassword;

  if (!credentialsAreValid || user.isDeleted === true) {
    throw new Error("Invalid username or password.");
  }

  if (!isSupportedRole(user.role)) {
    throw new Error("This account has an unsupported role.");
  }

  const session = {
    userId: user.id,
    role: user.role,
    loginAt: new Date().toISOString(),
  };

  writeCurrentSessionValue(session);

  return createPublicUser(user);
}

export function logout(options = {}) {
  const { redirect = false, redirectTo = CONFIG.ROUTES.LOGIN } = options;

  const removed = removeCurrentSessionValue();

  if (redirect) {
    window.location.assign(redirectTo);
  }

  return removed;
}

export function getCurrentSession() {
  let session;

  try {
    session = readCurrentSessionValue();
  } catch (error) {
    if (error instanceof StorageCorruptionError) {
      removeCurrentSessionValue();
      return null;
    }

    throw error;
  }

  const userId = normalizeText(session?.userId);
  const loginAt = normalizeText(session?.loginAt);
  const loginTime = new Date(loginAt).getTime();

  const isValidSession =
    session &&
    typeof session === "object" &&
    !Array.isArray(session) &&
    userId !== "" &&
    isSupportedRole(session.role) &&
    loginAt !== "" &&
    Number.isFinite(loginTime);

  if (!isValidSession) {
    if (session !== null) {
      removeCurrentSessionValue();
    }

    return null;
  }

  return {
    userId,
    role: session.role,
    loginAt,
  };
}

export function getCurrentUser() {
  const session = getCurrentSession();

  if (!session) {
    return null;
  }

  let user;

  try {
    user = getUserById(session.userId, { includeDeleted: false });
  } catch (error) {
    if (error instanceof StorageCorruptionError) {
      removeCurrentSessionValue();
      return null;
    }

    throw error;
  }

  if (!user || user.role !== session.role || user.isDeleted === true) {
    removeCurrentSessionValue();
    return null;
  }

  return createPublicUser(user);
}

export function isAuthenticated() {
  return getCurrentUser() !== null;
}

export function requireAuth(options = {}) {
  const { redirect = true, redirectTo = CONFIG.ROUTES.LOGIN } = options;

  const user = getCurrentUser();

  if (!user && redirect) {
    redirectOnce(redirectTo);
  }

  return user;
}

export function requireRole(requiredRole, options = {}) {
  if (!isSupportedRole(requiredRole)) {
    throw new Error(`Unsupported role: ${requiredRole}`);
  }

  const { redirect = true, unauthenticatedRoute = CONFIG.ROUTES.LOGIN } =
    options;

  const user = getCurrentUser();

  if (!user) {
    if (redirect) {
      redirectOnce(unauthenticatedRoute);
    }

    return null;
  }

  if (user.role !== requiredRole) {
    if (redirect) {
      redirectOnce(getRoleHomeRoute(user.role));
    }

    return null;
  }

  return user;
}

export function redirectAuthenticatedUser() {
  const user = getCurrentUser();

  if (!user) {
    return false;
  }

  window.location.replace(getRoleHomeRoute(user.role));

  return true;
}
