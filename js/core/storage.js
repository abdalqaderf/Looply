import { SESSION_KEYS, STORAGE_KEYS } from "./config.js";

export class StorageCorruptionError extends Error {
  constructor(key, cause = null) {
    super(`Stored data for "${key}" is corrupted.`);
    this.name = "StorageCorruptionError";
    this.key = key;
    this.cause = cause;
  }
}

function validateStorageKey(key) {
  if (typeof key !== "string" || key.trim() === "") {
    throw new TypeError("Storage key must be a non-empty string.");
  }

  return key.trim();
}

function getBrowserStorage(type) {
  try {
    const storage =
      type === "session" ? window.sessionStorage : window.localStorage;

    const testKey = `__looply_${type}_storage_test__`;

    storage.setItem(testKey, "test");
    storage.removeItem(testKey);

    return storage;
  } catch {
    throw new Error(`${type}Storage is not available in this browser.`);
  }
}

function readValue(storage, key, fallbackValue = null) {
  const storageKey = validateStorageKey(key);

  const storedValue = storage.getItem(storageKey);

  if (storedValue === null) {
    return fallbackValue;
  }

  try {
    return JSON.parse(storedValue);
  } catch (error) {
    throw new StorageCorruptionError(storageKey, error);
  }
}

function writeValue(storage, key, value) {
  const storageKey = validateStorageKey(key);

  if (value === undefined) {
    throw new TypeError("Cannot store an undefined value.");
  }

  let serializedValue;

  try {
    serializedValue = JSON.stringify(value);
  } catch {
    throw new Error(`Unable to convert "${storageKey}" value to JSON.`);
  }

  if (serializedValue === undefined) {
    throw new TypeError(`The value for "${storageKey}" cannot be stored.`);
  }

  try {
    storage.setItem(storageKey, serializedValue);
  } catch {
    throw new Error(`Unable to save storage value for "${storageKey}".`);
  }

  return value;
}

function removeValue(storage, key) {
  const storageKey = validateStorageKey(key);

  const existed = storage.getItem(storageKey) !== null;

  storage.removeItem(storageKey);

  return existed;
}

export function readStorage(key, fallbackValue = null) {
  return readValue(getBrowserStorage("local"), key, fallbackValue);
}

export function writeStorage(key, value) {
  return writeValue(getBrowserStorage("local"), key, value);
}

export function removeStorage(key) {
  return removeValue(getBrowserStorage("local"), key);
}

export function hasStorage(key) {
  const storageKey = validateStorageKey(key);

  return getBrowserStorage("local").getItem(storageKey) !== null;
}

export function clearAppStorage() {
  const storage = getBrowserStorage("local");

  const applicationKeys = [...new Set(Object.values(STORAGE_KEYS))];

  applicationKeys.forEach((key) => {
    storage.removeItem(key);
  });
}

export function readSession(key, fallbackValue = null) {
  return readValue(getBrowserStorage("session"), key, fallbackValue);
}

export function writeSession(key, value) {
  return writeValue(getBrowserStorage("session"), key, value);
}

export function removeSession(key) {
  return removeValue(getBrowserStorage("session"), key);
}

export function hasSession(key) {
  const storageKey = validateStorageKey(key);

  return getBrowserStorage("session").getItem(storageKey) !== null;
}

export function clearAppSession() {
  const storage = getBrowserStorage("session");

  const sessionKeys = [...new Set(Object.values(SESSION_KEYS))];

  sessionKeys.forEach((key) => {
    storage.removeItem(key);
  });
}
