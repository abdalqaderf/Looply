import {
  EXAM_STATUS,
  QUESTION_TYPES,
  ROUTES,
  USER_ROLES,
} from "../core/config.js";

import { requireRole } from "../core/auth.js";

import {
  clearElement,
  getElement,
  getElements,
  getOptionalElement,
  setDisabled,
  setText,
} from "../core/dom.js";

import {
  showError,
  showErrorToast,
  showInfoToast,
  showSuccess,
} from "../core/alerts.js";

import { generateId, getQueryParam, normalizeText } from "../core/utils.js";

import {
  getFirstError,
  validateExamForm,
  validateQuestionForm,
} from "../core/validation.js";

import {
  createExam,
  getExamById,
  updateExam,
} from "../services/exams-service.js";

import { getAttemptsByExam } from "../services/attempts-service.js";

let currentExam = null;
let questionsLocked = false;

function fromHTML(markup) {
  const template = document.createElement("template");

  template.innerHTML = markup.trim();

  return template.content.firstElementChild;
}

function getPageElements() {
  return {
    pageTitle: getElement(".exam-form-header .dashboard-page-title"),

    pageDescription: getElement(
      ".exam-form-header .dashboard-page-description",
    ),

    form: getElement("#exam-form"),

    examId: getElement('input[name="exam_id"]'),

    title: getElement("#exam-title"),

    description: getElement("#exam-description"),

    instructions: getElement("#exam-instructions"),

    startDate: getElement("#exam-start-date"),

    startTime: getElement("#exam-start-time"),

    endDate: getElement("#exam-end-date"),

    endTime: getElement("#exam-end-time"),

    duration: getElement("#exam-duration"),

    statusOptions: getElement(".exam-status-options"),

    questionCount: getElement("#exam-question-count"),

    addQuestion: getElement("#add-question-btn"),

    questionList: getElement("#exam-question-list"),

    questionNote: getOptionalElement(".exam-question-editor-note p"),

    saveButton: getElement("#save-exam-btn"),
  };
}

function ensureClosedStatus(elements) {
  if (document.getElementById("exam-status-closed")) {
    return;
  }

  elements.statusOptions.append(
    fromHTML(`
            <div class="exam-status-option">
                <input
                    type="radio"
                    id="exam-status-closed"
                    name="status"
                    value="closed"
                />

                <label for="exam-status-closed">
                    <span class="exam-status-option-icon">
                        <i
                            class="bi bi-x-circle"
                            aria-hidden="true"
                        ></i>
                    </span>

                    <span class="exam-status-option-text">
                        <strong>Closed</strong>

                        <small>
                            Students cannot start new attempts.
                        </small>
                    </span>
                </label>
            </div>
        `),
  );
}

function defaultQuestion() {
  return {
    id: generateId("question"),

    type: QUESTION_TYPES.MULTIPLE_CHOICE,

    text: "",
    code: "",
    points: 5,

    options: [
      {
        id: "a",
        text: "",
      },
      {
        id: "b",
        text: "",
      },
      {
        id: "c",
        text: "",
      },
      {
        id: "d",
        text: "",
      },
    ],

    correctAnswer: "",
  };
}

function normalizeChoiceOptions(options = []) {
  const result = Array.isArray(options)
    ? options.map((option, index) => ({
        id: normalizeText(option?.id) || String.fromCharCode(97 + index),

        text: normalizeText(option?.text),
      }))
    : [];

  const used = new Set(result.map((option) => option.id));

  while (result.length < 4) {
    const index = result.length;

    let id = String.fromCharCode(97 + index);

    if (used.has(id)) {
      id = generateId("option");
    }

    used.add(id);

    result.push({
      id,
      text: "",
    });
  }

  return result;
}

function answerHeader(title, message) {
  const header = fromHTML(`
            <div class="exam-answer-options-header">
                <div>
                    <legend></legend>
                    <p></p>
                </div>

                <span>
                    Correct answer required
                </span>
            </div>
        `);

  setText(getElement("legend", header), title);

  setText(getElement("p", header), message);

  return header;
}

