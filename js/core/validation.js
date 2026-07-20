import { EXAM_STATUS, QUESTION_TYPES } from "./config.js";

import { normalizeText } from "./utils.js";

const ALLOWED_EXAM_STATUSES = new Set(Object.values(EXAM_STATUS));
const ALLOWED_QUESTION_TYPES = new Set(Object.values(QUESTION_TYPES));

const REQUIRED_MESSAGES = Object.freeze({
  username: "Username is required.",
  password: "Password is required.",
  firstName: "First name is required.",
  lastName: "Last name is required.",
  email: "Email is required.",
  message: "Message is required.",
  fullName: "Full name is required.",
  phone: "Phone number is required.",
  nationalId: "National ID is required.",
  title: "Exam title is required.",
  description: "Exam description is required.",
  instructions: "Exam instructions are required.",
  text: "Question text is required.",
});

const INVALID_USERNAME =
  "Username must contain 3 to 20 letters, numbers, or underscores.";
const INVALID_PASSWORD = "Password must contain at least 6 characters.";
const INVALID_EMAIL = "Enter a valid email address.";
const INVALID_PHONE = "Phone number must start with 07 and contain 10 digits.";
const INVALID_NATIONAL_ID = "National ID must contain exactly 10 digits.";

function createValidationResult(errors) {
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

function validateField(errors, field, value, validator, invalidMessage) {
  if (!isRequired(value)) {
    errors[field] = REQUIRED_MESSAGES[field];
  } else if (validator && !validator(value)) {
    errors[field] = invalidMessage;
  }
}

function validateMinimumLength(errors, field, value, label, minimum) {
  validateField(
    errors,
    field,
    value,
    (text) => text.length >= minimum,
    `${label} must contain at least ${minimum} characters.`,
  );
}

function normalizeQuestionOption(option, index) {
  const isText = typeof option === "string";
  const text = normalizeText(isText ? option : option?.text);

  if (!text) {
    return null;
  }

  return {
    id: isText
      ? String(index + 1)
      : normalizeText(option?.id) || String(index + 1),
    text,
  };
}

export function isRequired(value) {
  return normalizeText(value) !== "";
}

export function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(normalizeText(username));
}

export function isValidPassword(password) {
  return typeof password === "string" && password.trim().length >= 6;
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(email));
}

export function isValidPhone(phone) {
  return /^07\d{8}$/.test(normalizeText(phone).replace(/\s+/g, ""));
}

export function isValidNationalId(nationalId) {
  return /^\d{10}$/.test(normalizeText(nationalId));
}

export function isPositiveNumber(value) {
  const number = Number(value);

  return Number.isFinite(number) && number > 0;
}

export function isPositiveInteger(value) {
  const number = Number(value);

  return Number.isInteger(number) && number > 0;
}

export function isValidDate(value) {
  if (!isRequired(value)) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

export function isEndDateAfterStartDate(startDate, endDate) {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }

  return new Date(endDate).getTime() > new Date(startDate).getTime();
}

export function validateLoginForm(data = {}) {
  const errors = {};
  const username = normalizeText(data.username);
  const password = String(data.password ?? "");

  validateField(
    errors,
    "username",
    username,
    isValidUsername,
    INVALID_USERNAME,
  );
  validateField(errors, "password", password);

  return createValidationResult(errors);
}

export function validateContactForm(data = {}) {
  const errors = {};
  const firstName = normalizeText(data.firstName);
  const lastName = normalizeText(data.lastName);
  const email = normalizeText(data.email);
  const message = normalizeText(data.message);

  validateMinimumLength(errors, "firstName", firstName, "First name", 2);
  validateMinimumLength(errors, "lastName", lastName, "Last name", 2);
  validateField(errors, "email", email, isValidEmail, INVALID_EMAIL);
  validateMinimumLength(errors, "message", message, "Message", 10);

  return createValidationResult(errors);
}

