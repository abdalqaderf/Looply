function createNavbar() {
    return `
        <nav class="nav">
            <div class="container nav-bar">

                <a href="index.html" class="logo" id="nav-logo">
                    <img src="../icons/logo.png" alt="Looply logo">
                </a>

                <div class="nav-links" id="nav-links">
                    <ul>
                        <li>
                            <a href="index.html">Home</a>
                        </li>

                        <li>
                            <a href="features.html">Features</a>
                        </li>

                        <li>
                            <a href="about-contact.html">About & Contact</a>
                        </li>
                        
                    </ul>
                    </div>
                    <button class="primary-btn nav-btn">Login</button>

            </div>
        </nav>
    `;
}

const navbarRoot = document.getElementById("navbar-root");

if (navbarRoot) {
    navbarRoot.innerHTML = createNavbar();
}