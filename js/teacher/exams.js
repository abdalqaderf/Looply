import {
    APP_CONFIG,
    EXAM_STATUS,
    ROUTES,
    USER_ROLES
} from "../core/config.js";

import { requireRole } from "../core/auth.js";

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

import { normalizeText } from "../core/utils.js";

import {
    changeExamStatus,
    deleteExam,
    getExamsByTeacher
} from "../services/exams-service.js";

const LOCALE = APP_CONFIG.defaultLocale;

let exams = [];
let activeFilter = "all";

function make(tag, options = {}, ...children) {
    const element = createElement(tag, options);

    element.append(...children);

    return element;
}

function icon(name) {
    return make("i", {
        className: `bi ${name}`,
        attributes: {
            "aria-hidden": "true"
        }
    });
}

function getPageElements() {
    return {
        count: getElement(".exams-count"),
        search: getElement("#teacher-exam-search"),
        filters: getElements("[data-exam-filter]"),
        body: getElement("#teacher-exams-body")
    };
}

function routeWithExamId(route, examId) {
    const url = new URL(route);

    url.searchParams.set(
        "examId",
        examId
    );

    return url.href;
}

function dateParts(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return {
            date: "Invalid date",
            time: ""
        };
    }

    return {
        date: new Intl.DateTimeFormat(
            LOCALE,
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        ).format(date),

        time: new Intl.DateTimeFormat(
            LOCALE,
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        ).format(date)
    };
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
        new Date(exam.endAt).getTime();

    return (
        Number.isFinite(endTime) &&
        endTime < Date.now()
    )
        ? EXAM_STATUS.END
        : EXAM_STATUS.ACTIVE;
}

function stateRow(message) {
    return make(
        "tr",
        {},
        make("td", {
            text: message,

            attributes: {
                colspan: "6"
            }
        })
    );
}

function dateCell(value) {
    const parts =
        dateParts(value);

    return make(
        "td",
        {},
        make(
            "div",
            {
                className: "exam-date"
            },
            make("span", {
                text: parts.date
            }),
            make("small", {
                text: parts.time
            })
        )
    );
}

function actionLink(
    route,
    exam,
    label,
    iconName
) {
    return make(
        "a",
        {
            className:
                "exam-action-btn",

            attributes: {
                href:
                    routeWithExamId(
                        route,
                        exam.id
                    ),

                title:
                    `${label} exam`,

                "aria-label":
                    `${label} ${exam.title ||
                    "exam"
                    }`
            }
        },

        icon(iconName)
    );
}

function statusButton(exam, status) {
    const nextStatus =
        status === EXAM_STATUS.ACTIVE
            ? EXAM_STATUS.INACTIVE
            : status === EXAM_STATUS.END
                ? EXAM_STATUS.INACTIVE
                : EXAM_STATUS.ACTIVE;

    const label =
        nextStatus === EXAM_STATUS.ACTIVE
            ? "Activate"
            : status === EXAM_STATUS.END
                ? "Set Inactive"
                : "Deactivate";

    return make(
        "button",
        {
            className:
                `exam-toggle-btn ${nextStatus === EXAM_STATUS.ACTIVE
                    ? "exam-activate-btn"
                    : "exam-deactivate-btn"
                }`,

            attributes: {
                type: "button",
                title: `${label} exam`,
                "aria-label":
                    `${label} ${exam.title || "exam"}`
            },

            dataset: {
                examAction: "toggle",
                examId: exam.id,
                nextStatus
            }
        },

        icon(
            nextStatus === EXAM_STATUS.ACTIVE
                ? "bi-play-circle"
                : "bi-pause-circle"
        ),

        make("span", {
            text: label
        })
    );
}

function deleteButton(exam) {
    return make(
        "button",
        {
            className:
                "exam-action-btn exam-delete-btn",

            attributes: {
                type: "button",

                title:
                    "Delete exam",

                "aria-label":
                    `Delete ${exam.title ||
                    "exam"
                    }`
            },

            dataset: {
                examAction:
                    "delete",

                examId:
                    exam.id
            }
        },

        icon("bi-trash")
    );
}

