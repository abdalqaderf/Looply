export function createPublicNavbar() {
  return `
        <nav
            class="public-navbar"
            aria-label="Main navigation"
        >
            <div class="container nav-bar">

                <a
                    href="home.html"
                    class="nav-logo"
                    aria-label="Looply home"
                >
                    <img
                        src="../icons/logo.png"
                        alt="Looply"
                    >
                </a>

                <div
                    class="nav-navigation"
                    id="nav-navigation"
                >
                    <ul class="nav-links">
                        <li>
                            <a
                                href="home.html"
                                class="nav-link"
                                data-page="home"
                            >
                                Home
                            </a>
                        </li>

                        <li>
                            <a
                                href="home.html#features"
                                class="nav-link"
                                data-page="features"
                            >
                                Features
                            </a>
                        </li>

                        <li>
                            <a
                                href="contact-about.html"
                                class="nav-link"
                                data-page="contact-about"
                            >
                                About &amp; Contact
                            </a>
                        </li>
                    </ul>

                    <a
                        href="login.html"
                        class="primary-btn nav-login-mobile"
                    >
                        Login
                    </a>
                </div>

                <div class="nav-actions">
                    <a
                        href="login.html"
                        class="primary-btn nav-login-desktop"
                    >
                        Login
                    </a>

                    <button
                        type="button"
                        class="nav-menu-button"
                        id="nav-menu-button"
                        aria-label="Open navigation menu"
                        aria-controls="nav-navigation"
                        aria-expanded="false"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>

            </div>
        </nav>
    `;
}

function getCurrentPageName() {
  const pathParts = window.location.pathname.split("/");

  return pathParts.pop() || "home.html";
}

function setActiveLink(links) {
  const currentPage = getCurrentPageName();

  const currentHash = window.location.hash;

  links.forEach((link) => {
    const pageName = link.dataset.page;

    let isActive = false;

    if (pageName === "home") {
      isActive = currentPage === "home.html" && currentHash !== "#features";
    }

    if (pageName === "features") {
      isActive = currentPage === "home.html" && currentHash === "#features";
    }

    if (pageName === "contact-about") {
      isActive = currentPage === "contact-about.html";
    }

    link.classList.toggle("active", isActive);

    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

export function renderPublicNavbar(rootSelector = "#navbar-root") {
  const navbarRoot = document.querySelector(rootSelector);

  if (!navbarRoot) {
    console.warn(`Navbar root was not found: ${rootSelector}`);

    return false;
  }

  navbarRoot.innerHTML = createPublicNavbar();

  const menuButton = navbarRoot.querySelector("#nav-menu-button");

  const navigation = navbarRoot.querySelector("#nav-navigation");

  const navigationLinks = [...navbarRoot.querySelectorAll(".nav-link")];

  const mobileNavigationLinks = [
    ...navbarRoot.querySelectorAll(".nav-link, .nav-login-mobile"),
  ];

  if (!menuButton || !navigation) {
    console.error("Navbar controls could not be initialized.");

    return false;
  }

  function closeMobileMenu() {
    navigation.classList.remove("show");
    menuButton.classList.remove("active");

    menuButton.setAttribute("aria-expanded", "false");

    menuButton.setAttribute("aria-label", "Open navigation menu");
  }

  function toggleMobileMenu() {
    const isOpen = navigation.classList.toggle("show");

    menuButton.classList.toggle("active", isOpen);

    menuButton.setAttribute("aria-expanded", String(isOpen));

    menuButton.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu",
    );
  }

  setActiveLink(navigationLinks);

  menuButton.addEventListener("click", toggleMobileMenu);

  mobileNavigationLinks.forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
      closeMobileMenu();
    }
  });

  window.addEventListener("hashchange", () => {
    setActiveLink(navigationLinks);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeMobileMenu();
    }
  });

  document.addEventListener("click", (event) => {
    const clickedInsideNavbar = navbarRoot.contains(event.target);

    if (!clickedInsideNavbar) {
      closeMobileMenu();
    }
  });

  return true;
}

function initializePublicNavbar() {
  renderPublicNavbar();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializePublicNavbar, {
    once: true,
  });
} else {
  initializePublicNavbar();
}
