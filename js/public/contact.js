import { showError, showSuccess } from "../core/alerts.js";

import { getFirstError, validateContactForm } from "../core/validation.js";

const contactForm = document.getElementById("contact-form");

const contactFields = Object.freeze({
  firstName: document.getElementById("first-name"),
  lastName: document.getElementById("last-name"),
  email: document.getElementById("email"),
  message: document.getElementById("message"),
});

function clearFieldErrors() {
  Object.values(contactFields).forEach((field) => {
    if (!field) {
      return;
    }

    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
  });
}

function markInvalidFields(errors = {}) {
  Object.keys(errors).forEach((fieldName) => {
    const field = contactFields[fieldName];

    field?.classList.add("is-invalid");
    field?.setAttribute("aria-invalid", "true");
  });
}

async function showValidationError(errors) {
  markInvalidFields(errors);

  const firstInvalidFieldName = Object.keys(errors)[0];

  contactFields[firstInvalidFieldName]?.focus();

  await showError("Invalid information", getFirstError(errors));
}

function getContactData() {
  return {
    firstName: contactFields.firstName?.value ?? "",
    lastName: contactFields.lastName?.value ?? "",
    email: contactFields.email?.value ?? "",
    message: contactFields.message?.value ?? "",
  };
}

async function handleContactSubmit(event) {
  event.preventDefault();
  clearFieldErrors();

  const validation = validateContactForm(getContactData());

  if (!validation.isValid) {
    await showValidationError(validation.errors);

    return;
  }

  const submitButton = contactForm.querySelector('button[type="submit"]');

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.setAttribute("aria-busy", "true");
  }

  try {
    await showSuccess(
      "Message sent",
      "Your message has been received successfully.",
    );

    contactForm.reset();
    clearFieldErrors();
  } catch (error) {
    console.error("Unable to complete the contact form submission.", error);
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.setAttribute("aria-busy", "false");
    }
  }
}

function initializeContactPage() {
  if (!contactForm) {
    console.error("Contact form was not found.");

    return;
  }

  contactForm.noValidate = true;

  const missingField = Object.entries(contactFields).find(
    ([, field]) => !field,
  );

  if (missingField) {
    console.error(`Contact field was not found: ${missingField[0]}`);

    return;
  }

  contactForm.addEventListener("submit", handleContactSubmit);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeContactPage, {
    once: true,
  });
} else {
  initializeContactPage();
}
