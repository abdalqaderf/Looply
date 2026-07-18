import {
    APP_CONFIG,
    EXAM_STATUS,
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
    confirmDelete,
    showError,
    showErrorToast,
    showSuccessToast
} from "../core/alerts.js";

import {
    getQueryParam,
    normalizeText
} from "../core/utils.js";

import {
    changeExamStatus,
    deleteExam,
    getExamById,
    getExamTotalPoints
} from "../services/exams-service.js";

import {
    getAttemptsByExam
} from "../services/attempts-service.js";

const LOCALE =
    APP_CONFIG.defaultLocale;

let currentExam = null;

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
    const informationCards =
        getElements(
            ".exam-information-card"
        );

    if (
        informationCards.length !==
        5
    ) {
        throw new Error(
            "The exam information cards are incomplete."
        );
    }

    return {
        title:
            getElement(
                ".exam-details-title-row .dashboard-page-title"
            ),

        status:
            getElement(
                "#exam-details-status"
            ),

        description:
            getElement(
                ".exam-details-header-content > .dashboard-page-description"
            ),

        editLink:
            getElement(
                ".exam-details-header-actions a.exam-details-action-btn"
            ),

        editQuestionsLink:
            getElement(
                ".exam-details-small-btn"
            ),

        statusButton:
            getElement(
                "#exam-status-toggle"
            ),

        deleteButton:
            getElement(
                "[data-delete-exam]"
            ),

        informationCards,

        overviewDescription:
            getElement(
                ".exam-details-text-block p"
            ),

        instructions:
            getElement(
                ".exam-details-instructions"
            ),

        questionCount:
            getElement(
                ".exam-details-count"
            ),

        questionList:
            getElement(
                ".exam-questions-list"
            ),

        questionNote:
            getElement(
                ".exam-questions-note p"
            ),

        backLink:
            getElement(
                ".exam-details-back-link"
            )
    };
}

function routeWithExamId(
    route,
    examId
) {
    const url =
        new URL(route);

    url.searchParams.set(
        "examId",
        examId
    );

    return url.href;
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

function effectiveStatus(exam) {
    if (
        exam.status ===
        EXAM_STATUS.INACTIVE
    ) {
        return EXAM_STATUS.INACTIVE;
    }

    if (
        exam.status ===
        EXAM_STATUS.END
    ) {
        return EXAM_STATUS.END;
    }

    const endTime =
        new Date(
            exam.endAt
        ).getTime();

    if (
        Number.isFinite(
            endTime
        ) &&
        endTime <
            Date.now()
    ) {
        return EXAM_STATUS.END;
    }

    return EXAM_STATUS.ACTIVE;
}

function statusLabel(status) {
    return (
        status.charAt(0)
            .toUpperCase() +
        status.slice(1)
    );
}

function dateParts(value) {
    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return {
            date:
                "Invalid date",

            time:
                ""
        };
    }

    return {
        date:
            new Intl.DateTimeFormat(
                LOCALE,
                {
                    year:
                        "numeric",

                    month:
                        "long",

                    day:
                        "numeric"
                }
            ).format(date),

        time:
            new Intl.DateTimeFormat(
                LOCALE,
                {
                    hour:
                        "2-digit",

                    minute:
                        "2-digit"
                }
            ).format(date)
    };
}

function setInformationCard(
    card,
    value,
    detail
) {
    setText(
        getElement(
            "strong",
            card
        ),
        value
    );

    setText(
        getElement(
            "div > span",
            card
        ),
        detail
    );
}

function answerText(question) {
    if (
        question.type ===
            QUESTION_TYPES
                .MULTIPLE_CHOICE ||
        question.type ===
            QUESTION_TYPES
                .TRUE_FALSE
    ) {
        return (
            question.options ?? []
        ).find(
            (option) =>
                normalizeText(
                    option.id
                ) ===
                normalizeText(
                    question.correctAnswer
                )
        )?.text ??
        question.correctAnswer;
    }

    return question.correctAnswer;
}