function choiceRow(option, index, correctAnswer, locked, readOnly = false) {
  const row = fromHTML(`
            <div
                class="exam-answer-option-row"
                data-option-row
            >
                <input
                    type="radio"
                    data-correct-answer
                />

                <label
                    class="exam-answer-correct-control"
                >
                    <span></span>

                    <i
                        class="bi bi-check-lg"
                        aria-hidden="true"
                    ></i>
                </label>

                <input
                    type="text"
                    maxlength="300"
                    data-option-text
                />
            </div>
        `);

  const radio = getElement("[data-correct-answer]", row);

  const label = getElement("label", row);

  const textInput = getElement("[data-option-text]", row);

  const optionLetter = String.fromCharCode(65 + index);

  radio.value = option.id;

  radio.checked = option.id === correctAnswer;

  radio.disabled = locked;

  label.title = `Mark option ${optionLetter} as correct`;

  setText(getElement("span", label), optionLetter);

  textInput.dataset.optionId = option.id;

  textInput.value = option.text;

  textInput.placeholder = `Enter option ${optionLetter}`;

  textInput.required = index < 2;

  textInput.readOnly = readOnly;

  textInput.disabled = locked;

  return row;
}

function textAnswer(question, locked) {
  const field = fromHTML(`
            <div class="exam-form-field">
                <label>
                    Correct Answer

                    <span aria-hidden="true">
                        *
                    </span>
                </label>

                <textarea
                    rows="4"
                    maxlength="1000"
                    placeholder="Enter the expected correct answer."
                    data-text-answer
                    required
                ></textarea>

                <small></small>
            </div>
        `);

  const textarea = getElement("[data-text-answer]", field);

  textarea.value = question.correctAnswer || "";

  textarea.disabled = locked;

  setText(
    getElement("small", field),

    question.type === QUESTION_TYPES.CODE_OUTPUT
      ? "Enter the exact output students should provide."
      : "Enter the expected answer used for automatic grading.",
  );

  return field;
}

function renderAnswers(card, question, locked) {
  const container = getElement("[data-answer-options]", card);

  clearElement(container);

  if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
    container.append(
      answerHeader(
        "Answer Options",
        "Add at least two options and select the correct answer.",
      ),
    );

    normalizeChoiceOptions(question.options).forEach((option, index) => {
      container.append(
        choiceRow(option, index, question.correctAnswer, locked),
      );
    });

    return;
  }

  if (question.type === QUESTION_TYPES.TRUE_FALSE) {
    container.append(
      answerHeader(
        "Correct Answer",
        "Select whether the statement is true or false.",
      ),
    );

    [
      {
        id: "true",
        text: "True",
      },
      {
        id: "false",
        text: "False",
      },
    ].forEach((option, index) => {
      container.append(
        choiceRow(option, index, question.correctAnswer, locked, true),
      );
    });

    return;
  }

  container.append(
    answerHeader(
      "Correct Answer",

      question.type === QUESTION_TYPES.CODE_OUTPUT
        ? "Enter the exact output expected from the code."
        : "Enter the expected short answer.",
    ),

    textAnswer(question, locked),
  );
}

function questionCard(question, locked) {
  const card = fromHTML(`
            <article
                class="exam-question-editor"
                data-question-card
            >
                <div class="exam-question-editor-header">
                    <div class="exam-question-editor-number">
                        <span>
                            Question
                        </span>

                        <strong data-question-number>
                            01
                        </strong>
                    </div>

                    <button
                        type="button"
                        class="exam-question-remove-btn"
                        data-remove-question
                        title="Remove question"
                    >
                        <i
                            class="bi bi-trash"
                            aria-hidden="true"
                        ></i>

                        <span>
                            Remove
                        </span>
                    </button>
                </div>

                <div class="exam-question-editor-body">
                    <div class="exam-question-settings-grid">
                        <div class="exam-form-field">
                            <label>
                                Question Type

                                <span aria-hidden="true">
                                    *
                                </span>
                            </label>

                            <select
                                data-question-field="type"
                                required
                            >
                                <option value="multiple-choice">
                                    Multiple Choice
                                </option>

                                <option value="true-false">
                                    True or False
                                </option>

                                <option value="short-answer">
                                    Short Answer
                                </option>

                                <option value="code-output">
                                    Code Output
                                </option>
                            </select>
                        </div>

                        <div class="exam-form-field">
                            <label>
                                Points

                                <span aria-hidden="true">
                                    *
                                </span>
                            </label>

                            <input
                                type="number"
                                min="1"
                                max="100"
                                data-question-field="points"
                                required
                            />
                        </div>
                    </div>

                    <div class="exam-form-field">
                        <label>
                            Question Text

                            <span aria-hidden="true">
                                *
                            </span>
                        </label>

                        <textarea
                            rows="4"
                            maxlength="1000"
                            placeholder="Write the question here."
                            data-question-field="text"
                            required
                        ></textarea>
                    </div>

                    <div class="exam-form-field">
                        <label>
                            Code Snippet

                            <small>
                                Optional
                            </small>
                        </label>

                        <textarea
                            class="exam-code-input"
                            rows="7"
                            spellcheck="false"
                            placeholder="const message = 'Hello';&#10;console.log(message);"
                            data-question-field="code"
                        ></textarea>

                        <small>
                            Leave this empty when the question does not contain code.
                        </small>
                    </div>

                    <fieldset
                        class="exam-answer-options"
                        data-answer-options
                    ></fieldset>
                </div>
            </article>
        `);

  card.dataset.questionId = question.id || generateId("question");

  const type = getElement('[data-question-field="type"]', card);

  const points = getElement('[data-question-field="points"]', card);

  const text = getElement('[data-question-field="text"]', card);

  const code = getElement('[data-question-field="code"]', card);

  const remove = getElement("[data-remove-question]", card);

  type.value = question.type || QUESTION_TYPES.MULTIPLE_CHOICE;

  points.value = String(Number(question.points) || 5);

  text.value = question.text || "";

  code.value = question.code || "";

  [type, points, text, code, remove].forEach((element) => {
    element.disabled = locked;
  });

  renderAnswers(card, question, locked);

  return card;
}

