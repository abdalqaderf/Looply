import { STORAGE_KEYS, USER_ROLES } from "../core/config.js";

import { readStorage, writeStorage } from "../core/storage.js";

import { generateId, normalizeText } from "../core/utils.js";

const STUDENT_FIELD_NORMALIZERS = Object.freeze({
  fullName: normalizeText,
  username: (value) => normalizeText(value).toLowerCase(),
  password: (value) => String(value ?? ""),
  gender: (value) => normalizeText(value).toLowerCase(),
  nationalId: normalizeText,
  phone: normalizeText,
});

export function getAllUsers() {
  const users = readStorage(STORAGE_KEYS.USERS, []);

  return Array.isArray(users) ? users : [];
}

function findUser(matches, includeDeleted) {
  return (
    getAllUsers().find(
      (user) => matches(user) && (includeDeleted || user.isDeleted !== true),
    ) ?? null
  );
}

export function getUserById(userId, { includeDeleted = true } = {}) {
  const normalizedId = normalizeText(userId);

  return normalizedId
    ? findUser((user) => user.id === normalizedId, includeDeleted)
    : null;
}

export function getUserByUsername(username, { includeDeleted = true } = {}) {
  const normalizedUsername = normalizeText(username).toLowerCase();

  return normalizedUsername
    ? findUser(
        (user) =>
          normalizeText(user.username).toLowerCase() === normalizedUsername,
        includeDeleted,
      )
    : null;
}

function getStudentsByDeletedState(isDeleted) {
  return getAllUsers()
    .filter(
      (user) =>
        user.role === USER_ROLES.STUDENT &&
        (isDeleted ? user.isDeleted === true : user.isDeleted !== true),
    )
    .sort((firstUser, secondUser) =>
      normalizeText(firstUser.fullName).localeCompare(
        normalizeText(secondUser.fullName),
      ),
    );
}

export function getActiveStudents() {
  return getStudentsByDeletedState(false);
}

export function getDeletedStudents() {
  return getStudentsByDeletedState(true);
}

function assertUniqueStudentFields(users, studentData, ignoredUserId = null) {
  const username = normalizeText(studentData.username).toLowerCase();
  const nationalId = normalizeText(studentData.nationalId);

  const usernameExists = users.some(
    (user) =>
      user.id !== ignoredUserId &&
      normalizeText(user.username).toLowerCase() === username,
  );

  if (usernameExists) {
    throw new Error("Username is already in use.");
  }

  const nationalIdExists = users.some(
    (user) =>
      user.id !== ignoredUserId &&
      nationalId !== "" &&
      normalizeText(user.nationalId) === nationalId,
  );

  if (nationalIdExists) {
    throw new Error("National ID is already in use.");
  }
}

function normalizeStudentFields(data, onlyDefined = false) {
  return Object.fromEntries(
    Object.entries(STUDENT_FIELD_NORMALIZERS)
      .filter(([field]) => !onlyDefined || data[field] !== undefined)
      .map(([field, normalize]) => [field, normalize(data[field])]),
  );
}

function validateStudentData(student, { passwordRequired = true } = {}) {
  if (!student.fullName) {
    throw new Error("Student full name is required.");
  }

  if (!student.username) {
    throw new Error("Student username is required.");
  }

  if (passwordRequired && !student.password) {
    throw new Error("Student password is required.");
  }

  if (!student.nationalId) {
    throw new Error("Student national ID is required.");
  }
}

function saveUser(users, userIndex, user) {
  users[userIndex] = user;
  writeStorage(STORAGE_KEYS.USERS, users);

  return user;
}

export function createStudent(data = {}) {
  const users = getAllUsers();
  const studentData = normalizeStudentFields(data);

  validateStudentData(studentData);
  assertUniqueStudentFields(users, studentData);

  const timestamp = new Date().toISOString();

  const student = {
    id: generateId("user"),
    role: USER_ROLES.STUDENT,
    ...studentData,
    isDeleted: false,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  users.push(student);
  writeStorage(STORAGE_KEYS.USERS, users);

  return student;
}

export function updateUser(userId, changes = {}) {
  const users = getAllUsers();
  const userIndex = users.findIndex((user) => user.id === userId);

  if (userIndex === -1) {
    throw new Error("User was not found.");
  }

  const currentUser = users[userIndex];
  const nextUsername =
    changes.username === undefined
      ? currentUser.username
      : normalizeText(changes.username).toLowerCase();

  const nextNationalId =
    changes.nationalId === undefined
      ? currentUser.nationalId
      : normalizeText(changes.nationalId);

  assertUniqueStudentFields(
    users,
    {
      username: nextUsername,
      nationalId: nextNationalId,
    },
    currentUser.id,
  );

  const allowedChanges = normalizeStudentFields(changes, true);

  if (changes.password !== undefined) {
    const password = allowedChanges.password;
    delete allowedChanges.password;

    if (normalizeText(changes.password)) {
      allowedChanges.password = password;
    }
  }

  const updatedUser = {
    ...currentUser,
    ...allowedChanges,
    updatedAt: new Date().toISOString(),
  };

  if (!updatedUser.fullName || !updatedUser.username) {
    throw new Error("Full name and username are required.");
  }

  return saveUser(users, userIndex, updatedUser);
}

export function updateStudent(studentId, changes = {}) {
  const student = getUserById(studentId);

  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new Error("Student was not found.");
  }

  return updateUser(studentId, changes);
}

function changeStudentDeletedState(studentId, isDeleted) {
  const users = getAllUsers();
  const studentIndex = users.findIndex(
    (user) => user.id === studentId && user.role === USER_ROLES.STUDENT,
  );

  if (studentIndex === -1) {
    throw new Error("Student was not found.");
  }

  const student = users[studentIndex];

  if (isDeleted && student.isDeleted === true) {
    throw new Error("Student is already deleted.");
  }

  if (!isDeleted && student.isDeleted !== true) {
    return student;
  }

  const timestamp = new Date().toISOString();
  const updatedStudent = {
    ...student,
    isDeleted,
    deletedAt: isDeleted ? timestamp : null,
    updatedAt: timestamp,
  };

  return saveUser(users, studentIndex, updatedStudent);
}

export function softDeleteStudent(studentId) {
  return changeStudentDeletedState(studentId, true);
}

export function restoreStudent(studentId) {
  return changeStudentDeletedState(studentId, false);
}
