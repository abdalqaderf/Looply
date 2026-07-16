const studentSidebarRoot = document.getElementById(
    "student-sidebar-root"
);

const studentSidebarOverlay = document.getElementById(
    "student-sidebar-overlay"
);

const studentSidebarToggle = document.getElementById(
    "student-sidebar-toggle"
);

if (!studentSidebarRoot) {
    console.error("Element #student-sidebar-root was not found.");
} else {
    const currentPage =
        window.location.pathname.split("/").pop() ||
        "dashboard.html";

    const workspaceLinks = [
        {
            label: "Dashboard",
            icon: "bi-grid",
            href: "dashboard.html",
            activePages: ["dashboard.html"]
        },
        {
            label: "Exams",
            icon: "bi-journal-code",
            href: "exams.html",
            activePages: [
                "exams.html",
                "take-exam.html",
                "exam-result.html"
            ]
        },
        {
            label: "History",
            icon: "bi-clock-history",
            href: "history.html",
            activePages: ["history.html"]
        }
    ];

    const accountLinks = [
        {
            label: "Profile",
            icon: "bi-person",
            href: "../profile.html",
            activePages: ["profile.html"]
        },
        {
            label: "Logout",
            icon: "bi-box-arrow-left",
            href: "../login.html",
            activePages: [],
            extraClass: "student-logout-link"
        }
    ];

    studentSidebarRoot.className = "student-sidebar";

    studentSidebarRoot.innerHTML = `
        <div class="student-sidebar-content">

            <section class="student-sidebar-section">
                <p class="student-sidebar-label">
                    Student Workspace
                </p>

                <nav
                    class="student-side-nav"
                    aria-label="Student workspace navigation"
                >
                    ${createStudentLinks(
                        workspaceLinks,
                        currentPage
                    )}
                </nav>
            </section>

            <section class="student-sidebar-section">
                <p class="student-sidebar-label">
                    Account
                </p>

                <nav
                    class="student-side-nav"
                    aria-label="Student account navigation"
                >
                    ${createStudentLinks(
                        accountLinks,
                        currentPage
                    )}
                </nav>
            </section>

        </div>

        <div class="student-sidebar-footer">
            <span class="student-sidebar-footer-icon">
                <i class="bi bi-mortarboard"></i>
            </span>

            <div>
                <strong>Student Access</strong>
                <small>Exams and progress workspace</small>
            </div>
        </div>
    `;

    setupStudentSidebarEvents();
}

function createStudentLinks(links, currentPage) {
    return links
        .map(function (link) {
            const isActive =
                link.activePages.includes(currentPage);

            const extraClass = link.extraClass || "";

            return `
                <a
                    href="${link.href}"
                    class="
                        student-side-link
                        ${isActive ? "active" : ""}
                        ${extraClass}
                    "
                    ${isActive ? 'aria-current="page"' : ""}
                >
                    <i
                        class="bi ${link.icon}"
                        aria-hidden="true"
                    ></i>

                    <span>${link.label}</span>
                </a>
            `;
        })
        .join("");
}

function setupStudentSidebarEvents() {
    if (studentSidebarToggle) {
        studentSidebarToggle.addEventListener(
            "click",
            function () {
                const isOpen =
                    studentSidebarRoot.classList.contains(
                        "is-open"
                    );

                if (isOpen) {
                    closeStudentSidebar();
                } else {
                    openStudentSidebar();
                }
            }
        );
    }

    if (studentSidebarOverlay) {
        studentSidebarOverlay.addEventListener(
            "click",
            closeStudentSidebar
        );
    }

    studentSidebarRoot.addEventListener(
        "click",
        function (event) {
            const clickedLink = event.target.closest(
                ".student-side-link"
            );

            if (
                clickedLink &&
                window.innerWidth <= 992
            ) {
                closeStudentSidebar();
            }
        }
    );

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeStudentSidebar();
        }
    });

    window.addEventListener("resize", function () {
        if (window.innerWidth > 992) {
            closeStudentSidebar();
        }
    });
}

function openStudentSidebar() {
    studentSidebarRoot.classList.add("is-open");

    studentSidebarOverlay?.classList.add("is-visible");

    studentSidebarToggle?.classList.add("is-active");

    studentSidebarToggle?.setAttribute(
        "aria-expanded",
        "true"
    );

    document.body.classList.add("student-sidebar-open");
}

function closeStudentSidebar() {
    studentSidebarRoot.classList.remove("is-open");

    studentSidebarOverlay?.classList.remove("is-visible");

    studentSidebarToggle?.classList.remove("is-active");

    studentSidebarToggle?.setAttribute(
        "aria-expanded",
        "false"
    );

    document.body.classList.remove("student-sidebar-open");
}