function createQuestionOptions(
    question
) {
    const container =
        make(
            "div",
            {
                className:
                    "exam-question-options"
            }
        );

    (
        question.options ?? []
    ).forEach(
        (
            option,
            index
        ) => {
            const correct =
                normalizeText(
                    option.id
                ) ===
                normalizeText(
                    question.correctAnswer
                );

            container.append(
                make(
                    "span",
                    {
                        className:
                            `exam-question-option${
                                correct
                                    ? " exam-question-option--correct"
                                    : ""
                            }`
                    },

                    make(
                        "b",
                        {
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
                )
            );
        }
    );

    return container;
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
                    "exam-question-body"
            },

            make(
                "h3",
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
                        "exam-question-code"
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
            createQuestionOptions(
                question
            )
        );
    }

    const answerPrefix =
        (
            question.type ===
                QUESTION_TYPES
                    .SHORT_ANSWER ||
            question.type ===
                QUESTION_TYPES
                    .CODE_OUTPUT
        )
            ? "Expected answer:"
            : "Correct answer:";

    return make(
        "article",
        {
            className:
                "exam-question-card"
        },

        make(
            "div",
            {
                className:
                    "exam-question-header"
            },

            make(
                "div",
                {
                    className:
                        "exam-question-number"
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
                        "exam-question-tags"
                },

                make(
                    "span",
                    {
                        className:
                            "exam-question-type",

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
                            "exam-question-points",

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

        body,

        make(
            "div",
            {
                className:
                    "exam-question-answer"
            },

            icon(
                "bi-check-circle"
            ),

            make(
                "span",
                {},
                `${answerPrefix} `,

                make(
                    "strong",
                    {
                        text:
                            answerText(
                                question
                            ) ||
                            "Not provided"
                    }
                )
            )
        )
    );
}

function renderInstructions(
    elements,
    instructions
) {
    clearElement(
        elements.instructions
    );

    const lines =
        String(
            instructions ??
            ""
        )
            .split(
                /\r?\n/
            )
            .map(
                normalizeText
            )
            .filter(
                Boolean
            );

    const items =
        lines.length > 0
            ? lines
            : [
                "No student instructions were provided."
            ];

    items.forEach(
        (line) => {
            elements.instructions
                .append(
                    make(
                        "li",
                        {
                            text:
                                line
                        }
                    )
                );
        }
    );
}

function configureStatus(
    elements,
    exam
) {
    const status =
        effectiveStatus(
            exam
        );

    elements.status
        .classList
        .remove(
            "exam-details-status--active",
            "exam-details-status--inactive",
            "exam-details-status--end"
        );

    elements.status
        .classList
        .add(
            `exam-details-status--${status}`
        );

    setText(
        elements.status,
        statusLabel(
            status
        )
    );

    const storedActive =
        exam.status ===
        EXAM_STATUS.ACTIVE;

    const nextStatus =
        storedActive
            ? EXAM_STATUS.INACTIVE
            : EXAM_STATUS.ACTIVE;

    elements.statusButton
        .dataset
        .examId =
        exam.id;

    elements.statusButton
        .dataset
        .currentStatus =
        exam.status;

    elements.statusButton
        .dataset
        .nextStatus =
        nextStatus;

    clearElement(
        elements.statusButton
    );

    elements.statusButton
        .append(
            icon(
                nextStatus ===
                EXAM_STATUS.ACTIVE
                    ? "bi-play-circle"
                    : "bi-pause-circle"
            ),

            make(
                "span",
                {
                    text:
                        nextStatus ===
                        EXAM_STATUS.ACTIVE
                            ? "Activate"
                            : status ===
                                EXAM_STATUS.END
                                ? "Move to Draft"
                                : "Deactivate"
                }
            )
        );

    elements.deleteButton
        .dataset
        .examId =
        exam.id;
}

function renderQuestions(
    elements,
    exam
) {
    const questions =
        Array.isArray(
            exam.questions
        )
            ? exam.questions
            : [];

    setText(
        elements.questionCount,

        `${questions.length} ${
            questions.length === 1
                ? "question"
                : "questions"
        }`
    );

    clearElement(
        elements.questionList
    );

    if (
        questions.length ===
        0
    ) {
        elements.questionList
            .append(
                make(
                    "article",
                    {
                        className:
                            "exam-question-card"
                    },

                    make(
                        "div",
                        {
                            className:
                                "exam-question-body"
                        },

                        make(
                            "h3",
                            {
                                text:
                                    "This exam does not contain any questions yet."
                            }
                        )
                    )
                )
            );

        return;
    }

    questions.forEach(
        (
            question,
            index
        ) => {
            elements.questionList
                .append(
                    createQuestionCard(
                        question,
                        index
                    )
                );
        }
    );
}

function renderExam(
    elements,
    exam
) {
    const start =
        dateParts(
            exam.startAt
        );

    const end =
        dateParts(
            exam.endAt
        );

    const questions =
        Array.isArray(
            exam.questions
        )
            ? exam.questions
            : [];

    const attempts =
        getAttemptsByExam(
            exam.id
        );

    document.title =
        `Looply | ${
            exam.title ||
            "Exam Details"
        }`;

    setText(
        elements.title,
        exam.title ||
        "Untitled exam"
    );

    setText(
        elements.description,

        exam.description ||
        "No description was provided for this exam."
    );

    setInformationCard(
        elements.informationCards[0],
        start.date,
        start.time
    );

    setInformationCard(
        elements.informationCards[1],
        end.date,
        end.time
    );

    setInformationCard(
        elements.informationCards[2],

        `${
            Number(
                exam.durationMinutes
            ) ||
            0
        } minutes`,

        "Exam time limit"
    );

    setInformationCard(
        elements.informationCards[3],

        `${questions.length} ${
            questions.length === 1
                ? "question"
                : "questions"
        }`,

        "All questions required"
    );

    setInformationCard(
        elements.informationCards[4],

        `${
            getExamTotalPoints(
                exam
            )
        } points`,

        "Maximum score"
    );

    setText(
        elements.overviewDescription,

        exam.description ||
        "No description was provided for this exam."
    );

    renderInstructions(
        elements,
        exam.instructions
    );

    renderQuestions(
        elements,
        exam
    );

    configureStatus(
        elements,
        exam
    );

    elements.editLink.href =
        routeWithExamId(
            ROUTES.TEACHER_EXAM_FORM,
            exam.id
        );

    elements.editQuestionsLink.href =
        routeWithExamId(
            ROUTES.TEACHER_EXAM_FORM,
            exam.id
        );

    elements.backLink.href =
        ROUTES.TEACHER_EXAMS;

    setText(
        elements.questionNote,

        attempts.length > 0
            ? `${attempts.length} ${
                attempts.length === 1
                    ? "attempt depends"
                    : "attempts depend"
            } on this question set. Existing questions are locked in the edit form.`
            : "All questions are shown above. No attempts currently depend on this question set."
    );
}

function assertCanActivate(
    exam
) {
    if (
        !Array.isArray(
            exam.questions
        ) ||
        exam.questions.length === 0
    ) {
        throw new Error(
            "Add at least one valid question before activating this exam."
        );
    }

    const endTime =
        new Date(
            exam.endAt
        ).getTime();

    if (
        !Number.isFinite(
            endTime
        ) ||
        endTime <=
            Date.now()
    ) {
        throw new Error(
            "Update the exam end date before activating it."
        );
    }
}

async function toggleStatus(
    elements
) {
    const nextStatus =
        normalizeText(
            elements.statusButton
                .dataset
                .nextStatus
        );

    if (
        !currentExam ||
        !nextStatus
    ) {
        return;
    }

    if (
        nextStatus ===
        EXAM_STATUS.ACTIVE
    ) {
        try {
            assertCanActivate(
                currentExam
            );
        } catch (error) {
            await showError(
                "Cannot activate exam",
                error.message
            );

            return;
        }
    }

    setDisabled(
        elements.statusButton,
        true
    );

    try {
        currentExam =
            changeExamStatus(
                currentExam.id,
                nextStatus
            );

        renderExam(
            elements,
            currentExam
        );

        showSuccessToast(
            nextStatus ===
            EXAM_STATUS.ACTIVE
                ? "Exam activated successfully."
                : "Exam moved to draft."
        );
    } catch (error) {
        console.error(
            "Unable to change exam status.",
            error
        );

        await showError(
            "Unable to update exam",

            error.message ||
            "The exam status could not be changed."
        );
    } finally {
        setDisabled(
            elements.statusButton,
            false
        );
    }
}

async function removeExam(
    elements
) {
    if (!currentExam) {
        return;
    }

    const confirmed =
        await confirmDelete(
            currentExam.title ||
            "this exam"
        );

    if (!confirmed) {
        return;
    }

    setDisabled(
        elements.deleteButton,
        true
    );

    try {
        deleteExam(
            currentExam.id
        );

        showSuccessToast(
            "Exam removed successfully."
        );

        window.location.assign(
            ROUTES.TEACHER_EXAMS
        );
    } catch (error) {
        console.error(
            "Unable to remove exam.",
            error
        );

        await showError(
            "Unable to remove exam",

            error.message ||
            "The exam could not be removed."
        );
    } finally {
        setDisabled(
            elements.deleteButton,
            false
        );
    }
}

function bindEvents(
    elements
) {
    elements.statusButton
        .addEventListener(
            "click",
            () => {
                void toggleStatus(
                    elements
                );
            }
        );

    elements.deleteButton
        .addEventListener(
            "click",
            () => {
                void removeExam(
                    elements
                );
            }
        );
}

function renderLoading(
    elements
) {
    setText(
        elements.title,
        "Loading exam..."
    );

    setText(
        elements.description,
        "Preparing exam information."
    );

    setText(
        elements.status,
        "Loading"
    );

    clearElement(
        elements.questionList
    );

    elements.questionList
        .append(
            make(
                "article",
                {
                    className:
                        "exam-question-card"
                },

                make(
                    "div",
                    {
                        className:
                            "exam-question-body"
                    },

                    make(
                        "h3",
                        {
                            text:
                                "Loading questions..."
                        }
                    )
                )
            )
        );
}

async function initializeExamDetails() {
    const teacher =
        requireRole(
            USER_ROLES.TEACHER
        );

    if (!teacher) {
        return;
    }

    let elements = null;

    try {
        elements =
            getPageElements();

        renderLoading(
            elements
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

        const exam =
            getExamById(
                examId,
                {
                    includeDeleted:
                        false
                }
            );

        if (
            !exam ||
            exam.teacherId !==
                teacher.id
        ) {
            throw new Error(
                "The requested exam was not found."
            );
        }

        currentExam =
            exam;

        bindEvents(
            elements
        );

        renderExam(
            elements,
            currentExam
        );
    } catch (error) {
        console.error(
            "Unable to load exam details.",
            error
        );

        try {
            await showError(
                "Exam unavailable",

                error.message ||
                "The exam details could not be loaded."
            );
        } catch (alertError) {
            console.error(
                "Unable to display the exam details error alert.",
                alertError
            );

            showErrorToast(
                "Unable to load exam details."
            );
        }

        window.location.replace(
            ROUTES.TEACHER_EXAMS
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
            void initializeExamDetails();
        },
        {
            once:
                true
        }
    );
} else {
    void initializeExamDetails();
}