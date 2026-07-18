import { ROUTES } from "../core/config.js";

const TEACHER_WORKSPACE_LINKS = Object.freeze([
    {
        label: "Dashboard",
        icon: "bi-grid",
        href: ROUTES.TEACHER_DASHBOARD,
        activePages: ["dashboard.html"],
    },
    {
        label: "Students",
        icon: "bi-people",
        href: ROUTES.TEACHER_STUDENTS,
        activePages: ["students.html"],
    },
    {
        label: "Exams",
        icon: "bi-journal-code",
        href: ROUTES.TEACHER_EXAMS,
        activePages: ["exams.html", "exam-details.html"],
    },
    {
        label: "Create Exam",
        icon: "bi-plus-square",
        href: ROUTES.TEACHER_EXAM_FORM,
        activePages: ["exam-form.html"],
        extraClass: "teacher-create-exam-link",
    },
]);

const TEACHER_ACCOUNT_LINKS = Object.freeze([
    {
        label: "Profile",
        icon: "bi-person",
        href: ROUTES.TEACHER_PROFILE,
        activePages: ["profile.html"],
    },
    {
        label: "Logout",
        icon: "bi-box-arrow-left",
        href: ROUTES.LOGIN,
        activePages: [],
        extraClass: "teacher-logout-link",
        action: "logout",
    },
]);

function getCurrentPageName() {
    const pathParts = window.location.pathname.split("/");
    return pathParts.pop() || "dashboard.html";
}

function createTeacherLinks(links, currentPage) {
    return links
        .map((link) => {
            const isActive = link.activePages.includes(currentPage);
            const extraClass = link.extraClass ?? "";
            const actionAttribute = link.action
                ? `data-sidebar-action="${link.action}"`
                : "";

            return `
                <a
                    href="${link.href}"
                    class="teacher-side-link ${
                        isActive ? "active" : ""
                    } ${extraClass}"
                    ${isActive ? 'aria-current="page"' : ""}
                    ${actionAttribute}
                >
                    <i
                        class="bi ${link.icon}"
                        aria-hidden="true"
                    ></i>
                    <span>${link.label}</span>
                </a>
            `;
        })
        .join("");
}

export function createTeacherSidebar(currentPage = getCurrentPageName()) {
    return `
        <div class="teacher-sidebar-content">
            <section class="teacher-sidebar-section">
                <p class="teacher-sidebar-label">
                    Teacher Workspace
                </p>

                <nav
                    class="teacher-side-nav"
                    aria-label="Teacher workspace navigation"
                >
                    ${createTeacherLinks(TEACHER_WORKSPACE_LINKS, currentPage)}
                </nav>
            </section>

            <section class="teacher-sidebar-section">
                <p class="teacher-sidebar-label">
                    Account
                </p>

                <nav
                    class="teacher-side-nav"
                    aria-label="Teacher account navigation"
                >
                    ${createTeacherLinks(TEACHER_ACCOUNT_LINKS, currentPage)}
                </nav>
            </section>
        </div>

        <div class="teacher-sidebar-footer">
            <span class="teacher-sidebar-footer-icon">
                <i class="bi bi-shield-check"></i>
            </span>

            <div>
                <strong>Teacher Access</strong>
                <small>Exam management workspace</small>
            </div>
        </div>
    `;
}

function dispatchLogoutRequest() {
    const logoutEvent = new CustomEvent("looply:logout-requested", {
        bubbles: true,
        cancelable: true,
        detail: {
            role: "teacher",
            redirectUrl: ROUTES.LOGIN,
        },
    });

    const shouldContinueNavigation = document.dispatchEvent(logoutEvent);

    if (shouldContinueNavigation) {
        window.location.assign(ROUTES.LOGIN);
    }
}

export function renderTeacherSidebar(options = {}) {
    const {
        rootSelector = "#teacher-sidebar-root",
        overlaySelector = "#teacher-sidebar-overlay",
        toggleSelector = "#teacher-sidebar-toggle",
    } = options;

    const sidebarRoot = document.querySelector(rootSelector);

    if (!sidebarRoot) {
        console.warn(`Teacher sidebar root was not found: ${rootSelector}`);
        return false;
    }

    if (sidebarRoot.dataset.sidebarInitialized === "true") {
        return true;
    }

    const sidebarOverlay = document.querySelector(overlaySelector);
    const sidebarToggle = document.querySelector(toggleSelector);

    sidebarRoot.className = "teacher-sidebar";
    sidebarRoot.innerHTML = createTeacherSidebar();
    sidebarRoot.dataset.sidebarInitialized = "true";

    function setSidebarOpen(isOpen) {
        sidebarRoot.classList.toggle("is-open", isOpen);
        sidebarOverlay?.classList.toggle("is-visible", isOpen);
        sidebarToggle?.classList.toggle("is-active", isOpen);
        sidebarToggle?.setAttribute("aria-expanded", String(isOpen));
        document.body.classList.toggle("teacher-sidebar-open", isOpen);
    }

    function closeSidebar() {
        setSidebarOpen(false);
    }

    sidebarToggle?.addEventListener("click", () => {
        setSidebarOpen(!sidebarRoot.classList.contains("is-open"));
    });

    sidebarOverlay?.addEventListener("click", closeSidebar);

    sidebarRoot.addEventListener("click", (event) => {
        const clickedLink = event.target.closest(".teacher-side-link");

        if (!clickedLink) {
            return;
        }

        if (clickedLink.dataset.sidebarAction === "logout") {
            event.preventDefault();
            dispatchLogoutRequest();
            return;
        }

        if (window.innerWidth <= 992) {
            closeSidebar();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeSidebar();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 992) {
            closeSidebar();
        }
    });

    return true;
}

function initializeTeacherSidebar() {
    renderTeacherSidebar();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeTeacherSidebar, {
        once: true,
    });
} else {
    initializeTeacherSidebar();
}
