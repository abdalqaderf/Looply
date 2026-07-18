import { USER_ROLES } from "../core/config.js";

import { requireRole } from "../core/auth.js";

import {
    clearElement,
    createElement,
    getElement,
    getOptionalElement,
    setDisabled,
    setText,
} from "../core/dom.js";

import {
    confirmDelete,
    showError,
    showErrorToast,
    showSuccessToast,
} from "../core/alerts.js";

import { getFirstError, validateStudentForm } from "../core/validation.js";

import { getInitials, normalizeText } from "../core/utils.js";

import {
    createStudent,
    getActiveStudents,
    softDeleteStudent,
    updateStudent,
} from "../services/users-service.js";

const FILTERS = Object.freeze([
    {
        value: "all",
        label: "All",
    },
    {
        value: "male",
        label: "Male",
    },
    {
        value: "female",
        label: "Female",
    },
]);

let students = [];
let editingStudentId = null;
let filterIndex = 0;

function node(tag, options = {}, children = []) {
    const element = createElement(tag, options);

    element.append(...children);

    return element;
}

function icon(name) {
    return node("i", {
        className: `bi ${name}`,

        attributes: {
            "aria-hidden": "true",
        },
    });
}

function getElements() {
    return {
        badge: getElement("#total-students-badge"),

        search: getElement("#student-search"),

        filterButton: getElement("#student-filter-button"),

        filterLabel: getElement("#student-filter-label"),

        tableBody: getElement("#students-table-body"),

        summary: getElement("#students-summary"),

        addButton: getElement("#add-student-button"),

        modal: getElement("#addStudentModal"),

        modalTitle: getElement("#addStudentModalTitle"),

        form: getElement("#student-form"),

        saveButton: getElement("#save-student-button"),

        passwordToggle: getElement("#student-password-toggle"),

        fields: {
            fullName: getElement("#student-full-name"),

            gender: getElement("#student-gender"),

            nationalId: getElement("#student-national-id"),

            phone: getElement("#student-phone"),

            username: getElement("#student-username"),

            password: getElement("#student-password"),
        },
    };
}

function modalInstance(element) {
    const Modal = window.bootstrap?.Modal;

    if (!Modal) {
        throw new Error("Bootstrap Modal is not available.");
    }

    return Modal.getOrCreateInstance(element);
}

function titleCase(value) {
    const text = normalizeText(value).toLowerCase();

    return text ? text.charAt(0).toUpperCase() + text.slice(1) : "—";
}

function actionButton(action, student, iconName) {
    const isDelete = action === "delete";

    const label = `${isDelete ? "Delete" : "Edit"} ${student.fullName}`;

    return node(
        "button",
        {
            className: `table-action-btn${isDelete ? " delete-action" : ""}`,

            attributes: {
                type: "button",
                title: label,
                "aria-label": label,
            },

            dataset: {
                action,
                studentId: student.id,
            },
        },
        [icon(iconName)]
    );
}

function studentRow(student) {
    const identity = node(
        "div",
        {
            className: "student-identity",
        },
        [
            node("span", {
                className: "student-avatar",

                text: getInitials(student.fullName) || "ST",

                attributes: {
                    "aria-hidden": "true",
                },
            }),

            node("div", {}, [
                node("strong", {
                    text: student.fullName || "Unnamed student",
                }),

                node("small", {
                    text: "Student account",
                }),
            ]),
        ]
    );

    const actions = node(
        "div",
        {
            className: "student-actions",
        },
        [
            actionButton("edit", student, "bi-pencil"),

            actionButton("delete", student, "bi-trash3"),
        ]
    );

    return node("tr", {}, [
        node("td", {}, [identity]),

        node("td", {
            text: student.username || "—",
        }),

        node("td", {
            text: student.nationalId || "—",
        }),

        node("td", {
            text: student.phone || "—",
        }),

        node("td", {}, [
            node("span", {
                className: "gender-badge",

                text: titleCase(student.gender),
            }),
        ]),

        node("td", {}, [actions]),
    ]);
}

function emptyRow(message) {
    return node("tr", {}, [
        node("td", {
            className: "dashboard-muted-value",

            text: message,

            attributes: {
                colspan: "6",
            },
        }),
    ]);
}