function renumberQuestions(elements) {
  const cards = getElements("[data-question-card]", elements.questionList);

  cards.forEach((card, index) => {
    const number = index + 1;

    card.dataset.questionIndex = String(number);

    setText(
      getElement("[data-question-number]", card),

      String(number).padStart(2, "0"),
    );

    const remove = getElement("[data-remove-question]", card);

    remove.setAttribute("aria-label", `Remove question ${number}`);

    const fields = {
      type: getElement('[data-question-field="type"]', card),

      points: getElement('[data-question-field="points"]', card),

      text: getElement('[data-question-field="text"]', card),

      code: getElement('[data-question-field="code"]', card),
    };

    Object.entries(fields).forEach(([name, field]) => {
      field.id = `question-${number}-${name}`;

      field.name = `questions[${index}][${name}]`;

      field
        .closest(".exam-form-field")
        ?.querySelector("label")
        ?.setAttribute("for", field.id);
    });

    getElements("[data-option-row]", card).forEach((row, optionIndex) => {
      const radio = getElement("[data-correct-answer]", row);

      const label = getElement("label", row);

      const option = getElement("[data-option-text]", row);

      const suffix = optionIndex + 1;

      radio.id = `question-${number}-correct-${suffix}`;

      radio.name = `questions[${index}][correct_answer]`;

      label.setAttribute("for", radio.id);

      option.id = `question-${number}-option-${suffix}`;

      option.name = `questions[${index}][options][${option.dataset.optionId}]`;
    });

    const answer = getOptionalElement("[data-text-answer]", card);

    if (answer) {
      answer.id = `question-${number}-correct-answer`;

      answer.name = `questions[${index}][correct_answer]`;

      answer
        .closest(".exam-form-field")
        ?.querySelector("label")
        ?.setAttribute("for", answer.id);
    }
  });

  setText(
    elements.questionCount,

    `${cards.length} ${cards.length === 1 ? "question" : "questions"}`,
  );
}

function renderQuestions(elements, questions) {
  clearElement(elements.questionList);

  const source =
    Array.isArray(questions) && questions.length > 0
      ? questions
      : [defaultQuestion()];

  source.forEach((question) => {
    elements.questionList.append(questionCard(question, questionsLocked));
  });

  renumberQuestions(elements);
}

function combineDateTime(dateValue, timeValue) {
  if (!dateValue || !timeValue) {
    return "";
  }

  const date = new Date(`${dateValue}T${timeValue}`);

  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function localDateParts(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "",
      time: "",
    };
  }

  const pad = (number) => String(number).padStart(2, "0");

  return {
    date:
      `${date.getFullYear()}-` +
      `${pad(date.getMonth() + 1)}-` +
      `${pad(date.getDate())}`,

    time: `${pad(date.getHours())}:` + `${pad(date.getMinutes())}`,
  };
}

function setStatus(status) {
  getElements('input[name="status"]').forEach((input) => {
    input.checked = input.value === (status || EXAM_STATUS.DRAFT);
  });
}

function populateExam(elements, exam) {
  const start = localDateParts(exam.startAt);

  const end = localDateParts(exam.endAt);

  elements.examId.value = exam.id;

  elements.title.value = exam.title || "";

  elements.description.value = exam.description || "";

  elements.instructions.value = exam.instructions || "";

  elements.startDate.value = start.date;

  elements.startTime.value = start.time;

  elements.endDate.value = end.date;

  elements.endTime.value = end.time;

  elements.duration.value = String(exam.durationMinutes || "");

  setStatus(exam.status);
}

