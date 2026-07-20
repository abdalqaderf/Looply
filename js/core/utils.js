export function normalizeText(value) {
  return String(value ?? "").trim();
}

export function generateId(prefix = "id") {
  const normalizedPrefix =
    normalizeText(prefix)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "id";

  const randomPart =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${normalizedPrefix}-${randomPart}`;
}

export function getInitials(fullName) {
  return normalizeText(fullName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function formatDate(value, locale = "ar-JO") {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

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
    minute: "2-digit",
  }).format(date);
}

export function calculatePercentage(value, total) {
  const numericValue = Number(value);
  const numericTotal = Number(total);

  if (
    !Number.isFinite(numericValue) ||
    !Number.isFinite(numericTotal) ||
    numericTotal <= 0
  ) {
    return 0;
  }

  return Math.round((numericValue / numericTotal) * 100);
}

export function getQueryParam(
  name,
  search = globalThis.location?.search ?? "",
) {
  const normalizedName = normalizeText(name);

  if (!normalizedName) {
    return null;
  }

  return new URLSearchParams(search).get(normalizedName);
}
