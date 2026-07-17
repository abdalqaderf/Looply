import {
    ROUTES,
    USER_ROLES
} from "../core/config.js";

import { getCurrentUser } from "../core/auth.js";
import { getInitials, normalizeText } from "../core/utils.js";

const LOGO_URL = new URL(
    "../../icons/logo.svg",
    import.meta.url
).href;

function escapeHtml(value) {
    return String(value ?? "").replace(
        /[&<>"]/g,
        (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;"
        })[character]
    );
}

function normalizeStudent(user = {}) {
    const fullName = normalizeText(
        user.fullName ?? user.name
    ) || "Student";

    return {
        fullName,
        initials: getInitials(fullName) || "ST",
        roleLabel: "Student"
    };
}

export function createStudentTopbar(user) {
    const student = normalizeStudent(user);

    return `
        <nav
            class="student-topbar"
            aria-label="Student top navigation"
        >
            <div class="student-topbar-left">
                <button
                    type="button"
                    id="student-sidebar-toggle"
                    class="student-sidebar-toggle"
                    aria-label="Open sidebar"
                    aria-controls="student-sidebar-root"
                    aria-expanded="false"
                >
                    <i class="bi bi-list" aria-hidden="true"></i>
                </button>

                <a
                    href="${ROUTES.STUDENT_DASHBOARD}"
                    class="student-topbar-logo"
                    aria-label="Looply student dashboard"
                >
                    <img
                        src="${LOGO_URL}"
                        alt="Looply logo"
                    >
                </a>
            </div>

            <a
                href="${ROUTES.STUDENT_PROFILE}"
                class="student-user-card"
                aria-label="Open student profile"
            >
                <span
                    class="student-user-avatar"
                    aria-hidden="true"
                >
                    ${escapeHtml(student.initials)}
                </span>

                <span class="student-user-info">
                    <strong>${escapeHtml(student.fullName)}</strong>
                    <small>${student.roleLabel}</small>
                </span>

                <i
                    class="bi bi-chevron-down student-user-arrow"
                    aria-hidden="true"
                ></i>
            </a>
        </nav>
    `;
}

export function renderStudentTopbar(user, options = {}) {
    const {
        rootSelector = "#student-topbar-root"
    } = options;

    const topbarRoot = document.querySelector(rootSelector);

    if (!topbarRoot) {
        console.warn(
            `Student topbar root was not found: ${rootSelector}`
        );

        return false;
    }

    if (!user || user.role !== USER_ROLES.STUDENT) {
        console.warn(
            "A valid student user is required to render the topbar."
        );

        return false;
    }

    topbarRoot.innerHTML = createStudentTopbar(user);
    topbarRoot.dataset.topbarInitialized = "true";

    return true;
}

export function initializeStudentTopbar() {
    const user = getCurrentUser();

    if (!user || user.role !== USER_ROLES.STUDENT) {
        return false;
    }

    return renderStudentTopbar(user);
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeStudentTopbar,
        { once: true }
    );
} else {
    initializeStudentTopbar();
}

