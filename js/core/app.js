import {
    ROUTES,
    USER_ROLES
} from "./config.js";

import { seedInitialData } from "./seed.js";

import {
    getCurrentUser,
    logout,
    redirectAuthenticatedUser,
    requireRole
} from "./auth.js";

import {
    confirmLogout,
    showError,
    showSuccessToast
} from "./alerts.js";

let seedWasChecked = false;
let logoutIsInProgress = false;

/**
 * Initialize the demo data once during the current page load.
 *
 * @returns {object|null}
 */
export function initializeSeedData() {
    if (seedWasChecked) {
        return null;
    }

    seedWasChecked = true;

    try {
        return seedInitialData();
    } catch (error) {
        console.error("Unable to initialize Looply data.", error);
        return null;
    }
}

/**
 * Ask the user to confirm logging out.
 * SweetAlert2 is preferred, with a native confirmation as a fallback.
 *
 * @returns {Promise<boolean>}
 */
async function requestLogoutConfirmation() {
    if (window.Swal) {
        return confirmLogout();
    }

    return window.confirm("Log out of Looply?");
}

/**
 * Complete logout and redirect to the login page.
 *
 * @param {string} redirectUrl
 */
async function completeLogout(redirectUrl) {
    logout();

    if (window.Swal) {
        showSuccessToast("You have been logged out.");

        await new Promise((resolve) => {
            window.setTimeout(resolve, 550);
        });
    }

    window.location.replace(redirectUrl);
}

/**
 * Handle logout requests dispatched by the student and teacher sidebars.
 * Calling preventDefault synchronously stops the sidebar from navigating
 * before the asynchronous confirmation has finished.
 *
 * @param {CustomEvent} event
 */
async function handleLogoutRequest(event) {
    event.preventDefault();

    if (logoutIsInProgress) {
        return;
    }

    logoutIsInProgress = true;

    try {
        const confirmed = await requestLogoutConfirmation();

        if (!confirmed) {
            return;
        }

        const redirectUrl =
            event.detail?.redirectUrl ?? ROUTES.LOGIN;

        await completeLogout(redirectUrl);
    } catch (error) {
        console.error("Unable to log out.", error);

        if (window.Swal) {
            await showError(
                "Logout failed",
                "The session could not be closed. Please try again."
            );
        }
    } finally {
        logoutIsInProgress = false;
    }
}

/**
 * Install the shared logout event listener once.
 *
 * @returns {boolean}
 */
export function installLogoutHandler() {
    const root = document.documentElement;

    if (root.dataset.looplyLogoutHandler === "true") {
        return false;
    }

    document.addEventListener(
        "looply:logout-requested",
        handleLogoutRequest
    );

    root.dataset.looplyLogoutHandler = "true";
    return true;
}

/**
 * Initialize a public page.
 *
 * @param {{ redirectAuthenticated?: boolean }} options
 * @returns {object|null}
 */
export function initPublicPage(options = {}) {
    const {
        redirectAuthenticated = false
    } = options;

    initializeSeedData();
    installLogoutHandler();

    if (
        redirectAuthenticated &&
        redirectAuthenticatedUser()
    ) {
        return null;
    }

    return getCurrentUser();
}

/**
 * Initialize a protected student page and render its shared layout.
 *
 * @returns {Promise<object|null>}
 */
export async function initStudentPage() {
    initializeSeedData();
    installLogoutHandler();

    const user = requireRole(
        USER_ROLES.STUDENT,
        { redirect: true }
    );

    if (!user) {
        return null;
    }

    const [topbarModule, sidebarModule] = await Promise.all([
        import("../components/student-topbar.js"),
        import("../components/student-sidebar.js")
    ]);

    topbarModule.renderStudentTopbar(user);
    sidebarModule.renderStudentSidebar();

    return user;
}

/**
 * Initialize a protected teacher page and render its shared layout.
 *
 * @returns {Promise<object|null>}
 */
export async function initTeacherPage() {
    initializeSeedData();
    installLogoutHandler();

    const user = requireRole(
        USER_ROLES.TEACHER,
        { redirect: true }
    );

    if (!user) {
        return null;
    }

    const [topbarModule, sidebarModule] = await Promise.all([
        import("../components/teacher-topbar.js"),
        import("../components/teacher-sidebar.js")
    ]);

    topbarModule.renderTeacherTopbar(user);
    sidebarModule.renderTeacherSidebar();

    return user;
}

/**
 * Detect the current page type from its body class or URL.
 *
 * @returns {"student" | "teacher" | "public"}
 */
function detectPageType() {
    const path = window.location.pathname.toLowerCase();

    if (
        document.body.classList.contains("student-page") ||
        path.includes("/student/")
    ) {
        return "student";
    }

    if (
        document.body.classList.contains("teacher-page") ||
        path.includes("/teacher/")
    ) {
        return "teacher";
    }

    return "public";
}

/**
 * Initialize Looply based on the current page type.
 *
 * @returns {Promise<object|null>}
 */
export async function initializeApp() {
    const root = document.documentElement;

    if (root.dataset.looplyAppInitialized === "true") {
        return getCurrentUser();
    }

    root.dataset.looplyAppInitialized = "true";

    const pageType = detectPageType();

    if (pageType === "student") {
        return initStudentPage();
    }

    if (pageType === "teacher") {
        return initTeacherPage();
    }

    return initPublicPage();
}

function startApplication() {
    initializeApp().catch((error) => {
        console.error("Unable to initialize Looply.", error);
    });
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        startApplication,
        { once: true }
    );
} else {
    startApplication();
}