function collectQuestion(card) {
  const answer = getOptionalElement("[data-correct-answer]:checked", card);

  const textAnswerInput = getOptionalElement("[data-text-answer]", card);

  return {
    id: card.dataset.questionId,

    type: getElement('[data-question-field="type"]', card).value,

    points: getElement('[data-question-field="points"]', card).value,

    text: getElement('[data-question-field="text"]', card).value,

    code: getElement('[data-question-field="code"]', card).value,

    options: getElements("[data-option-text]", card).map((input) => ({
      id: input.dataset.optionId,

      text: input.value,
    })),

    correctAnswer: answer?.value ?? textAnswerInput?.value ?? "",
  };
}

function collectExamData(elements, teacherId) {
  const selectedStatus = getOptionalElement('input[name="status"]:checked');

  const questions =
    questionsLocked && currentExam
      ? currentExam.questions
      : getElements("[data-question-card]", elements.questionList).map(
          collectQuestion,
        );

  return {
    teacherId,

    title: elements.title.value,

    description: elements.description.value,

    instructions: elements.instructions.value,

    startAt: combineDateTime(
      elements.startDate.value,

      elements.startTime.value,
    ),

    endAt: combineDateTime(
      elements.endDate.value,

      elements.endTime.value,
    ),

    durationMinutes: elements.duration.value,

    status: selectedStatus?.value ?? "",

    questions,
  };
}

function clearValidation(elements) {
  getElements(".is-invalid", elements.form).forEach((element) => {
    element.classList.remove("is-invalid");

    element.removeAttribute("aria-invalid");
  });
}

function markInvalid(element) {
  if (!element) {
    return;
  }

  element.classList.add("is-invalid");

  element.setAttribute("aria-invalid", "true");
}

function focusInvalid(element) {
  if (!element) {
    return;
  }

  if (element.matches("input, textarea, select, button")) {
    element.focus();

    return;
  }

  element.querySelector("input, textarea, select")?.focus();
}

async function validateData(elements, examData) {
  const examValidation = validateExamForm(examData);

  if (!examValidation.isValid) {
    const fields = {
      title: elements.title,

      description: elements.description,

      instructions: elements.instructions,

      startAt: elements.startDate,

      endAt: elements.endDate,

      durationMinutes: elements.duration,

      status: elements.statusOptions,
    };

    Object.keys(examValidation.errors).forEach((name) => {
      markInvalid(fields[name]);
    });

    focusInvalid(fields[Object.keys(examValidation.errors)[0]]);

    await showError(
      "Invalid exam information",

      getFirstError(examValidation.errors),
    );

    return false;
  }

  if (
    examData.status === EXAM_STATUS.ACTIVE &&
    new Date(examData.endAt).getTime() <= Date.now()
  ) {
    markInvalid(elements.endDate);

    elements.endDate.focus();

    await showError(
      "Invalid exam schedule",
      "An active exam must have an end date in the future.",
    );

    return false;
  }

  if (examData.questions.length === 0) {
    await showError(
      "Questions required",
      "Add at least one question before saving the exam.",
    );

    return false;
  }

  if (questionsLocked) {
    return true;
  }

  const cards = getElements("[data-question-card]", elements.questionList);

  for (let index = 0; index < examData.questions.length; index += 1) {
    const validation = validateQuestionForm(examData.questions[index]);

    if (validation.isValid) {
      continue;
    }

    const card = cards[index];

    const fields = {
      type: getElement('[data-question-field="type"]', card),

      points: getElement('[data-question-field="points"]', card),

      text: getElement('[data-question-field="text"]', card),

      options: getOptionalElement("[data-option-text]", card),

      correctAnswer:
        getOptionalElement("[data-text-answer]", card) ||
        getElement("[data-answer-options]", card),
    };

    Object.keys(validation.errors).forEach((name) => {
      markInvalid(fields[name]);
    });

    focusInvalid(fields[Object.keys(validation.errors)[0]]);

    await showError(
      `Invalid question ${index + 1}`,

      getFirstError(validation.errors),
    );

    return false;
  }

  return true;
}

function setSaving(elements, saving) {
  setDisabled(elements.saveButton, saving);

  elements.saveButton.setAttribute("aria-busy", String(saving));

  const label = getOptionalElement("span", elements.saveButton);

  if (label) {
    setText(
      label,

      saving ? "Saving..." : currentExam ? "Update Exam" : "Save Exam",
    );
  }
}

function lockQuestions(elements) {
  questionsLocked = true;

  setDisabled(elements.addQuestion, true);

  if (elements.questionNote) {
    setText(
      elements.questionNote,

      "Questions are locked because submitted attempts depend on their original content. You can still update the exam information, schedule, and status.",
    );
  }
}