function examRow(exam) {
    const status =
        effectiveStatus(exam);

    const questionCount =
        Array.isArray(
            exam.questions
        )
            ? exam.questions.length
            : 0;

    const statusLabel =
        status.charAt(0).toUpperCase() +
        status.slice(1);

    return make(
        "tr",
        {
            dataset: {
                examId:
                    exam.id,

                examTitle:
                    normalizeText(
                        exam.title
                    ).toLowerCase(),

                examStatus:
                    status
            }
        },

        make(
            "td",
            {},
            make(
                "div",
                {
                    className:
                        "exam-identity"
                },

                make(
                    "span",
                    {
                        className:
                            "exam-icon"
                    },

                    icon("bi-braces")
                ),

                make(
                    "div",
                    {},

                    make("strong", {
                        text:
                            exam.title ||
                            "Untitled exam"
                    }),

                    make("small", {
                        text:
                            "Programming exam"
                    })
                )
            )
        ),

        dateCell(exam.startAt),

        dateCell(exam.endAt),

        make(
            "td",
            {},
            make("span", {
                className:
                    `exam-status exam-status-${status}`,

                text:
                    statusLabel
            })
        ),

        make(
            "td",
            {},
            make("span", {
                className:
                    "exam-question-count",

                text:
                    questionCount
            })
        ),

        make(
            "td",
            {},
            make(
                "div",
                {
                    className:
                        "exam-actions"
                },

                actionLink(
                    ROUTES.TEACHER_EXAM_DETAILS,
                    exam,
                    "View",
                    "bi-eye"
                ),

                actionLink(
                    ROUTES.TEACHER_EXAM_FORM,
                    exam,
                    "Edit",
                    "bi-pencil"
                ),

                statusButton(
                    exam,
                    status
                ),

                deleteButton(exam)
            )
        )
    );
}

function setCount(
    element,
    count
) {
    setText(
        element,
        `${count} ${count === 1
            ? "exam"
            : "exams"
        }`
    );
}

function visibleExams(
    searchValue
) {
    const query =
        normalizeText(
            searchValue
        ).toLowerCase();

    return exams.filter(
        (exam) => {
            const status =
                effectiveStatus(
                    exam
                );

            const matchesFilter =
                activeFilter ===
                "all" ||
                status ===
                activeFilter;

            if (!matchesFilter) {
                return false;
            }

            if (!query) {
                return true;
            }

            return [
                exam.title,
                exam.description,
                exam.instructions,
                status
            ]
                .map(
                    (value) =>
                        normalizeText(
                            value
                        ).toLowerCase()
                )
                .join(" ")
                .includes(query);
        }
    );
}

function render(elements) {
    const visible =
        visibleExams(
            elements.search.value
        );

    setCount(
        elements.count,
        exams.length
    );

    clearElement(
        elements.body
    );

    if (
        visible.length === 0
    ) {
        const filtering =
            activeFilter !==
            "all" ||
            normalizeText(
                elements.search.value
            );

        elements.body.append(
            stateRow(
                filtering
                    ? "No exams match the current search or filter."
                    : "No exams have been created yet."
            )
        );

        return;
    }

    visible.forEach(
        (exam) => {
            elements.body.append(
                examRow(exam)
            );
        }
    );
}

function updateFilters(
    elements
) {
    elements.filters.forEach(
        (button) => {
            const selected =
                button.dataset
                    .examFilter ===
                activeFilter;

            button.classList.toggle(
                "active",
                selected
            );

            button.setAttribute(
                "aria-pressed",
                String(selected)
            );
        }
    );
}

function reload(
    elements,
    teacherId
) {
    exams =
        getExamsByTeacher(
            teacherId
        );

    render(elements);
}

