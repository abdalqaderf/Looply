import { USER_ROLES } from "../core/config.js";
import { requireRole } from "../core/auth.js";
import {
    getElements,
    getOptionalElement,
    setText
} from "../core/dom.js";
import { showErrorToast } from "../core/alerts.js";
import {
    getInitials,
    normalizeText
} from "../core/utils.js";

function getProfileElements() {
    const elements = {
        names: getElements("[data-profile-name]"),
        usernames: getElements("[data-profile-username]"),
        roles: getElements("[data-profile-role]"),
        initials: getOptionalElement("[data-profile-initials]"),
        avatar: getOptionalElement("[data-profile-avatar]")
    };

    if (
        elements.names.length === 0 ||
        elements.usernames.length === 0 ||
        elements.roles.length === 0 ||
        !elements.initials ||
        !elements.avatar
    ) {
        throw new Error(
            "Student profile elements are missing from the page."
        );
    }

    return elements;
}

function setAllText(elements, value) {
    elements.forEach((element) => {
        setText(element, value);
    });
}

function renderStudentProfile(elements, user) {
    const fullName = normalizeText(user.fullName);
    const username = normalizeText(user.username);

    if (!fullName || !username) {
        throw new Error(
            "The current student profile is incomplete."
        );
    }

    const initials = getInitials(fullName) || "ST";

    setAllText(elements.names, fullName);
    setAllText(elements.usernames, username);
    setAllText(elements.roles, "Student");
    setText(elements.initials, initials);

    elements.avatar.setAttribute(
        "aria-label",
        `${fullName} initials`
    );
}

function renderProfileError(elements) {
    setAllText(
        elements.names,
        "Profile unavailable"
    );

    setAllText(
        elements.usernames,
        "Unable to load username"
    );

    setAllText(
        elements.roles,
        "Student"
    );

    setText(
        elements.initials,
        "--"
    );

    elements.avatar.setAttribute(
        "aria-label",
        "Student profile unavailable"
    );
}

function initializeStudentProfile() {
    const user = requireRole(
        USER_ROLES.STUDENT,
        {
            redirect: true
        }
    );

    if (!user) {
        return;
    }

    let elements = null;

    try {
        elements = getProfileElements();

        renderStudentProfile(
            elements,
            user
        );
    } catch (error) {
        console.error(
            "Unable to load the student profile.",
            error
        );

        if (elements) {
            renderProfileError(elements);
        }

        try {
            showErrorToast(
                "Unable to load your profile."
            );
        } catch (alertError) {
            console.error(
                "Unable to display the profile error alert.",
                alertError
            );
        }
    }
}

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeStudentProfile,
        {
            once: true
        }
    );
} else {
    initializeStudentProfile();
}