async function submitExam(event, elements, teacherId) {
  event.preventDefault();

  clearValidation(elements);

  const data = collectExamData(elements, teacherId);

  const isValid = await validateData(elements, data);

  if (!isValid) {
    return;
  }

  setSaving(elements, true);

  try {
    const savedExam = currentExam
      ? updateExam(currentExam.id, data)
      : createExam(data);

    currentExam = savedExam;

    await showSuccess(
      "Exam saved",

      `“${savedExam.title}” was saved successfully.`,
    );

    window.location.assign(ROUTES.TEACHER_EXAMS);
  } catch (error) {
    console.error("Unable to save exam.", error);

    await showError(
      "Unable to save exam",

      error.message || "The exam could not be saved.",
    );
  } finally {
    setSaving(elements, false);
  }
}

function addQuestion(elements) {
  if (questionsLocked) {
    return;
  }

  elements.questionList.append(questionCard(defaultQuestion(), false));

  renumberQuestions(elements);

  getElements("[data-question-card]", elements.questionList)
    .at(-1)
    ?.scrollIntoView({
      behavior: "smooth",

      block: "center",
    });
}

function removeQuestion(elements, button) {
  if (questionsLocked) {
    return;
  }

  const cards = getElements("[data-question-card]", elements.questionList);

  if (cards.length <= 1) {
    showInfoToast("An exam must contain at least one question.");

    return;
  }

  button.closest("[data-question-card]")?.remove();

  renumberQuestions(elements);
}

function changeQuestionType(elements, select) {
  if (questionsLocked) {
    return;
  }

  const card = select.closest("[data-question-card]");

  if (!card) {
    return;
  }

  renderAnswers(
    card,

    {
      type: select.value,

      options: [],

      correctAnswer: "",
    },

    false,
  );

  renumberQuestions(elements);
}

function bindEvents(elements, teacherId) {
  elements.form.addEventListener("submit", (event) => {
    void submitExam(event, elements, teacherId);
  });

  elements.addQuestion.addEventListener("click", () => {
    addQuestion(elements);
  });

  elements.questionList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-question]");

    if (button && elements.questionList.contains(button)) {
      removeQuestion(elements, button);
    }
  });

  elements.questionList.addEventListener("change", (event) => {
    const select = event.target.closest('[data-question-field="type"]');

    if (select && elements.questionList.contains(select)) {
      changeQuestionType(elements, select);
    }
  });

  ["input", "change"].forEach((eventName) => {
    elements.form.addEventListener(eventName, (event) => {
      event.target.classList?.remove("is-invalid");

      event.target.removeAttribute?.("aria-invalid");

      if (event.target.name === "status") {
        elements.statusOptions.classList.remove("is-invalid");

        elements.statusOptions.removeAttribute("aria-invalid");
      }

      event.target
        .closest?.("[data-answer-options]")
        ?.classList.remove("is-invalid");
    });
  });
}

async function loadMode(elements, teacher) {
  const examId = normalizeText(getQueryParam("examId"));

  if (!examId) {
    setStatus(EXAM_STATUS.DRAFT);

    renderQuestions(elements, []);

    return true;
  }

  const exam = getExamById(
    examId,

    {
      includeDeleted: false,
    },
  );

  if (!exam || exam.teacherId !== teacher.id) {
    await showError(
      "Exam not found",

      "The requested exam does not exist or does not belong to your account.",
    );

    window.location.assign(ROUTES.TEACHER_EXAMS);

    return false;
  }

  currentExam = exam;

  if (getAttemptsByExam(exam.id).length > 0) {
    lockQuestions(elements);
}

  setText(elements.pageTitle, "Edit Exam");

  setText(
    elements.pageDescription,

    "Update the exam information, schedule, status, and questions.",
  );

  populateExam(elements, exam);

  renderQuestions(elements, exam.questions);

  setSaving(elements, false);

  return true;
}

async function initializeExamForm() {
  const teacher = requireRole(USER_ROLES.TEACHER);

  if (!teacher) {
    return;
  }

  let elements;

  try {
    elements = getPageElements();

    elements.form.noValidate = true;

    ensureClosedStatus(elements);

    clearElement(elements.questionList);

    setText(elements.questionCount, "-- questions");

    setSaving(elements, false);

    bindEvents(elements, teacher.id);

    await loadMode(elements, teacher);
  } catch (error) {
    console.error("Unable to initialize the exam form.", error);

    if (elements) {
      setDisabled(elements.saveButton, true);
    }

    showErrorToast("Unable to load the exam form.");
  }
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      void initializeExamForm();
    },
    {
      once: true,
    },
  );
} else {
  void initializeExamForm();
}
