import {
  getRoleHomeRoute,
  login,
  redirectAuthenticatedUser,
} from "../core/auth.js";

import { initPublicPage } from "../core/app.js";

import { showError, showSuccessToast } from "../core/alerts.js";

import { getFirstError, validateLoginForm } from "../core/validation.js";

const LOGIN_FORM_SELECTOR = "#login-form";

function setLoginMessage(messageElement, message = "") {
  if (!messageElement) {
    return;
  }

  messageElement.textContent = message;
  messageElement.hidden = message === "";
}

function setFieldValidity(field, isValid) {
  if (!field) {
    return;
  }

  field.setAttribute("aria-invalid", String(!isValid));

  field.classList.toggle("is-invalid", !isValid);
}

function setSubmittingState(button, isSubmitting) {
  if (!button) {
    return;
  }

  button.disabled = isSubmitting;
  button.setAttribute("aria-busy", String(isSubmitting));

  const textNode = [...button.childNodes].find(
    (node) => node.nodeType === Node.TEXT_NODE,
  );

  if (textNode) {
    textNode.textContent = isSubmitting ? " Signing in " : " Login ";
  }
}

function initializePasswordToggle(form) {
  const passwordInput = form.querySelector("#password");
  const toggleButton = form.querySelector(".password-toggle");
  const icon = toggleButton?.querySelector("i");

  if (!passwordInput || !toggleButton) {
    return;
  }

  toggleButton.addEventListener("click", () => {
    const passwordIsVisible = passwordInput.type === "text";

    passwordInput.type = passwordIsVisible ? "password" : "text";

    toggleButton.setAttribute(
      "aria-label",
      passwordIsVisible ? "Show password" : "Hide password",
    );

    icon?.classList.toggle("bi-eye", passwordIsVisible);

    icon?.classList.toggle("bi-eye-slash", !passwordIsVisible);
  });
}

async function displayLoginError(messageElement, message) {
  setLoginMessage(messageElement, message);

  await showError("Unable to log in", message);
}

function redirectToDashboard(user) {
  window.location.replace(getRoleHomeRoute(user.role));
}

function initializeLoginPage() {
  initPublicPage({
    redirectAuthenticated: false,
  });

  if (redirectAuthenticatedUser()) {
    return;
  }

  const form = document.querySelector(LOGIN_FORM_SELECTOR);

  if (!form) {
    console.warn(`Login form was not found: ${LOGIN_FORM_SELECTOR}`);
    return;
  }

  const usernameInput = form.querySelector("#username");
  const passwordInput = form.querySelector("#password");
  const messageElement = form.querySelector("#login-message");
  const submitButton = form.querySelector('[type="submit"]');
  const rememberInput = form.querySelector('[name="remember"]');

  if (rememberInput) {
    rememberInput.checked = false;
    rememberInput.disabled = true;
    rememberInput.title =
      "Looply keeps login active only for the current browser tab.";
  }

  initializePasswordToggle(form);
  setLoginMessage(messageElement);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const credentials = {
      username: usernameInput?.value ?? "",
      password: passwordInput?.value ?? "",
    };

    const validation = validateLoginForm(credentials);

    setFieldValidity(usernameInput, !validation.errors.username);

    setFieldValidity(passwordInput, !validation.errors.password);

    if (!validation.isValid) {
      const message = getFirstError(validation.errors);

      await displayLoginError(messageElement, message);

      if (validation.errors.username) {
        usernameInput?.focus();
      } else {
        passwordInput?.focus();
      }

      return;
    }

    setSubmittingState(submitButton, true);

    setLoginMessage(messageElement);

    try {
      const user = login(credentials.username, credentials.password);

      showSuccessToast(`Welcome back, ${user.fullName}.`);

      await new Promise((resolve) => {
        window.setTimeout(resolve, 650);
      });

      redirectToDashboard(user);
    } catch (error) {
      setSubmittingState(submitButton, false);
      await displayLoginError(
        messageElement,
        error.message || "Invalid username or password.",
      );

      passwordInput?.select();
    } finally {
      setSubmittingState(submitButton, false);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeLoginPage, {
    once: true,
  });
} else {
  initializeLoginPage();
}
