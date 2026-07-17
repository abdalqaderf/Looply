/**
 * Convert any value to trimmed text.
 *
 * @param {unknown} value - Value to normalize.
 * @returns {string} Trimmed text, or an empty string for null/undefined.
 */
export function normalizeText(value) {
    return String(value ?? "").trim();
}

/**
 * Generate a reasonably unique identifier for local application records.
 *
 * @param {string} [prefix="id"] - Identifier prefix, such as user or exam.
 * @returns {string} Generated identifier.
 */
export function generateId(prefix = "id") {
    const normalizedPrefix = normalizeText(prefix)
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "id";

    const randomPart = globalThis.crypto?.randomUUID?.()
        ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    return `${normalizedPrefix}-${randomPart}`;
}

/**
 * Extract up to two initials from a full name.
 *
 * @param {unknown} fullName - User's full name.
 * @returns {string} Uppercase initials.
 */
export function getInitials(fullName) {
    return normalizeText(fullName)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

/**
 * Format a date for display.
 *
 * @param {string|number|Date} value - Date-compatible value.
 * @param {string} [locale="ar-JO"] - Intl locale.
 * @returns {string} Formatted date, or "Invalid date" for invalid input.
 */
export function formatDate(value, locale = "ar-JO") {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric"
    }).format(date);
}

/**
 * Format a date and time for display.
 *
 * @param {string|number|Date} value - Date-compatible value.
 * @param {string} [locale="ar-JO"] - Intl locale.
 * @returns {string} Formatted date and time, or "Invalid date".
 */
export function formatDateTime(value, locale = "ar-JO") {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Invalid date";
    }

    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

/**
 * Calculate a rounded percentage.
 *
 * @param {number|string} value - Obtained value.
 * @param {number|string} total - Maximum value.
 * @returns {number} Rounded percentage, or 0 when the input is invalid.
 */
export function calculatePercentage(value, total) {
    const numericValue = Number(value);
    const numericTotal = Number(total);

    if (
        !Number.isFinite(numericValue)
        || !Number.isFinite(numericTotal)
        || numericTotal <= 0
    ) {
        return 0;
    }

    return Math.round((numericValue / numericTotal) * 100);
}

/**
 * Read one value from a URL query string.
 *
 * Example: exam-result.html?attemptId=attempt-1
 * getQueryParam("attemptId") returns "attempt-1".
 *
 * @param {string} name - Query parameter name.
 * @param {string} [search] - Optional query string, useful for testing.
 * @returns {string|null} Parameter value, or null when it does not exist.
 */
export function getQueryParam(
    name,
    search = globalThis.location?.search ?? ""
) {
    const normalizedName = normalizeText(name);

    if (!normalizedName) {
        return null;
    }

    return new URLSearchParams(search).get(normalizedName);
}