
/**
 * Shared DOM helper functions.
 *
 * Keep these helpers generic. Page-specific rendering belongs in each page's
 * JavaScript file, not in this module.
 */

/**
 * Ensure that a value can be used as a query parent.
 *
 * @param {Document|Element} parent - DOM query parent.
 * @param {string} methodName - Required query method.
 */
function assertQueryParent(parent, methodName) {
    if (!parent || typeof parent[methodName] !== "function") {
        throw new TypeError(`Parent must support ${methodName}().`);
    }
}

/**
 * Find a required element.
 *
 * @param {string} selector - CSS selector.
 * @param {Document|Element} [parent=document] - Query parent.
 * @returns {Element} Matching element.
 * @throws {Error} When no matching element exists.
 */
export function getElement(selector, parent = document) {
    assertQueryParent(parent, "querySelector");

    const element = parent.querySelector(selector);

    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    return element;
}

/**
 * Find an optional element.
 *
 * @param {string} selector - CSS selector.
 * @param {Document|Element} [parent=document] - Query parent.
 * @returns {Element|null} Matching element, or null.
 */
export function getOptionalElement(selector, parent = document) {
    assertQueryParent(parent, "querySelector");
    return parent.querySelector(selector);
}

/**
 * Find all elements matching a selector.
 *
 * @param {string} selector - CSS selector.
 * @param {Document|Element} [parent=document] - Query parent.
 * @returns {Element[]} Array of matching elements.
 */
export function getElements(selector, parent = document) {
    assertQueryParent(parent, "querySelectorAll");
    return [...parent.querySelectorAll(selector)];
}

/**
 * Set an element's text safely.
 *
 * @param {Element} element - Target element.
 * @param {unknown} value - Text value.
 */
export function setText(element, value) {
    element.textContent = String(value ?? "");
}

/**
 * Remove all child nodes from an element.
 *
 * @param {Element} element - Target element.
 */
export function clearElement(element) {
    element.replaceChildren();
}

/**
 * Show an element by removing the hidden state.
 *
 * @param {HTMLElement} element - Target element.
 */
export function showElement(element) {
    element.hidden = false;
}

/**
 * Hide an element using the native hidden attribute.
 *
 * @param {HTMLElement} element - Target element.
 */
export function hideElement(element) {
    element.hidden = true;
}

/**
 * Enable or disable a form control or button.
 *
 * @param {HTMLButtonElement|HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement} element
 * @param {boolean} [disabled=true] - Desired disabled state.
 */
export function setDisabled(element, disabled = true) {
    element.disabled = Boolean(disabled);
}

/**
 * Create an element without using innerHTML.
 *
 * @param {string} tagName - HTML tag name.
 * @param {object} [options] - Initial element options.
 * @param {string} [options.id] - Element id.
 * @param {string} [options.className] - CSS class string.
 * @param {unknown} [options.text] - Safe text content.
 * @param {Record<string, unknown>} [options.attributes] - HTML attributes.
 * @param {Record<string, unknown>} [options.dataset] - data-* values.
 * @returns {HTMLElement} Created element.
 */
export function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.id) {
        element.id = String(options.id);
    }

    if (options.className) {
        element.className = String(options.className);
    }

    if (options.text !== undefined) {
        setText(element, options.text);
    }

    if (options.attributes) {
        Object.entries(options.attributes).forEach(([name, value]) => {
            if (value !== undefined && value !== null) {
                element.setAttribute(name, String(value));
            }
        });
    }

    if (options.dataset) {
        Object.entries(options.dataset).forEach(([name, value]) => {
            if (value !== undefined && value !== null) {
                element.dataset[name] = String(value);
            }
        });
    }

    return element;
}
