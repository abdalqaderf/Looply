import {
    ATTEMPT_STATUS,
    QUESTION_TYPES,
    ROUTES,
    USER_ROLES
} from "../core/config.js";

import {
    requireRole
} from "../core/auth.js";

import {
    clearElement,
    createElement,
    getElement,
    getElements,
    setDisabled,
    setText
} from "../core/dom.js";

import {
    closeAlert,
    confirmExamSubmission,
    showError,
    showErrorToast,
    showLoading
} from "../core/alerts.js";

import {
    getQueryParam,
    normalizeText
} from "../core/utils.js";

import {
    getExamById,
    getExamTotalPoints
} from "../services/exams-service.js";

import {
    getStudentExamAttempt,
    saveAnswer,
    startAttempt,
    submitAttempt
} from "../services/attempts-service.js";

let currentExam = null;
let currentAttempt = null;
let currentQuestionIndex = 0;
let timerId = null;
let submissionInProgress = false;

function make(
    tag,
    options = {},
    ...children
) {
    const element =
        createElement(
            tag,
            options
        );

    element.append(
        ...children
    );

    return element;
}

function icon(name) {
    return make(
        "i",
        {
            className:
                `bi ${name}`,

            attributes: {
                "aria-hidden":
                    "true"
            }
        }
    );
}

function getPageElements() {
    return {
        form:
            getElement(
                "#student-exam-form"
            ),

        examId:
            getElement(
                'input[name="exam_id"]'
            ),

        title:
            getElement(
                ".take-exam-title"
            ),

        description:
            getElement(
                ".take-exam-description"
            ),

        timer:
            getElement(
                "#exam-timer"
            ),

        timerValue:
            getElement(
                "#exam-timer-value"
            ),

        progress:
            getElement(
                "#exam-progress-fraction"
            ),

        totalPoints:
            getElement(
                "#exam-total-points-badge"
            ),

        questionWrapper:
            getElement(
                "#active-question-card-wrapper"
            ),

        navigation:
            getElement(
                "#question-navigation-grid"
            ),

        navigationCount:
            getElement(
                ".take-exam-sidebar-header span"
            ),

        submitButtons:
            getElements(
                "[data-submit-exam]"
            ),

        exitLink:
            getElement(
                ".take-exam-exit-btn"
            )
    };
}

function questionTypeLabel(type) {
    const labels = {
        [QUESTION_TYPES.MULTIPLE_CHOICE]:
            "Multiple Choice",

        [QUESTION_TYPES.TRUE_FALSE]:
            "True or False",

        [QUESTION_TYPES.SHORT_ANSWER]:
            "Short Answer",

        [QUESTION_TYPES.CODE_OUTPUT]:
            "Code Output"
    };

    return labels[type] ??
        "Question";
}

function resultRoute(
    attemptId
) {
    const url =
        new URL(
            ROUTES.STUDENT_EXAM_RESULT
        );

    url.searchParams.set(
        "attemptId",
        attemptId
    );

    return url.href;
}

function answerIsFilled(answer) {
    if (
        Array.isArray(
            answer
        )
    ) {
        return answer.some(
            (item) =>
                normalizeText(
                    item
                ) !== ""
        );
    }

    return normalizeText(
        answer
    ) !== "";
}

function getAnsweredCount() {
    const answers =
        currentAttempt?.answers ??
        {};

    return (
        currentExam?.questions ??
        []
    ).filter(
        (question) =>
            answerIsFilled(
                answers[
                    question.id
                ]
            )
    ).length;
}

function createOption(
    question,
    option,
    index
) {
    const wrapper =
        make(
            "div",
            {
                className:
                    "take-exam-option"
            }
        );

    const inputId =
        `question-${question.id}-option-${index + 1}`;

    const input =
        make(
            "input",
            {
                attributes: {
                    type:
                        "radio",

                    id:
                        inputId,

                    name:
                        `answer-${question.id}`,

                    value:
                        option.id
                },

                dataset: {
                    questionAnswer:
                        "",

                    questionId:
                        question.id
                }
            }
        );

    input.checked =
        normalizeText(
            currentAttempt
                ?.answers
                ?.[question.id]
        ) ===
        normalizeText(
            option.id
        );

    const label =
        make(
            "label",
            {
                attributes: {
                    for:
                        inputId
                }
            },

            make(
                "span",
                {
                    className:
                        "take-exam-option-letter",

                    text:
                        String.fromCharCode(
                            65 +
                            index
                        )
                }
            ),

            make(
                "span",
                {
                    text:
                        option.text ||
                        `Option ${
                            index +
                            1
                        }`
                }
            )
        );

    wrapper.append(
        input,
        label
    );

    return wrapper;
}

