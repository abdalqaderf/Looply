import { STORAGE_KEYS, USER_ROLES } from "../core/config.js";

import { readStorage, writeStorage } from "../core/storage.js";

import { generateId, normalizeText } from "../core/utils.js";

export function getAllUsers() {
  const users = readStorage(STORAGE_KEYS.USERS, []);

  return Array.isArray(users) ? users : [];
}

export function getUserById(userId, { includeDeleted = true } = {}) {
  const normalizedId = normalizeText(userId);

  if (!normalizedId) {
    return null;
  }

  return (
    getAllUsers().find((user) => {
      const matchesId = user.id === normalizedId;
      const canReturnDeleted = includeDeleted || user.isDeleted !== true;

      return matchesId && canReturnDeleted;
    }) ?? null
  );
}

export function getUserByUsername(username, { includeDeleted = true } = {}) {
  const normalizedUsername = normalizeText(username).toLowerCase();

  if (!normalizedUsername) {
    return null;
  }

  return (
    getAllUsers().find((user) => {
      const storedUsername = normalizeText(user.username).toLowerCase();
      const canReturnDeleted = includeDeleted || user.isDeleted !== true;

      return storedUsername === normalizedUsername && canReturnDeleted;
    }) ?? null
  );
}

export function getActiveStudents() {
  return getAllUsers()
    .filter(
      (user) => user.role === USER_ROLES.STUDENT && user.isDeleted !== true,
    )
    .sort((firstUser, secondUser) =>
      normalizeText(firstUser.fullName).localeCompare(
        normalizeText(secondUser.fullName),
      ),
    );
}

export function getDeletedStudents() {
  return getAllUsers()
    .filter(
      (user) => user.role === USER_ROLES.STUDENT && user.isDeleted === true,
    )
    .sort((firstUser, secondUser) =>
      normalizeText(firstUser.fullName).localeCompare(
        normalizeText(secondUser.fullName),
      ),
    );
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

function normalizeStudentInput(data = {}) {
  return {
    fullName: normalizeText(data.fullName),
    username: normalizeText(data.username).toLowerCase(),
    password: String(data.password ?? ""),
    gender: normalizeText(data.gender).toLowerCase(),
    nationalId: normalizeText(data.nationalId),
    phone: normalizeText(data.phone),
  };
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

export function createStudent(data = {}) {
  const users = getAllUsers();
  const studentData = normalizeStudentInput(data);

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

  const allowedChanges = {};

  if (changes.fullName !== undefined) {
    allowedChanges.fullName = normalizeText(changes.fullName);
  }

  if (changes.username !== undefined) {
    allowedChanges.username = nextUsername;
  }

  if (changes.gender !== undefined) {
    allowedChanges.gender = normalizeText(changes.gender).toLowerCase();
  }

  if (changes.nationalId !== undefined) {
    allowedChanges.nationalId = nextNationalId;
  }

  if (changes.phone !== undefined) {
    allowedChanges.phone = normalizeText(changes.phone);
  }

  if (normalizeText(changes.password)) {
    allowedChanges.password = String(changes.password);
  }

  const updatedUser = {
    ...currentUser,
    ...allowedChanges,
    updatedAt: new Date().toISOString(),
  };

  if (!updatedUser.fullName || !updatedUser.username) {
    throw new Error("Full name and username are required.");
  }

  users[userIndex] = updatedUser;
  writeStorage(STORAGE_KEYS.USERS, users);

  return updatedUser;
}

export function updateStudent(studentId, changes = {}) {
  const student = getUserById(studentId);

  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new Error("Student was not found.");
  }

  return updateUser(studentId, changes);
}

export function softDeleteStudent(studentId) {
  const users = getAllUsers();
  const studentIndex = users.findIndex(
    (user) => user.id === studentId && user.role === USER_ROLES.STUDENT,
  );

  if (studentIndex === -1) {
    throw new Error("Student was not found.");
  }

  if (users[studentIndex].isDeleted === true) {
    throw new Error("Student is already deleted.");
  }

  const timestamp = new Date().toISOString();

  const deletedStudent = {
    ...users[studentIndex],
    isDeleted: true,
    deletedAt: timestamp,
    updatedAt: timestamp,
  };

  users[studentIndex] = deletedStudent;
  writeStorage(STORAGE_KEYS.USERS, users);

  return deletedStudent;
}

export function restoreStudent(studentId) {
  const users = getAllUsers();
  const studentIndex = users.findIndex(
    (user) => user.id === studentId && user.role === USER_ROLES.STUDENT,
  );

  if (studentIndex === -1) {
    throw new Error("Student was not found.");
  }

  if (users[studentIndex].isDeleted !== true) {
    return users[studentIndex];
  }

  const restoredStudent = {
    ...users[studentIndex],
    isDeleted: false,
    deletedAt: null,
    updatedAt: new Date().toISOString(),
  };

  users[studentIndex] = restoredStudent;
  writeStorage(STORAGE_KEYS.USERS, users);

  return restoredStudent;
}
