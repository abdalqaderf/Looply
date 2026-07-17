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

function normalizeTeacher(user = {}) {
    const fullName = normalizeText(
        user.fullName ?? user.name
    ) || "Teacher";

    return {
        fullName,
        initials: getInitials(fullName) || "TR",
        roleLabel: "Teacher"
    };
}


export function createTeacherTopbar(user) {
    const teacher = normalizeTeacher(user);

    return `
        <nav
            class="teacher-topbar"
            aria-label="Teacher top navigation"
        >
            <div class="teacher-topbar-left">
                <button
                    type="button"
                    id="teacher-sidebar-toggle"
                    class="teacher-sidebar-toggle"
                    aria-label="Open sidebar"
                    aria-controls="teacher-sidebar-root"
                    aria-expanded="false"
                >
                    <i class="bi bi-list" aria-hidden="true"></i>
                </button>

                <a
                    href="${ROUTES.TEACHER_DASHBOARD}"
                    class="teacher-topbar-logo"
                    aria-label="Looply teacher dashboard"
                >
                    <img
                        src="${LOGO_URL}"
                        alt="Looply logo"
                    >
                </a>
            </div>

            <a
                href="${ROUTES.TEACHER_PROFILE}"
                class="teacher-user-card"
                aria-label="Open teacher profile"
            >
                <span
                    class="teacher-user-avatar"
                    aria-hidden="true"
                >
                    ${escapeHtml(teacher.initials)}
                </span>

                <span class="teacher-user-info">
                    <strong>${escapeHtml(teacher.fullName)}</strong>
                    <small>${teacher.roleLabel}</small>
                </span>

                <i
                    class="bi bi-chevron-down teacher-user-arrow"
                    aria-hidden="true"
                ></i>
            </a>
        </nav>
    `;
}


export function renderTeacherTopbar(user, options = {}) {
    const {
        rootSelector = "#teacher-topbar-root"
    } = options;

    const topbarRoot = document.querySelector(rootSelector);

    if (!topbarRoot) {
        console.warn(
            `Teacher topbar root was not found: ${rootSelector}`
        );

        return false;
    }

    if (!user || user.role !== USER_ROLES.TEACHER) {
        console.warn(
            "A valid teacher user is required to render the topbar."
        );

        return false;
    }

    topbarRoot.innerHTML = createTeacherTopbar(user);
    topbarRoot.dataset.topbarInitialized = "true";

    return true;
}


export function initializeTeacherTopbar() {
    const user = getCurrentUser();

    if (!user || user.role !== USER_ROLES.TEACHER) {
        return false;
    }

    return renderTeacherTopbar(user);
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeTeacherTopbar,
        { once: true }
    );
} else {
    initializeTeacherTopbar();
}