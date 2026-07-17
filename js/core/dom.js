/*Docuemnt Object Model related functions/methods*/

function assertQueryParent(parent, methodName) {
    if (!parent || typeof parent[methodName] !== "function") {
        throw new TypeError(`Parent must support ${methodName}().`);
    }
}

export function getElement(selector, parent = document) {
    assertQueryParent(parent, "querySelector");

    const element = parent.querySelector(selector);

    if (!element) {
        throw new Error(`Element not found: ${selector}`);
    }

    return element;
}

export function getOptionalElement(selector, parent = document) {
    assertQueryParent(parent, "querySelector");
    return parent.querySelector(selector);
}

export function getElements(selector, parent = document) {
    assertQueryParent(parent, "querySelectorAll");
    return [...parent.querySelectorAll(selector)];
}

export function setText(element, value) {
    element.textContent = String(value ?? "");
}

export function clearElement(element) {
    element.replaceChildren();
}

export function showElement(element) {
    element.hidden = false;
}

export function hideElement(element) {
    element.hidden = true;
}

export function setDisabled(element, disabled = true) {
    element.disabled = Boolean(disabled);
}

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