export function validateStudentForm(data = {}) {
  const errors = {};
  const fullName = normalizeText(data.fullName);
  const username = normalizeText(data.username);
  const password = String(data.password ?? "");
  const phone = normalizeText(data.phone);
  const nationalId = normalizeText(data.nationalId);
  const gender = normalizeText(data.gender);

  validateMinimumLength(errors, "fullName", fullName, "Full name", 3);
  validateField(
    errors,
    "username",
    username,
    isValidUsername,
    INVALID_USERNAME,
  );
  validateField(
    errors,
    "password",
    password,
    isValidPassword,
    INVALID_PASSWORD,
  );
  validateField(errors, "phone", phone, isValidPhone, INVALID_PHONE);
  validateField(
    errors,
    "nationalId",
    nationalId,
    isValidNationalId,
    INVALID_NATIONAL_ID,
  );

  if (!["male", "female"].includes(gender.toLowerCase())) {
    errors.gender = "Select a valid gender.";
  }

  return createValidationResult(errors);
}

export function validateProfileForm(data = {}) {
  const errors = {};
  const fullName = normalizeText(data.fullName);
  const phone = normalizeText(data.phone);
  const password = String(data.password ?? "");

  validateMinimumLength(errors, "fullName", fullName, "Full name", 3);
  validateField(errors, "phone", phone, isValidPhone, INVALID_PHONE);

  if (password && !isValidPassword(password)) {
    errors.password = INVALID_PASSWORD;
  }

  return createValidationResult(errors);
}

export function validateExamForm(data = {}) {
  const errors = {};
  const title = normalizeText(data.title);
  const description = normalizeText(data.description);
  const instructions = normalizeText(data.instructions);
  const startAt = data.startAt;
  const endAt = data.endAt;
  const durationMinutes = data.durationMinutes;
  const status = normalizeText(data.status).toLowerCase();

  validateMinimumLength(errors, "title", title, "Exam title", 3);
  validateMinimumLength(
    errors,
    "description",
    description,
    "Exam description",
    10,
  );
  validateField(errors, "instructions", instructions);

  if (!isValidDate(startAt)) {
    errors.startAt = "Select a valid start date.";
  }

  if (!isValidDate(endAt)) {
    errors.endAt = "Select a valid end date.";
  }

  if (
    isValidDate(startAt) &&
    isValidDate(endAt) &&
    !isEndDateAfterStartDate(startAt, endAt)
  ) {
    errors.endAt = "End date must be later than start date.";
  }

  if (!isPositiveInteger(durationMinutes)) {
    errors.durationMinutes = "Exam duration must be a positive whole number.";
  }

  if (!ALLOWED_EXAM_STATUSES.has(status)) {
    errors.status = "Select a valid exam status.";
  }

  return createValidationResult(errors);
}

export function validateQuestionForm(data = {}) {
  const errors = {};
  const text = normalizeText(data.text);
  const type = normalizeText(data.type).toLowerCase();
  const points = data.points;
  const options = Array.isArray(data.options) ? data.options : [];
  const correctAnswer = normalizeText(data.correctAnswer);

  validateField(errors, "text", text);

  if (!ALLOWED_QUESTION_TYPES.has(type)) {
    errors.type = "Select a valid question type.";
  }

  if (!isPositiveNumber(points)) {
    errors.points = "Question points must be greater than zero.";
  }

  if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    const validOptions = options.map(normalizeQuestionOption).filter(Boolean);

    if (validOptions.length < 2) {
      errors.options = "A multiple-choice question needs at least two options.";
    }

    if (!isRequired(correctAnswer)) {
      errors.correctAnswer = "Select the correct answer.";
    } else if (!validOptions.some((option) => option.id === correctAnswer)) {
      errors.correctAnswer = "The correct answer must match one option.";
    }
  }

  if (
    type === QUESTION_TYPES.TRUE_FALSE &&
    !["true", "false"].includes(correctAnswer.toLowerCase())
  ) {
    errors.correctAnswer = "The correct answer must be true or false.";
  }

  if (
    [QUESTION_TYPES.SHORT_ANSWER, QUESTION_TYPES.CODE_OUTPUT].includes(type) &&
    !isRequired(correctAnswer)
  ) {
    errors.correctAnswer = "The correct answer is required.";
  }

  return createValidationResult(errors);
}

export function getFirstError(errors = {}) {
  return Object.values(errors)[0] ?? "";
}
