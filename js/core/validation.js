import { EXAM_STATUS, QUESTION_TYPES } from "./config.js";

import { normalizeText } from "./utils.js";

const ALLOWED_EXAM_STATUSES = new Set(Object.values(EXAM_STATUS));

const ALLOWED_QUESTION_TYPES = new Set(Object.values(QUESTION_TYPES));

function createValidationResult(errors) {
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export function isRequired(value) {
  return normalizeText(value) !== "";
}

export function isValidUsername(username) {
  const normalizedUsername = normalizeText(username);

  return /^[a-zA-Z0-9_]{3,20}$/.test(normalizedUsername);
}

export function isValidPassword(password) {
  return typeof password === "string" && password.trim().length >= 6;
}

export function isValidEmail(email) {
  const normalizedEmail = normalizeText(email);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
}

export function isValidPhone(phone) {
  const normalizedPhone = normalizeText(phone).replace(/\s+/g, "");

  return /^07\d{8}$/.test(normalizedPhone);
}

export function isValidNationalId(nationalId) {
  const normalizedNationalId = normalizeText(nationalId);

  return /^\d{10}$/.test(normalizedNationalId);
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

  const date = new Date(value);

  return !Number.isNaN(date.getTime());
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

  if (!isRequired(username)) {
    errors.username = "Username is required.";
  } else if (!isValidUsername(username)) {
    errors.username =
      "Username must contain 3 to 20 letters, numbers, or underscores.";
  }

  if (!isRequired(password)) {
    errors.password = "Password is required.";
  }

  return createValidationResult(errors);
}

export function validateContactForm(data = {}) {
  const errors = {};
  const firstName = normalizeText(data.firstName);
  const lastName = normalizeText(data.lastName);
  const email = normalizeText(data.email);
  const message = normalizeText(data.message);

  if (!isRequired(firstName)) {
    errors.firstName = "First name is required.";
  } else if (firstName.length < 2) {
    errors.firstName = "First name must contain at least 2 characters.";
  }

  if (!isRequired(lastName)) {
    errors.lastName = "Last name is required.";
  } else if (lastName.length < 2) {
    errors.lastName = "Last name must contain at least 2 characters.";
  }

  if (!isRequired(email)) {
    errors.email = "Email is required.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!isRequired(message)) {
    errors.message = "Message is required.";
  } else if (message.length < 10) {
    errors.message = "Message must contain at least 10 characters.";
  }

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

  if (!isRequired(fullName)) {
    errors.fullName = "Full name is required.";
  } else if (fullName.length < 3) {
    errors.fullName = "Full name must contain at least 3 characters.";
  }

  if (!isRequired(username)) {
    errors.username = "Username is required.";
  } else if (!isValidUsername(username)) {
    errors.username =
      "Username must contain 3 to 20 letters, numbers, or underscores.";
  }

  if (!isRequired(password)) {
    errors.password = "Password is required.";
  } else if (!isValidPassword(password)) {
    errors.password = "Password must contain at least 6 characters.";
  }

  if (!isRequired(phone)) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhone(phone)) {
    errors.phone = "Phone number must start with 07 and contain 10 digits.";
  }

  if (!isRequired(nationalId)) {
    errors.nationalId = "National ID is required.";
  } else if (!isValidNationalId(nationalId)) {
    errors.nationalId = "National ID must contain exactly 10 digits.";
  }

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

  if (!isRequired(fullName)) {
    errors.fullName = "Full name is required.";
  } else if (fullName.length < 3) {
    errors.fullName = "Full name must contain at least 3 characters.";
  }

  if (!isRequired(phone)) {
    errors.phone = "Phone number is required.";
  } else if (!isValidPhone(phone)) {
    errors.phone = "Phone number must start with 07 and contain 10 digits.";
  }

  if (password && !isValidPassword(password)) {
    errors.password = "Password must contain at least 6 characters.";
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

  if (!isRequired(title)) {
    errors.title = "Exam title is required.";
  } else if (title.length < 3) {
    errors.title = "Exam title must contain at least 3 characters.";
  }

  if (!isRequired(description)) {
    errors.description = "Exam description is required.";
  } else if (description.length < 10) {
    errors.description =
      "Exam description must contain at least 10 characters.";
  }

  if (!isRequired(instructions)) {
    errors.instructions = "Exam instructions are required.";
  }

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

  if (!isRequired(text)) {
    errors.text = "Question text is required.";
  }

  if (!ALLOWED_QUESTION_TYPES.has(type)) {
    errors.type = "Select a valid question type.";
  }

  if (!isPositiveNumber(points)) {
    errors.points = "Question points must be greater than zero.";
  }

  if (type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    const validOptions = options
      .map((option, index) => {
        if (typeof option === "string") {
          const optionText = normalizeText(option);

          return optionText
            ? {
                id: String(index + 1),
                text: optionText,
              }
            : null;
        }

        const optionText = normalizeText(option?.text);

        if (!optionText) {
          return null;
        }

        return {
          id: normalizeText(option?.id) || String(index + 1),
          text: optionText,
        };
      })
      .filter(Boolean);

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