function filteredStudents(elements) {
    const query = normalizeText(elements.search.value).toLowerCase();

    const gender = FILTERS[filterIndex].value;

    return students.filter((student) => {
        const matchesGender =
            gender === "all" ||
            normalizeText(student.gender).toLowerCase() === gender;

        if (!matchesGender) {
            return false;
        }

        if (!query) {
            return true;
        }

        return [
            student.fullName,
            student.username,
            student.nationalId,
            student.phone,
        ]
            .map((value) => normalizeText(value).toLowerCase())
            .join(" ")
            .includes(query);
    });
}

function updateFilterButton(elements) {
    const filter = FILTERS[filterIndex];

    setText(elements.filterLabel, filter.label);

    elements.filterButton.setAttribute(
        "aria-label",
        `Gender filter: ${filter.label}`
    );
}

function renderStudents(elements) {
    const visible = filteredStudents(elements);

    const total = students.length;

    setText(elements.badge, `${total} ${total === 1 ? "student" : "students"}`);

    setText(
        elements.summary,
        `Showing ${visible.length} of ${total} active ${
            total === 1 ? "student" : "students"
        }`
    );

    clearElement(elements.tableBody);

    if (visible.length === 0) {
        const hasFilter =
            normalizeText(elements.search.value) !== "" ||
            FILTERS[filterIndex].value !== "all";

        elements.tableBody.append(
            emptyRow(
                hasFilter
                    ? "No students match the current search or filter."
                    : "No active students are registered yet."
            )
        );

        return;
    }

    visible.forEach((student) => {
        elements.tableBody.append(studentRow(student));
    });
}

function reloadStudents(elements) {
    students = getActiveStudents();

    renderStudents(elements);
}

function formData(elements) {
    return Object.fromEntries(
        Object.entries(elements.fields).map(([name, field]) => [
            name,
            field.value,
        ])
    );
}

function clearErrors(elements) {
    Object.values(elements.fields).forEach((field) => {
        field.classList.remove("is-invalid");

        field.removeAttribute("aria-invalid");
    });
}

function markErrors(elements, errors) {
    Object.keys(errors).forEach((name) => {
        elements.fields[name]?.classList.add("is-invalid");

        elements.fields[name]?.setAttribute("aria-invalid", "true");
    });
}

function setPasswordVisible(elements, visible) {
    elements.fields.password.type = visible ? "text" : "password";

    elements.passwordToggle.setAttribute(
        "aria-label",
        visible ? "Hide password" : "Show password"
    );

    clearElement(elements.passwordToggle);

    elements.passwordToggle.append(icon(visible ? "bi-eye-slash" : "bi-eye"));
}

function setSaving(elements, saving) {
    setDisabled(elements.saveButton, saving);

    elements.saveButton.setAttribute("aria-busy", String(saving));

    const label = getOptionalElement("span", elements.saveButton);

    if (!label) {
        return;
    }

    setText(
        label,
        saving
            ? "Saving..."
            : editingStudentId
            ? "Update Student"
            : "Save Student"
    );
}

function resetForm(elements) {
    editingStudentId = null;

    elements.form.reset();

    clearErrors(elements);

    setPasswordVisible(elements, false);

    setText(elements.modalTitle, "Add New Student");

    elements.fields.password.required = true;

    elements.fields.password.placeholder = "Create a password";

    setSaving(elements, false);
}

function openEditor(elements, studentId) {
    const student = students.find((item) => item.id === studentId);

    if (!student) {
        throw new Error("Student was not found.");
    }

    editingStudentId = student.id;

    clearErrors(elements);

    for (const name of [
        "fullName",
        "gender",
        "nationalId",
        "phone",
        "username",
    ]) {
        elements.fields[name].value = student[name] ?? "";
    }

    elements.fields.password.value = "";

    elements.fields.password.required = false;

    elements.fields.password.placeholder =
        "Leave blank to keep current password";

    setText(elements.modalTitle, "Edit Student");

    setSaving(elements, false);

    modalInstance(elements.modal).show();
}

async function validateForm(elements, data) {
    const currentStudent = editingStudentId
        ? students.find((student) => student.id === editingStudentId)
        : null;

    /*
     * validateStudentForm requires a
     * password. During editing, the
     * stored password is used only for
     * validation when the teacher leaves
     * the password field empty.
     */
    const result = validateStudentForm({
        ...data,

        password:
            editingStudentId && !data.password
                ? currentStudent?.password ?? ""
                : data.password,
    });

    if (result.isValid) {
        return true;
    }

    markErrors(elements, result.errors);

    const firstErrorField = Object.keys(result.errors)[0];

    elements.fields[firstErrorField]?.focus();

    await showError(
        "Invalid student information",
        getFirstError(result.errors)
    );

    return false;
}