function createChoiceAnswers(
    question
) {
    const options =
        Array.isArray(
            question.options
        )
            ? question.options
            : [];

    const fieldset =
        make(
            "fieldset",
            {
                className:
                    `take-exam-options${
                        options.length === 2
                            ? " take-exam-options--two"
                            : ""
                    }`
            }
        );

    fieldset.append(
        make(
            "legend",
            {
                text:
                    "Select your answer"
            }
        )
    );

    options.forEach(
        (
            option,
            index
        ) => {
            fieldset.append(
                createOption(
                    question,
                    option,
                    index
                )
            );
        }
    );

    return fieldset;
}

function createWrittenAnswer(
    question
) {
    const field =
        make(
            "div",
            {
                className:
                    "take-exam-written-field"
            }
        );

    const inputId =
        `question-${question.id}-answer`;

    const label =
        make(
            "label",
            {
                text:
                    question.type ===
                    QUESTION_TYPES
                        .CODE_OUTPUT
                        ? "Enter the exact output"
                        : "Enter your answer",

                attributes: {
                    for:
                        inputId
                }
            }
        );

    const commonOptions = {
        attributes: {
            id:
                inputId,

            name:
                `answer-${question.id}`,

            maxlength:
                "1000",

            placeholder:
                question.type ===
                QUESTION_TYPES
                    .CODE_OUTPUT
                    ? "Write the expected program output."
                    : "Write your answer here."
        },

        dataset: {
            questionAnswer:
                "",

            questionId:
                question.id
        }
    };

    const input =
        question.type ===
        QUESTION_TYPES.CODE_OUTPUT
            ? make(
                "textarea",
                {
                    ...commonOptions,

                    attributes: {
                        ...commonOptions.attributes,

                        rows:
                            "5",

                        spellcheck:
                            "false"
                    }
                }
            )
            : make(
                "input",
                {
                    ...commonOptions,

                    attributes: {
                        ...commonOptions.attributes,

                        type:
                            "text"
                    }
                }
            );

    input.value =
        String(
            currentAttempt
                ?.answers
                ?.[question.id] ??
            ""
        );

    field.append(
        label,
        input
    );

    return field;
}

function createQuestionCard(
    question,
    index
) {
    const body =
        make(
            "div",
            {
                className:
                    "take-exam-question-body"
            }
        );

    body.append(
        make(
            "h2",
            {
                text:
                    question.text ||
                    "Untitled question"
            }
        )
    );

    if (
        normalizeText(
            question.code
        )
    ) {
        body.append(
            make(
                "pre",
                {
                    className:
                        "take-exam-code"
                },

                make(
                    "code",
                    {
                        text:
                            question.code
                    }
                )
            )
        );
    }

    if (
        question.type ===
            QUESTION_TYPES
                .MULTIPLE_CHOICE ||
        question.type ===
            QUESTION_TYPES
                .TRUE_FALSE
    ) {
        body.append(
            createChoiceAnswers(
                question
            )
        );
    } else {
        body.append(
            createWrittenAnswer(
                question
            )
        );
    }

    return make(
        "article",
        {
            className:
                "take-exam-question",

            attributes: {
                id:
                    `question-${question.id}`,

                tabindex:
                    "-1"
            }
        },

        make(
            "div",
            {
                className:
                    "take-exam-question-header"
            },

            make(
                "div",
                {
                    className:
                        "take-exam-question-number"
                },

                make(
                    "span",
                    {
                        text:
                            "Question"
                    }
                ),

                make(
                    "strong",
                    {
                        text:
                            String(
                                index +
                                1
                            ).padStart(
                                2,
                                "0"
                            )
                    }
                )
            ),

            make(
                "div",
                {
                    className:
                        "take-exam-question-tags"
                },

                make(
                    "span",
                    {
                        className:
                            "take-exam-question-type",

                        text:
                            questionTypeLabel(
                                question.type
                            )
                    }
                ),

                make(
                    "span",
                    {
                        className:
                            "take-exam-question-points",

                        text:
                            `${
                                Number(
                                    question.points
                                ) ||
                                0
                            } points`
                    }
                )
            )
        ),

        body
    );
}

