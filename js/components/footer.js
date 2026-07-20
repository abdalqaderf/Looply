export function createPublicFooter(year = new Date().getFullYear()) {
    return `
        <div class="container footer-content">

            <a
                href="home.html"
                class="footer-logo"
                aria-label="Looply home"
            >
                <img
                    src="../icons/logo.svg"
                    alt="Looply logo"
                >
            </a>

            <p class="footer-copyright">
                &copy; ${year} Looply.
                All rights reserved.
            </p>

        </div>
    `;
}

export function renderPublicFooter(rootSelector = "#footer-root") {
    const footerRoot = document.querySelector(rootSelector);

    if (!footerRoot) {
        console.warn(`Footer root was not found: ${rootSelector}`);

        return false;
    }

    footerRoot.classList.add("public-footer");

    footerRoot.innerHTML = createPublicFooter();

    return true;
}

function initializePublicFooter() {
    renderPublicFooter();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePublicFooter, {
        once: true,
    });
} else {
    initializePublicFooter();
}
