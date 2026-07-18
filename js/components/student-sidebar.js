import { ROUTES } from "../core/config.js";

const STUDENT_WORKSPACE_LINKS = Object.freeze([
    {
        label: "Dashboard",
        icon: "bi-grid",
        href: ROUTES.STUDENT_DASHBOARD,
        activePages: ["dashboard.html"],
    },
    {
        label: "Exams",
        icon: "bi-journal-code",
        href: ROUTES.STUDENT_EXAMS,
        activePages: ["exams.html", "take-exam.html", "exam-result.html"],
    },
    {
        label: "History",
        icon: "bi-clock-history",
        href: ROUTES.STUDENT_HISTORY,
        activePages: ["history.html"],
    },
]);

const STUDENT_ACCOUNT_LINKS = Object.freeze([
    {
        label: "Profile",
        icon: "bi-person",
        href: ROUTES.STUDENT_PROFILE,
        activePages: ["profile.html"],
    },
    {
        label: "Logout",
        icon: "bi-box-arrow-left",
        href: ROUTES.LOGIN,
        activePages: [],
        extraClass: "student-logout-link",
        action: "logout",
    },
]);

function getCurrentPageName() {
    const pathParts = window.location.pathname.split("/");
    return pathParts.pop() || "dashboard.html";
}

function createStudentLinks(links, currentPage) {
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
                    class="student-side-link ${
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

/**
 * Build the student sidebar markup.
 *
 * @param {string} currentPage
 * @returns {string}
 */
export function createStudentSidebar(currentPage = getCurrentPageName()) {
    return `
        <div class="student-sidebar-content">
            <section class="student-sidebar-section">
                <p class="student-sidebar-label">
                    Student Workspace
                </p>

                <nav
                    class="student-side-nav"
                    aria-label="Student workspace navigation"
                >
                    ${createStudentLinks(STUDENT_WORKSPACE_LINKS, currentPage)}
                </nav>
            </section>

            <section class="student-sidebar-section">
                <p class="student-sidebar-label">
                    Account
                </p>

                <nav
                    class="student-side-nav"
                    aria-label="Student account navigation"
                >
                    ${createStudentLinks(STUDENT_ACCOUNT_LINKS, currentPage)}
                </nav>
            </section>
        </div>

        <div class="student-sidebar-footer">
            <span class="student-sidebar-footer-icon">
                <i class="bi bi-mortarboard"></i>
            </span>

            <div>
                <strong>Student Access</strong>
                <small>Exams and progress workspace</small>
            </div>
        </div>
    `;
}

function dispatchLogoutRequest() {
    const logoutEvent = new CustomEvent("looply:logout-requested", {
        bubbles: true,
        cancelable: true,
        detail: {
            role: "student",
            redirectUrl: ROUTES.LOGIN,
        },
    });

    const shouldContinueNavigation = document.dispatchEvent(logoutEvent);

    if (shouldContinueNavigation) {
        window.location.assign(ROUTES.LOGIN);
    }
}

/**
 * Render the student sidebar and connect its responsive controls.
 *
 * @param {{
 *   rootSelector?: string,
 *   overlaySelector?: string,
 *   toggleSelector?: string
 * }} options
 * @returns {boolean}
 */
export function renderStudentSidebar(options = {}) {
    const {
        rootSelector = "#student-sidebar-root",
        overlaySelector = "#student-sidebar-overlay",
        toggleSelector = "#student-sidebar-toggle",
    } = options;

    const sidebarRoot = document.querySelector(rootSelector);

    if (!sidebarRoot) {
        console.warn(`Student sidebar root was not found: ${rootSelector}`);
        return false;
    }

    if (sidebarRoot.dataset.sidebarInitialized === "true") {
        return true;
    }

    const sidebarOverlay = document.querySelector(overlaySelector);
    const sidebarToggle = document.querySelector(toggleSelector);

    sidebarRoot.className = "student-sidebar";
    sidebarRoot.innerHTML = createStudentSidebar();
    sidebarRoot.dataset.sidebarInitialized = "true";

    function setSidebarOpen(isOpen) {
        sidebarRoot.classList.toggle("is-open", isOpen);
        sidebarOverlay?.classList.toggle("is-visible", isOpen);
        sidebarToggle?.classList.toggle("is-active", isOpen);
        sidebarToggle?.setAttribute("aria-expanded", String(isOpen));
        document.body.classList.toggle("student-sidebar-open", isOpen);
    }

    function closeSidebar() {
        setSidebarOpen(false);
    }

    sidebarToggle?.addEventListener("click", () => {
        setSidebarOpen(!sidebarRoot.classList.contains("is-open"));
    });

    sidebarOverlay?.addEventListener("click", closeSidebar);

    sidebarRoot.addEventListener("click", (event) => {
        const clickedLink = event.target.closest(".student-side-link");

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

function initializeStudentSidebar() {
    renderStudentSidebar();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeStudentSidebar, {
        once: true,
    });
} else {
    initializeStudentSidebar();
}