function renderCurrentQuestion(
    elements
) {
    clearElement(
        elements.questionWrapper
    );

    const question =
        currentExam.questions[
            currentQuestionIndex
        ];

    if (!question) {
        elements.questionWrapper
            .append(
                make(
                    "article",
                    {
                        className:
                            "take-exam-question"
                    },

                    make(
                        "div",
                        {
                            className:
                                "take-exam-question-body"
                        },

                        make(
                            "h2",
                            {
                                text:
                                    "Question could not be loaded."
                            }
                        )
                    )
                )
            );

        return;
    }

    const card =
        createQuestionCard(
            question,
            currentQuestionIndex
        );

    elements.questionWrapper
        .append(
            card
        );

    card.focus({
        preventScroll:
            true
    });
}

function renderNavigation(
    elements
) {
    clearElement(
        elements.navigation
    );

    currentExam.questions
        .forEach(
            (
                question,
                index
            ) => {
                const answered =
                    answerIsFilled(
                        currentAttempt
                            ?.answers
                            ?.[question.id]
                    );

                const button =
                    make(
                        "button",
                        {
                            className:
                                "take-exam-question-link",

                            text:
                                index +
                                1,

                            attributes: {
                                type:
                                    "button",

                                "aria-label":
                                    `Open question ${index + 1}`
                            },

                            dataset: {
                                questionIndex:
                                    index
                            }
                        }
                    );

                button.classList
                    .toggle(
                        "is-current",
                        index ===
                        currentQuestionIndex
                    );

                button.classList
                    .toggle(
                        "is-answered",
                        answered
                    );

                if (
                    index ===
                    currentQuestionIndex
                ) {
                    button.setAttribute(
                        "aria-current",
                        "step"
                    );
                }

                elements.navigation
                    .append(
                        button
                    );
            }
        );
}

function updateProgress(
    elements
) {
    const answered =
        getAnsweredCount();

    const total =
        currentExam
            .questions
            .length;

    setText(
        elements.progress,

        `${answered} of ${total} answered`
    );

    setText(
        elements.navigationCount,

        `${total} total`
    );
}

function updateQuestionState(
    elements
) {
    renderNavigation(
        elements
    );

    updateProgress(
        elements
    );
}

function showQuestion(
    elements,
    index
) {
    if (
        !Number.isInteger(
            index
        ) ||
        index < 0 ||
        index >=
            currentExam
                .questions
                .length
    ) {
        return;
    }

    currentQuestionIndex =
        index;

    renderCurrentQuestion(
        elements
    );

    updateQuestionState(
        elements
    );
}

function saveQuestionAnswer(
    elements,
    input
) {
    const questionId =
        normalizeText(
            input.dataset
                .questionId
        );

    if (
        !questionId ||
        submissionInProgress
    ) {
        return;
    }

    try {
        currentAttempt =
            saveAnswer(
                currentAttempt.id,
                questionId,
                input.value
            );

        updateQuestionState(
            elements
        );
    } catch (error) {
        console.error(
            "Unable to save the answer.",
            error
        );

        showErrorToast(
            error.message ||
            "Unable to save your answer."
        );
    }
}

function setSubmitting(
    elements,
    submitting
) {
    submissionInProgress =
        submitting;

    elements.submitButtons
        .forEach(
            (button) => {
                setDisabled(
                    button,
                    submitting
                );

                button.setAttribute(
                    "aria-busy",
                    String(
                        submitting
                    )
                );

                const label =
                    button.querySelector(
                        "span"
                    );

                if (label) {
                    setText(
                        label,

                        submitting
                            ? "Submitting..."
                            : "Submit Exam"
                    );
                }
            }
        );
}

function stopTimer() {
    if (
        timerId !==
        null
    ) {
        window.clearInterval(
            timerId
        );

        timerId =
            null;
    }
}

