const ALERT_CLASSES = Object.freeze({
  popup: "looply-alert",
  title: "looply-alert__title",
  htmlContainer: "looply-alert__text",
  actions: "looply-alert__actions",

  cancelButton: "looply-alert__button looply-alert__button--cancel",

  icon: "looply-alert__icon",
});

const TOAST_CLASSES = Object.freeze({
  popup: "looply-toast",
  title: "looply-toast__title",
  icon: "looply-toast__icon",
});

const ICON_COLORS = Object.freeze({
  success: "#34d399",
  error: "#fb7185",
  warning: "#fbbf24",
  info: "#60a5fa",
  question: "#b287ff",
});

function getSweetAlert() {
  return window.Swal ?? null;
}

function getFallbackMessage(options = {}) {
  return [options.title, options.text].filter(Boolean).join("\n\n");
}

async function fireFallback(options = {}) {
  const message =
    getFallbackMessage(options) || "Looply requires your attention.";

  if (options.showCancelButton) {
    return {
      isConfirmed: window.confirm(message),
      isDismissed: false,
    };
  }

  if (options.showConfirmButton !== false) {
    window.alert(message);
  }

  return {
    isConfirmed: true,
    isDismissed: false,
  };
}

function fireAlert(options = {}) {
  const Swal = getSweetAlert();

  if (!Swal) {
    return fireFallback(options);
  }

  const { customClass = {}, buttonVariant = "info", ...alertOptions } = options;

  const confirmButtonClass =
    BUTTON_CLASSES[buttonVariant] ?? BUTTON_CLASSES.info;

  return Swal.fire({
    background: "var(--box)",
    color: "var(--text)",
    buttonsStyling: false,
    heightAuto: false,
    scrollbarPadding: false,

    ...alertOptions,

    customClass: {
      ...ALERT_CLASSES,

      confirmButton: confirmButtonClass,

      ...customClass,
    },
  });
}

function showToast(icon, message, options = {}) {
  const Swal = getSweetAlert();

  if (!Swal) {
    return Promise.resolve({
      isConfirmed: true,
      isDismissed: false,
    });
  }

  return Swal.fire({
    toast: true,
    position: options.position ?? "bottom",
    icon,
    iconColor: options.iconColor ?? ICON_COLORS[icon],
    title: message,
    background: "var(--box)",
    color: "var(--text)",
    showConfirmButton: false,
    timer: options.timer ?? 2200,
    timerProgressBar: true,
    heightAuto: false,
    customClass: TOAST_CLASSES,

    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);

      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });
}

export function showSuccessToast(
  message = "Operation completed successfully.",
) {
  return showToast("success", message);
}

export function showErrorToast(message = "Something went wrong.") {
  return showToast("error", message, {
    timer: 3000,
  });
}

export function showInfoToast(message) {
  return showToast("info", message);
}

export function showWarningToast(message) {
  return showToast("warning", message, {
    timer: 3500,
  });
}

export function showSuccess(title = "Success", text = "") {
  return fireAlert({
    icon: "success",
    iconColor: ICON_COLORS.success,
    title,
    text,
    confirmButtonText: "OK",
    buttonVariant: "success",
  });
}

export function showError(title = "Error", text = "") {
  return fireAlert({
    icon: "error",
    iconColor: ICON_COLORS.error,
    title,
    text,
    confirmButtonText: "OK",
    buttonVariant: "error",
  });
}

export function showWarning(title = "Warning", text = "") {
  return fireAlert({
    icon: "warning",
    iconColor: ICON_COLORS.warning,
    title,
    text,
    confirmButtonText: "OK",
    buttonVariant: "warning",
  });
}

export function showInfo(title = "Information", text = "") {
  return fireAlert({
    icon: "info",
    iconColor: ICON_COLORS.info,
    title,
    text,
    confirmButtonText: "OK",
    buttonVariant: "info",
  });
}

export async function confirmAction(options = {}) {
  const icon = options.icon ?? "warning";

  const result = await fireAlert({
    icon,

    iconColor: options.iconColor ?? ICON_COLORS[icon],

    title: options.title ?? "Are you sure?",

    text: options.text ?? "",

    showCancelButton: true,

    confirmButtonText: options.confirmText ?? "Confirm",

    cancelButtonText: options.cancelText ?? "Cancel",

    buttonVariant: options.buttonVariant ?? icon,

    reverseButtons: true,
    focusCancel: true,
    allowOutsideClick: false,
    allowEscapeKey: true,
  });

  return result.isConfirmed;
}

export function confirmDelete(itemName = "this item") {
  return confirmAction({
    title: "Delete item?",

    text:
      `Are you sure you want to remove ${itemName}? ` +
      "The information will remain stored.",

    confirmText: "Delete",
    cancelText: "Cancel",

    icon: "error",
    buttonVariant: "error",
  });
}

export function confirmLogout() {
  return confirmAction({
    title: "Log out?",

    text: "Your current session will be closed.",

    confirmText: "Log out",
    cancelText: "Stay",

    icon: "warning",
    buttonVariant: "warning",
  });
}

export function confirmExamSubmission() {
  return confirmAction({
    title: "Submit exam?",

    text: "You cannot change your answers after submission.",

    confirmText: "Submit exam",
    cancelText: "Review answers",

    icon: "question",
    buttonVariant: "question",
  });
}

export function showLoading(title = "Please wait...", text = "") {
  const Swal = getSweetAlert();

  return fireAlert({
    title,
    text,
    showConfirmButton: false,
    allowOutsideClick: false,
    allowEscapeKey: false,

    didOpen: () => {
      Swal.showLoading();
    },
  });
}

export function closeAlert() {
  const Swal = getSweetAlert();

  if (!Swal) {
    return;
  }

  Swal.hideLoading();
  Swal.close();
}
const BUTTON_CLASSES = Object.freeze({
  success: "looply-alert__button looply-alert__button--success",

  error: "looply-alert__button looply-alert__button--error",

  warning: "looply-alert__button looply-alert__button--warning",

  info: "looply-alert__button looply-alert__button--info",

  question: "looply-alert__button looply-alert__button--question",
});
