function createProjectUrl(path) {
    return new URL(`../../${path}`, import.meta.url).href;
}

export const APP_CONFIG = Object.freeze({
    name: "Looply",
    version: "1.0.0",
    defaultLocale: "en-US"
});

export const USER_ROLES = Object.freeze({
    STUDENT: "student",
    TEACHER: "teacher"
});

export const STORAGE_KEYS = Object.freeze({
    USERS: "looply_users",
    EXAMS: "looply_exams",
    ATTEMPTS: "looply_attempts",
    SEED_VERSION: "looply_seed_version"
});

export const SESSION_KEYS = Object.freeze({
    CURRENT_USER: "looply_current_user"
});

export const EXAM_STATUS = Object.freeze({
    INACTIVE: "inactive",
    ACTIVE: "active",
    END: "end"
});

export const ATTEMPT_STATUS = Object.freeze({
    IN_PROGRESS: "in-progress",
    SUBMITTED: "submitted"
});

export const QUESTION_TYPES = Object.freeze({
    MULTIPLE_CHOICE: "multiple-choice",
    TRUE_FALSE: "true-false",
    SHORT_ANSWER: "short-answer",
    CODE_OUTPUT: "code-output"
});

export const ROUTES = Object.freeze({
    HOME: createProjectUrl("html/home.html"),
    CONTACT: createProjectUrl("html/contact-about.html"),
    LOGIN: createProjectUrl("html/login.html"),

    STUDENT_DASHBOARD: createProjectUrl("html/student/dashboard.html"),
    STUDENT_EXAMS: createProjectUrl("html/student/exams.html"),
    STUDENT_TAKE_EXAM: createProjectUrl("html/student/take-exam.html"),
    STUDENT_EXAM_RESULT: createProjectUrl("html/student/exam-result.html"),
    STUDENT_HISTORY: createProjectUrl("html/student/history.html"),
    STUDENT_PROFILE: createProjectUrl("html/student/profile.html"),

    TEACHER_DASHBOARD: createProjectUrl("html/teacher/dashboard.html"),
    TEACHER_STUDENTS: createProjectUrl("html/teacher/students.html"),
    TEACHER_EXAMS: createProjectUrl("html/teacher/exams.html"),
    TEACHER_EXAM_FORM: createProjectUrl("html/teacher/exam-form.html"),
    TEACHER_EXAM_DETAILS: createProjectUrl("html/teacher/exam-details.html"),
    TEACHER_PROFILE: createProjectUrl("html/teacher/profile.html")
});

export const API_CONFIG = Object.freeze({
    baseUrl: "",
    timeoutMs: 8000
});