function getDeadline() {
    const startedAt =
        new Date(
            currentAttempt
                .startedAt
        ).getTime();

    const durationMinutes =
        Math.max(
            1,

            Number(
                currentExam
                    .durationMinutes
            ) ||
            1
        );

    const durationDeadline =
        startedAt +
        durationMinutes *
        60000;

    const examEnd =
        new Date(
            currentExam.endAt
        ).getTime();

    if (
        Number.isFinite(
            examEnd
        )
    ) {
        return Math.min(
            durationDeadline,
            examEnd
        );
    }

    return durationDeadline;
}

function formatRemainingTime(
    milliseconds
) {
    const totalSeconds =
        Math.max(
            0,

            Math.ceil(
                milliseconds /
                1000
            )
        );

    const minutes =
        Math.floor(
            totalSeconds /
            60
        );

    const seconds =
        totalSeconds %
        60;

    return (
        `${String(minutes)
            .padStart(
                2,
                "0"
            )}:` +
        `${String(seconds)
            .padStart(
                2,
                "0"
            )}`
    );
}

async function completeSubmission(
    elements,
    timedOut = false
) {
    if (
        submissionInProgress
    ) {
        return;
    }

    setSubmitting(
        elements,
        true
    );

    stopTimer();

    try {
        showLoading(
            timedOut
                ? "Time is up"
                : "Submitting exam...",

            timedOut
                ? "Your saved answers are being submitted automatically."
                : "Your answers are being graded."
        );

        const submittedAttempt =
            submitAttempt(
                currentAttempt.id,
                currentAttempt.answers
            );

        currentAttempt =
            submittedAttempt;

        closeAlert();

        window.location.replace(
            resultRoute(
                submittedAttempt.id
            )
        );
    } catch (error) {
        closeAlert();

        setSubmitting(
            elements,
            false
        );

        console.error(
            "Unable to submit the exam.",
            error
        );

        await showError(
            "Unable to submit exam",

            error.message ||
            "Your exam could not be submitted."
        );

        if (!timedOut) {
            startTimer(
                elements
            );
        }
    }
}

function updateTimer(
    elements
) {
    const remaining =
        getDeadline() -
        Date.now();

    setText(
        elements.timerValue,

        formatRemainingTime(
            remaining
        )
    );

    elements.timer
        .classList
        .toggle(
            "is-warning",

            remaining > 0 &&
            remaining <=
                5 *
                60000
        );

    elements.timer
        .classList
        .toggle(
            "is-expired",

            remaining <=
            0
        );

    if (
        remaining <=
        0
    ) {
        void completeSubmission(
            elements,
            true
        );
    }
}

function startTimer(
    elements
) {
    stopTimer();

    updateTimer(
        elements
    );

    if (
        !submissionInProgress
    ) {
        timerId =
            window.setInterval(
                () =>
                    updateTimer(
                        elements
                    ),

                1000
            );
    }
}

async function handleManualSubmission(
    event,
    elements
) {
    event.preventDefault();

    if (
        submissionInProgress
    ) {
        return;
    }

    const confirmed =
        await confirmExamSubmission();

    if (!confirmed) {
        return;
    }

    await completeSubmission(
        elements,
        false
    );
}

function bindEvents(
    elements
) {
    elements.form
        .addEventListener(
            "submit",
            (event) => {
                void handleManualSubmission(
                    event,
                    elements
                );
            }
        );

    elements.questionWrapper
        .addEventListener(
            "input",
            (event) => {
                const input =
                    event.target
                        .closest(
                            "[data-question-answer][data-question-id]"
                        );

                if (
                    input &&
                    elements.questionWrapper
                        .contains(
                            input
                        )
                ) {
                    saveQuestionAnswer(
                        elements,
                        input
                    );
                }
            }
        );

    elements.navigation
        .addEventListener(
            "click",
            (event) => {
                const button =
                    event.target
                        .closest(
                            "[data-question-index]"
                        );

                if (
                    !button ||
                    !elements.navigation
                        .contains(
                            button
                        )
                ) {
                    return;
                }

                showQuestion(
                    elements,

                    Number(
                        button.dataset
                            .questionIndex
                    )
                );
            }
        );

    document.addEventListener(
        "visibilitychange",
        () => {
            if (
                document.visibilityState ===
                    "visible" &&
                currentAttempt
                    ?.status ===
                    ATTEMPT_STATUS
                        .IN_PROGRESS
            ) {
                updateTimer(
                    elements
                );
            }
        }
    );
}

