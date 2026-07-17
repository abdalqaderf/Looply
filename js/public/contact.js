// js/public/contact.js

import {
    showError,
    showSuccess
} from "../core/alerts.js";

const contactForm =
    document.getElementById("contact-form");

const firstNameInput =
    document.getElementById("first-name");

const lastNameInput =
    document.getElementById("last-name");

const emailInput =
    document.getElementById("email");

const messageInput =
    document.getElementById("message");

/**
 * التحقق من صيغة البريد الإلكتروني.
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}

/**
 * إزالة حالات الخطأ من جميع الحقول.
 */
function clearFieldErrors() {
    const fields = [
        firstNameInput,
        lastNameInput,
        emailInput,
        messageInput
    ];

    fields.forEach((field) => {
        if (!field) {
            return;
        }

        field.classList.remove(
            "is-invalid"
        );

        field.removeAttribute(
            "aria-invalid"
        );
    });
}

/**
 * تحديد حقل غير صالح وعرض التنبيه.
 *
 * @param {HTMLElement} field
 * @param {string} message
 */
async function showFieldError(
    field,
    message
) {
    if (field) {
        field.classList.add(
            "is-invalid"
        );

        field.setAttribute(
            "aria-invalid",
            "true"
        );

        field.focus();
    }

    await showError(
        "Invalid information",
        message
    );
}

/**
 * قراءة بيانات النموذج.
 */
function getContactData() {
    return {
        firstName:
            firstNameInput?.value.trim() ??
            "",

        lastName:
            lastNameInput?.value.trim() ??
            "",

        email:
            emailInput?.value.trim() ??
            "",

        message:
            messageInput?.value.trim() ??
            ""
    };
}

/**
 * معالجة إرسال النموذج.
 *
 * @param {SubmitEvent} event
 */
async function handleContactSubmit(event) {
    event.preventDefault();

    clearFieldErrors();

    const contactData =
        getContactData();

    if (!contactData.firstName) {
        await showFieldError(
            firstNameInput,
            "First name is required."
        );

        return;
    }

    if (
        contactData.firstName.length < 2
    ) {
        await showFieldError(
            firstNameInput,
            "First name must contain at least 2 characters."
        );

        return;
    }

    if (!contactData.lastName) {
        await showFieldError(
            lastNameInput,
            "Last name is required."
        );

        return;
    }

    if (
        contactData.lastName.length < 2
    ) {
        await showFieldError(
            lastNameInput,
            "Last name must contain at least 2 characters."
        );

        return;
    }

    if (!contactData.email) {
        await showFieldError(
            emailInput,
            "Email is required."
        );

        return;
    }

    if (
        !isValidEmail(
            contactData.email
        )
    ) {
        await showFieldError(
            emailInput,
            "Enter a valid email address."
        );

        return;
    }

    if (!contactData.message) {
        await showFieldError(
            messageInput,
            "Message is required."
        );

        return;
    }

    if (
        contactData.message.length < 10
    ) {
        await showFieldError(
            messageInput,
            "Message must contain at least 10 characters."
        );

        return;
    }

    const submitButton =
        contactForm.querySelector(
            'button[type="submit"]'
        );

    if (submitButton) {
        submitButton.disabled = true;
    }

    try {
        await showSuccess(
            "Message sent successfully!",
            "Thank you for contacting us. We will respond as soon as possible."
        );

        contactForm.reset();
        clearFieldErrors();
    } catch (error) {
        console.error(
            "Unable to show contact success message:",
            error
        );
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

/**
 * تشغيل صفحة Contact.
 */
function initializeContactPage() {
    if (!contactForm) {
        console.error(
            'Contact form with id "contact-form" was not found.'
        );

        return;
    }

    if (
        !firstNameInput ||
        !lastNameInput ||
        !emailInput ||
        !messageInput
    ) {
        console.error(
            "One or more contact form fields were not found."
        );

        return;
    }

    contactForm.addEventListener(
        "submit",
        handleContactSubmit
    );
}

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeContactPage,
        {
            once: true
        }
    );
} else {
    initializeContactPage();
}