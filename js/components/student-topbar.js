const studentTopbarRoot = document.getElementById(
    "student-topbar-root"
);

if (!studentTopbarRoot) {
    console.error("Element #student-topbar-root was not found.");
} else {
    const student = {
        name: "Omar Ahmad",
        role: "Student"
    };

    studentTopbarRoot.innerHTML = createStudentTopbar(student);
}

function createStudentTopbar(student) {
    const initials = getStudentInitials(student.name);

    return `
        <nav
            class="student-topbar"
            aria-label="Student top navigation"
        >
            <div class="student-topbar-left">

                <button
                    type="button"
                    id="student-sidebar-toggle"
                    class="student-sidebar-toggle"
                    aria-label="Open sidebar"
                    aria-controls="student-sidebar-root"
                    aria-expanded="false"
                >
                    <i class="bi bi-list"></i>
                </button>

                <a
                    href="dashboard.html"
                    class="student-topbar-logo"
                    aria-label="Looply student dashboard"
                >
                    <img
                        src="../../icons/logo.svg"
                        alt="Looply logo"
                    >
                </a>

            </div>

            <a
                href="../profile.html"
                class="student-user-card"
                aria-label="Open student profile"
            >
                <span class="student-user-avatar">
                    ${initials}
                </span>

                <span class="student-user-info">
                    <strong>${student.name}</strong>
                    <small>${student.role}</small>
                </span>

                <i
                    class="bi bi-chevron-down student-user-arrow"
                    aria-hidden="true"
                ></i>
            </a>
        </nav>
    `;
}

function getStudentInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function (word) {
            return word.charAt(0).toUpperCase();
        })
        .join("");
}