function renderExam(
    elements
) {
    elements.examId.value =
        currentExam.id;

    setText(
        elements.title,

        currentExam.title ||
        "Untitled exam"
    );

    setText(
        elements.description,

        currentExam.instructions ||
        currentExam.description ||
        "Answer every question before submitting the exam."
    );

    setText(
        elements.totalPoints,

        getExamTotalPoints(
            currentExam
        )
    );

    elements.exitLink.href =
        ROUTES.STUDENT_EXAMS;

    const firstUnansweredIndex =
        currentExam.questions
            .findIndex(
                (question) =>
                    !answerIsFilled(
                        currentAttempt
                            .answers
                            ?.[question.id]
                    )
            );

    currentQuestionIndex =
        firstUnansweredIndex >=
        0
            ? firstUnansweredIndex
            : 0;

    renderCurrentQuestion(
        elements
    );

    updateQuestionState(
        elements
    );

    startTimer(
        elements
    );
}

async function loadAttempt(
    student,
    examId
) {
    const exam =
        getExamById(
            examId,
            {
                includeDeleted:
                    true
            }
        );

    if (!exam) {
        throw new Error(
            "The requested exam was not found."
        );
    }

    if (
        !Array.isArray(
            exam.questions
        ) ||
        exam.questions.length ===
        0
    ) {
        throw new Error(
            "This exam does not contain any questions."
        );
    }

    const existingAttempt =
        getStudentExamAttempt(
            student.id,
            exam.id
        );

    if (
        existingAttempt
            ?.status ===
        ATTEMPT_STATUS
            .SUBMITTED
    ) {
        window.location.replace(
            resultRoute(
                existingAttempt.id
            )
        );

        return false;
    }

    currentExam =
        exam;

    currentAttempt =
        existingAttempt
            ?.status ===
        ATTEMPT_STATUS
            .IN_PROGRESS
            ? existingAttempt
            : startAttempt(
                exam.id,
                student.id
            );

    return true;
}

async function initializeTakeExam() {
    const student =
        requireRole(
            USER_ROLES.STUDENT
        );

    if (!student) {
        return;
    }

    let elements = null;

    try {
        elements =
            getPageElements();

        elements.form
            .noValidate =
            true;

        setText(
            elements.title,
            "Loading exam..."
        );

        setText(
            elements.description,
            "Preparing your saved attempt."
        );

        setText(
            elements.timerValue,
            "--:--"
        );

        setText(
            elements.progress,
            "Loading..."
        );

        setText(
            elements.totalPoints,
            "--"
        );

        setText(
            elements.navigationCount,
            "-- total"
        );

        clearElement(
            elements.questionWrapper
        );

        clearElement(
            elements.navigation
        );

        const examId =
            normalizeText(
                getQueryParam(
                    "examId"
                )
            );

        if (!examId) {
            throw new Error(
                "Exam ID is missing from the page URL."
            );
        }

        const canContinue =
            await loadAttempt(
                student,
                examId
            );

        if (!canContinue) {
            return;
        }

        bindEvents(
            elements
        );

        renderExam(
            elements
        );
    } catch (error) {
        stopTimer();

        console.error(
            "Unable to initialize the exam.",
            error
        );

        if (elements) {
            setSubmitting(
                elements,
                true
            );

            clearElement(
                elements.questionWrapper
            );

            elements.questionWrapper
                .append(
                    make(
                        "article",
                        {
                            className:
                                "take-exam-question"
                        },

                        make(
                            "div",
                            {
                                className:
                                    "take-exam-question-body"
                            },

                            make(
                                "h2",
                                {
                                    text:
                                        "Unable to load this exam."
                                }
                            )
                        )
                    )
                );
        }

        await showError(
            "Exam unavailable",

            error.message ||
            "The exam could not be loaded."
        );

        window.location.replace(
            ROUTES.STUDENT_EXAMS
        );
    }
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        () => {
            void initializeTakeExam();
        },
        {
            once:
                true
        }
    );
} else {
    void initializeTakeExam();
}
