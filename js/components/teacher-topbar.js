document.addEventListener("DOMContentLoaded", function () {
    const topbarRoot = document.getElementById("teacher-topbar-root");

    if (!topbarRoot) {
        console.error("Element #teacher-topbar-root was not found.");
        return;
    }

    const teacher = {
        name: "Tariq Ahmad",
        role: "Teacher"
    };

    topbarRoot.innerHTML = createTeacherTopbar(teacher);
});

function createTeacherTopbar(teacher) {
    const initials = getInitials(teacher.name);

    return `
        <nav class="teacher-topbar" aria-label="Teacher top navigation">
            <div class="teacher-topbar-left">

                <button
                    type="button"
                    id="teacher-sidebar-toggle"
                    class="teacher-sidebar-toggle"
                    aria-label="Open sidebar"
                    aria-controls="teacher-sidebar-root"
                    aria-expanded="false"
                >
                    <i class="bi bi-list"></i>
                </button>

                <a
                    href="dashboard.html"
                    class="teacher-topbar-logo"
                    aria-label="Looply teacher dashboard"
                >
                    <img
                        src="../../icons/logo.svg"
                        alt="Looply logo"
                    >
                </a>

            </div>

            <a
                href="../../html/teacher/profile.html"
                class="teacher-user-card"
                aria-label="Open teacher profile"
            >
                <span class="teacher-user-avatar">
                    ${initials}
                </span>

                <span class="teacher-user-info">
                    <strong>${teacher.name}</strong>
                    <small>${teacher.role}</small>
                </span>

                <i class="bi bi-chevron-down teacher-user-arrow"></i>
            </a>
        </nav>
    `;
}

function getInitials(name) {
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function (word) {
            return word.charAt(0).toUpperCase();
        })
        .join("");
}