import {
    APP_CONFIG,
    ATTEMPT_STATUS,
    EXAM_STATUS,
    ROUTES,
    USER_ROLES
} from "../core/config.js";

import { requireRole } from "../core/auth.js";

import {
    calculatePercentage,
    formatDateTime,
    normalizeText
} from "../core/utils.js";

import {
    clearElement,
    createElement,
    getElement,
    setText
} from "../core/dom.js";

import { showErrorToast } from "../core/alerts.js";

import {
    getActiveStudents,
    getAllUsers
} from "../services/users-service.js";

import {
    getExamTotalPoints,
    getExamsByTeacher
} from "../services/exams-service.js";

import {
    getAttemptsByExam
} from "../services/attempts-service.js";

const RECENT_LIMIT = 4;
const LOCALE = APP_CONFIG.defaultLocale;

function node(
    tag,
    options = {},
    children = []
) {
    const element = createElement(
        tag,
        options
    );

    element.append(...children);

    return element;
}

function icon(name) {
    return node("i", {
        className: `bi ${name}`,
        attributes: {
            "aria-hidden": "true"
        }
    });
}

function routeWithId(
    route,
    examId
) {
    const url = new URL(route);

    url.searchParams.set(
        "examId",
        examId
    );

    return url.href;
}

function getElements() {
    return {
        welcome:
            getElement(
                "#teacher-welcome-message"
            ),

        students:
            getElement(
                "#teacher-total-students"
            ),

        exams:
            getElement(
                "#teacher-total-exams"
            ),

        tableBody:
            getElement(
                "#teacher-recent-exams-body"
            )
    };
}

function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return "Good morning";
    }

    if (hour < 18) {
        return "Good afternoon";
    }

    return "Good evening";
}

function getDisplayStatus(exam) {
    if (
        exam.status ===
        EXAM_STATUS.INACTIVE
    ) {
        return [
            "Inactive",
            "status-inactive"
        ];
    }

    if (
        exam.status ===
        EXAM_STATUS.END
    ) {
        return [
            "End",
        "status-end"
        ];
    }

    const now = Date.now();

    const end =
        new Date(
            exam.endAt
        ).getTime();

    if (
        Number.isFinite(end) &&
        now > end
    ) {
        return [
            "End",
            "status-end"
        ];
    }

    return [
        "Active",
        "status-active"
    ];
}

function stateRow(message) {
    return node(
        "tr",
        {},
        [
            node("td", {
                className:
                    "dashboard-muted-value",

                text: message,

                attributes: {
                    colspan: "6"
                }
            })
        ]
    );
}

function submissionsCell(
    exam,
    registeredStudents
) {
    const submitted =
        getAttemptsByExam(
            exam.id
        ).filter(
            (attempt) =>
                attempt.status ===
                ATTEMPT_STATUS.SUBMITTED
        ).length;

    if (
        exam.status ===
            EXAM_STATUS.INACTIVE &&
        submitted === 0
    ) {
        return node(
            "td",
            {},
            [
                node("span", {
                    className:
                        "dashboard-muted-value",

                    text: "—"
                })
            ]
        );
    }

    /*
     * We keep deleted students in the
     * submission target because their old
     * attempts must remain represented.
     */
    const target = Math.max(
        registeredStudents,
        submitted
    );

    const percentage = Math.min(
        100,
        calculatePercentage(
            submitted,
            target
        )
    );

    const progress = node(
        "div",
        {
            className:
                "dashboard-progress",

            attributes: {
                "aria-label":
                    `${submitted} of ${target} submissions`
            }
        },
        [
            node("span", {
                attributes: {
                    style:
                        `width: ${percentage}%`
                }
            })
        ]
    );

    if (
        target > 0 &&
        submitted >= target
    ) {
        progress.classList.add(
            "is-complete"
        );
    }

    return node(
        "td",
        {},
        [
            node(
                "div",
                {
                    className:
                        "dashboard-submission-cell"
                },
                [
                    node("span", {
                        text:
                            `${submitted} / ${target}`
                    }),

                    progress
                ]
            )
        ]
    );
}

