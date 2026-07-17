/**
 * js/core/alerts.js
 * Cycle 2 - Belal's Task (SweetAlert2 Production Implementation)
 * Provides premium, unified, promise-based overlays, confirmation prompts,
 * and sliding toast alerts using SweetAlert2 tailored to Looply's aesthetic.
 */

let sweetAlertLoaded = null;

function loadDependencies() {
    if (sweetAlertLoaded) return sweetAlertLoaded;

    sweetAlertLoaded = new Promise((resolve, reject) => {
        if (window.Swal) {
            injectCustomStyles();
            resolve(window.Swal);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
        script.async = true;

        script.onload = () => {
            injectCustomStyles();
            resolve(window.Swal);
        };

        script.onerror = () => {
            sweetAlertLoaded = null; // Reset on failure
            reject(new Error("Failed to load SweetAlert2 libraries. Please verify network access."));
        };

        document.head.appendChild(script);
    });

    return sweetAlertLoaded;
}

function injectCustomStyles() {
    if (document.getElementById("looply-swal-styles")) return;

    const styles = document.createElement("style");
    styles.id = "looply-swal-styles";
    styles.textContent = `
        /* Main dialogue card override */
        .looply-swal-popup {
            background: linear-gradient(145deg, rgba(178, 135, 255, 0.04), transparent 48%), #140422 !important;
            border: 1px solid rgba(178, 135, 255, 0.2) !important;
            border-radius: var(--radius-lg, 16px) !important;
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.65), 0 0 30px rgba(178, 135, 255, 0.05) !important;
            padding: 2.25rem 2rem !important;
        }

        /* Dialog titles mapped to Karantina typography */
        .looply-swal-title {
            font-family: var(--font-title, "Karantina"), sans-serif !important;
            font-size: 2.5rem !important;
            font-weight: 700 !important;
            color: var(--text, #f5f1ff) !important;
            letter-spacing: 0.02em !important;
            padding-top: 1rem !important;
        }

        /* Body and HTML text mapped to standard mono font */
        .looply-swal-html {
            font-family: var(--font-main, "IBM Plex Mono"), monospace !important;
            font-size: 0.85rem !important;
            line-height: 1.6 !important;
            color: var(--sec-text, #a99dc2) !important;
        }

        /* Integration with teammate's button styles */
        .looply-swal-confirm-btn {
            background: linear-gradient(135deg, var(--primary, #f17522), var(--primary-dark, #c9570d)) !important;
            color: #fff !important;
            border: none !important;
            border-radius: var(--radius-md, 10px) !important;
            padding: 0.75rem 1.75rem !important;
            font-family: var(--font-main, "IBM Plex Mono"), monospace !important;
            font-size: 0.85rem !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            box-shadow: 0 4px 12px rgba(241, 117, 34, 0.2) !important;
            transition: all 0.2s ease !important;
        }

        .looply-swal-confirm-btn:hover {
            transform: translateY(-1px) !important;
            box-shadow: 0 6px 16px rgba(241, 117, 34, 0.35) !important;
        }

        .looply-swal-cancel-btn {
            background: transparent !important;
            color: var(--sec-text, #a99dc2) !important;
            border: 1px solid var(--border, rgba(178, 135, 255, 0.2)) !important;
            border-radius: var(--radius-md, 10px) !important;
            padding: 0.75rem 1.75rem !important;
            font-family: var(--font-main, "IBM Plex Mono"), monospace !important;
            font-size: 0.85rem !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            margin-right: 0.5rem !important;
            transition: all 0.2s ease !important;
        }

        .looply-swal-cancel-btn:hover {
            color: var(--text, #f5f1ff) !important;
            border-color: var(--border-hover, rgba(178, 135, 255, 0.55)) !important;
            background: rgba(178, 135, 255, 0.05) !important;
        }

        /* Styled sliding toast alerts in the top-right corner */
        .looply-swal-toast {
            background: #140422 !important;
            border: 1px solid rgba(178, 135, 255, 0.25) !important;
            border-radius: var(--radius-md, 12px) !important;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5) !important;
        }

        .looply-swal-toast-title {
            font-family: var(--font-main, "IBM Plex Mono"), monospace !important;
            font-size: 0.85rem !important;
            font-weight: 500 !important;
            color: var(--text, #f5f1ff) !important;
        }
    `;
    document.head.appendChild(styles);
}

export async function showAlert(title, message, type = "info") {
    const swal = await loadDependencies();

    return swal.fire({
        title: title,
        text: message,
        icon: type,
        buttonsStyling: false,
        customClass: {
            popup: "looply-swal-popup",
            title: "looply-swal-title",
            htmlContainer: "looply-swal-html",
            confirmButton: "looply-swal-confirm-btn"
        },
        background: "#140422"
    });
}

export async function showConfirm(title, message, confirmText = "Confirm", cancelText = "Cancel") {
    const swal = await loadDependencies();

    const result = await swal.fire({
        title: title,
        text: message,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: confirmText,
        cancelButtonText: cancelText,
        buttonsStyling: false,
        customClass: {
            popup: "looply-swal-popup",
            title: "looply-swal-title",
            htmlContainer: "looply-swal-html",
            confirmButton: "looply-swal-confirm-btn",
            cancelButton: "looply-swal-cancel-btn"
        },
        background: "#140422"
    });

    return !!result.isConfirmed;
}

export async function showToast(message, type = "success", duration = 3500) {
    const swal = await loadDependencies();

    const toastMixin = swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: duration,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener("mouseenter", swal.stopTimer);
            toast.addEventListener("mouseleave", swal.resumeTimer);
        }
    });

    toastMixin.fire({
        title: message,
        icon: type,
        customClass: {
            popup: "looply-swal-toast",
            title: "looply-swal-toast-title"
        },
        background: "#140422"
    });
}