async function toggleStatus(
    elements,
    teacherId,
    button
) {
    const exam =
        exams.find(
            (item) =>
                item.id ===
                button.dataset
                    .examId
        );

    const nextStatus =
        button.dataset
            .nextStatus;

    if (!exam) {
        showErrorToast(
            "Exam was not found."
        );

        return;
    }

    if (
        nextStatus ===
        EXAM_STATUS.ACTIVE
    ) {
        const endTime =
            new Date(
                exam.endAt
            ).getTime();

        if (
            !Array.isArray(
                exam.questions
            ) ||
            exam.questions.length === 0
        ) {
            await showError(
                "Cannot activate exam",
                "Add at least one valid question before activating this exam."
            );

            return;
        }

        if (
            !Number.isFinite(
                endTime
            ) ||
            endTime <= Date.now()
        ) {
            await showError(
                "Cannot activate exam",
                "Update the exam end date before activating it."
            );

            return;
        }
    }

    setDisabled(
        button,
        true
    );

    try {
        changeExamStatus(
            exam.id,
            nextStatus
        );

        reload(
            elements,
            teacherId
        );

        showSuccessToast(
            nextStatus ===
                EXAM_STATUS.ACTIVE
                ? "Exam activated successfully."
                : "Exam set to inactive.");
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
            button,
            false
        );
    }
}

async function removeExam(
    elements,
    teacherId,
    button
) {
    const exam =
        exams.find(
            (item) =>
                item.id ===
                button.dataset
                    .examId
        );

    if (!exam) {
        showErrorToast(
            "Exam was not found."
        );

        return;
    }

    const confirmed =
        await confirmDelete(
            exam.title ||
            "this exam"
        );

    if (!confirmed) {
        return;
    }

    setDisabled(
        button,
        true
    );

    try {
        deleteExam(
            exam.id
        );

        reload(
            elements,
            teacherId
        );

        showSuccessToast(
            "Exam removed successfully."
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
            button,
            false
        );
    }
}

function bindEvents(
    elements,
    teacherId
) {
    elements.search
        .addEventListener(
            "input",
            () => render(elements)
        );

    elements.filters.forEach(
        (button) => {
            button.addEventListener(
                "click",
                () => {
                    activeFilter =
                        button.dataset
                            .examFilter ||
                        "all";

                    updateFilters(
                        elements
                    );

                    render(
                        elements
                    );
                }
            );
        }
    );

    elements.body
        .addEventListener(
            "click",
            (event) => {
                const button =
                    event.target.closest(
                        "[data-exam-action][data-exam-id]"
                    );

                if (
                    !button ||
                    !elements.body
                        .contains(button)
                ) {
                    return;
                }

                if (
                    button.dataset
                        .examAction ===
                    "toggle"
                ) {
                    void toggleStatus(
                        elements,
                        teacherId,
                        button
                    );
                } else if (
                    button.dataset
                        .examAction ===
                    "delete"
                ) {
                    void removeExam(
                        elements,
                        teacherId,
                        button
                    );
                }
            }
        );
}

function initializeTeacherExams() {
    const teacher =
        requireRole(
            USER_ROLES.TEACHER
        );

    if (!teacher) {
        return;
    }

    let elements;

    try {
        elements =
            getPageElements();

        setText(
            elements.count,
            "-- exams"
        );

        clearElement(
            elements.body
        );

        elements.body.append(
            stateRow(
                "Loading exams..."
            )
        );

        updateFilters(
            elements
        );

        bindEvents(
            elements,
            teacher.id
        );

        reload(
            elements,
            teacher.id
        );
    } catch (error) {
        console.error(
            "Unable to initialize the exams page.",
            error
        );

        if (elements) {
            setText(
                elements.count,
                "-- exams"
            );

            clearElement(
                elements.body
            );

            elements.body.append(
                stateRow(
                    "Unable to load exams."
                )
            );
        }

        showErrorToast(
            "Unable to load the exams page."
        );
    }
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeTeacherExams,
        {
            once: true
        }
    );
} else {
    initializeTeacherExams();
}