function examRow(
    exam,
    registeredStudents
) {
    const [
        statusLabel,
        statusClass
    ] = getDisplayStatus(exam);

    const isInactive =
        exam.status ===
        EXAM_STATUS.INACTIVE;

    const actionRoute = isInactive
        ? ROUTES.TEACHER_EXAM_FORM
        : ROUTES.TEACHER_EXAM_DETAILS;

    const end =
        new Date(
            exam.endAt
        ).getTime();

    const endDate =
        Number.isFinite(end)
            ? formatDateTime(
                exam.endAt,
                LOCALE
            )
            : "Not scheduled";

    const questionCount =
        Array.isArray(exam.questions)
            ? exam.questions.length
            : 0;

    const duration =
        Number(
            exam.durationMinutes
        ) || 0;

    const totalPoints =
        getExamTotalPoints(exam);

    return node(
        "tr",
        {},
        [
            node(
                "td",
                {},
                [
                    node(
                        "div",
                        {
                            className:
                                "dashboard-exam-identity"
                        },
                        [
                            node(
                                "span",
                                {
                                    className:
                                        "dashboard-exam-icon"
                                },
                                [
                                    icon(
                                        "bi-journal-code"
                                    )
                                ]
                            ),

                            node(
                                "div",
                                {},
                                [
                                    node("strong", {
                                        text:
                                            exam.title ||
                                            "Untitled exam"
                                    }),

                                    node("small", {
                                        text:
                                            `${duration} min • ` +
                                            `${totalPoints} points`
                                    })
                                ]
                            )
                        ]
                    )
                ]
            ),

            node(
                "td",
                {},
                [
                    node("span", {
                        className:
                            `exam-status-badge ${statusClass}`,

                        text: statusLabel
                    })
                ]
            ),

            node("td", {
                text: questionCount
            }),

            submissionsCell(
                exam,
                registeredStudents
            ),

            node(
                "td",
                {},
                [
                    node("span", {
                        className:
                            Number.isFinite(end)
                                ? "dashboard-date"
                                : "dashboard-muted-value",

                        text: endDate
                    })
                ]
            ),

            node(
                "td",
                {},
                [
                    node(
                        "a",
                        {
                            className:
                                "dashboard-row-action",

                            attributes: {
                                href:
                                    routeWithId(
                                        actionRoute,
                                        exam.id
                                    ),

                                "aria-label":
                                    `${
                                        isInactive
                                            ? "Edit"
                                            : "View"
                                    } ${
                                        exam.title ||
                                        "exam"
                                    }`
                            }
                        },
                        [
                            icon(
                                isInactive
                                    ? "bi-pencil"
                                    : "bi-arrow-up-right"
                            )
                        ]
                    )
                ]
            )
        ]
    );
}

function renderTable(
    tableBody,
    exams,
    registeredStudents
) {
    clearElement(tableBody);

    if (exams.length === 0) {
        tableBody.append(
            stateRow(
                "No exams have been created yet."
            )
        );

        return;
    }

    exams.forEach((exam) => {
        tableBody.append(
            examRow(
                exam,
                registeredStudents
            )
        );
    });
}

function initializeTeacherDashboard() {
    const teacher = requireRole(
        USER_ROLES.TEACHER
    );

    if (!teacher) {
        return;
    }

    let elements;

    try {
        elements = getElements();

        setText(
            elements.students,
            "--"
        );

        setText(
            elements.exams,
            "--"
        );

        clearElement(
            elements.tableBody
        );

        elements.tableBody.append(
            stateRow(
                "Loading recent exams..."
            )
        );

        const teacherName =
            normalizeText(
                teacher.fullName
            ) || "Teacher";

        setText(
            elements.welcome,
            `${getGreeting()}, ${teacherName}.`
        );

        const activeStudents =
            getActiveStudents();

        const registeredStudents =
            getAllUsers().filter(
                (user) =>
                    user.role ===
                    USER_ROLES.STUDENT
            ).length;

        const exams =
            getExamsByTeacher(
                teacher.id
            );

        const recentExams =
            [...exams]
                .sort(
                    (
                        firstExam,
                        secondExam
                    ) => (
                        new Date(
                            secondExam.updatedAt ??
                            secondExam.createdAt
                        ).getTime() -
                        new Date(
                            firstExam.updatedAt ??
                            firstExam.createdAt
                        ).getTime()
                    )
                )
                .slice(
                    0,
                    RECENT_LIMIT
                );

        setText(
            elements.students,
            activeStudents.length
        );

        setText(
            elements.exams,
            exams.length
        );

        renderTable(
            elements.tableBody,
            recentExams,
            registeredStudents
        );
    } catch (error) {
        console.error(
            "Unable to load the teacher dashboard.",
            error
        );

        if (elements) {
            setText(
                elements.students,
                "--"
            );

            setText(
                elements.exams,
                "--"
            );

            clearElement(
                elements.tableBody
            );

            elements.tableBody.append(
                stateRow(
                    "Unable to load dashboard data."
                )
            );
        }

        showErrorToast(
            "Unable to load the dashboard data."
        );
    }
}

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeTeacherDashboard,
        {
            once: true
        }
    );
} else {
    initializeTeacherDashboard();
}