async function submitForm(event, elements) {
    event.preventDefault();

    clearErrors(elements);

    const data = formData(elements);

    if (!(await validateForm(elements, data))) {
        return;
    }

    setSaving(elements, true);

    try {
        if (editingStudentId) {
            const changes = {
                fullName: data.fullName,

                gender: data.gender,

                nationalId: data.nationalId,

                phone: data.phone,

                username: data.username,
            };

            if (normalizeText(data.password)) {
                changes.password = data.password;
            }

            updateStudent(editingStudentId, changes);

            showSuccessToast("Student updated successfully.");
        } else {
            createStudent(data);

            showSuccessToast("Student created successfully.");
        }

        modalInstance(elements.modal).hide();

        reloadStudents(elements);
    } catch (error) {
        console.error("Unable to save the student.", error);

        await showError(
            "Unable to save student",
            error.message || "The student could not be saved."
        );
    } finally {
        setSaving(elements, false);
    }
}

async function deleteStudent(elements, studentId, button) {
    const student = students.find((item) => item.id === studentId);

    if (!student) {
        showErrorToast("Student was not found.");

        return;
    }

    const confirmed = await confirmDelete(student.fullName);

    if (!confirmed) {
        return;
    }

    setDisabled(button, true);

    try {
        softDeleteStudent(student.id);

        reloadStudents(elements);

        showSuccessToast("Student removed successfully.");
    } catch (error) {
        console.error("Unable to remove the student.", error);

        await showError(
            "Unable to remove student",
            error.message || "The student could not be removed."
        );
    } finally {
        setDisabled(button, false);
    }
}

function handleTableClick(event, elements) {
    const button = event.target.closest("[data-action][data-student-id]");

    if (!button || !elements.tableBody.contains(button)) {
        return;
    }

    const studentId = normalizeText(button.dataset.studentId);

    if (button.dataset.action === "edit") {
        try {
            openEditor(elements, studentId);
        } catch (error) {
            showErrorToast(error.message || "Unable to edit the student.");
        }

        return;
    }

    if (button.dataset.action === "delete") {
        void deleteStudent(elements, studentId, button);
    }
}

function bindEvents(elements) {
    elements.search.addEventListener("input", () => renderStudents(elements));

    elements.filterButton.addEventListener("click", () => {
        filterIndex = (filterIndex + 1) % FILTERS.length;

        updateFilterButton(elements);

        renderStudents(elements);
    });

    elements.tableBody.addEventListener("click", (event) =>
        handleTableClick(event, elements)
    );

    elements.form.addEventListener("submit", (event) =>
        submitForm(event, elements)
    );

    elements.addButton.addEventListener("click", () => resetForm(elements));

    elements.passwordToggle.addEventListener("click", () => {
        setPasswordVisible(
            elements,
            elements.fields.password.type === "password"
        );
    });

    Object.values(elements.fields).forEach((field) => {
        for (const eventName of ["input", "change"]) {
            field.addEventListener(eventName, () => {
                field.classList.remove("is-invalid");

                field.removeAttribute("aria-invalid");
            });
        }
    });

    elements.modal.addEventListener("hidden.bs.modal", () =>
        resetForm(elements)
    );
}

function initializeStudentsPage() {
    const teacher = requireRole(USER_ROLES.TEACHER);

    if (!teacher) {
        return;
    }

    let elements;

    try {
        elements = getElements();

        setText(elements.badge, "-- students");

        setText(elements.summary, "Loading students...");

        clearElement(elements.tableBody);

        elements.tableBody.append(emptyRow("Loading students..."));

        updateFilterButton(elements);

        resetForm(elements);

        bindEvents(elements);

        reloadStudents(elements);
    } catch (error) {
        console.error("Unable to initialize the students page.", error);

        if (elements) {
            setText(elements.badge, "-- students");

            setText(elements.summary, "Unable to load students.");

            clearElement(elements.tableBody);

            elements.tableBody.append(
                emptyRow("Unable to load students. Refresh the page.")
            );
        }

        showErrorToast("Unable to load the students page.");
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeStudentsPage, {
        once: true,
    });
} else {
    initializeStudentsPage();
}
