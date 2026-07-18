# Looply
<div align="center">
  <img src="./icons/logo.svg" alt="Looply logo" width="120" />

  # Looply

  **Build exams. Track progress. Improve outcomes.**

  A browser-based platform for creating programming exams, managing students,
  taking assessments, and reviewing results.

  [Live Demo](https://abdalqaderf.github.io/Looply/html/home.html)
</div>

---

## About the Project

Looply is a front-end examination management system designed for teachers and
students. Teachers can manage student accounts, create programming exams, add
multiple question types, and review submissions. Students can take available
exams, receive automatically calculated scores, and review their exam history.

The project runs entirely in the browser. Application data is stored using
`localStorage`, while the authenticated user session is stored using
`sessionStorage`.

## Main Features

### Teacher

- View dashboard statistics and recent activity.
- Add, edit, delete, and restore student accounts.
- Create and update exams.
- Change exam status between `active`, `inactive`, and `end`.
- Add multiple-choice, true/false, short-answer, and code-output questions.
- Review exam details, submissions, scores, and student performance.
- Update profile information.

### Student

- View active and upcoming exams.
- Start timed exams and save answers during an attempt.
- Submit exams and receive automatically calculated results.
- Review correct, incorrect, and unanswered questions.
- View previous attempts and exam history.
- Update profile information.

### General

- Role-based authentication and route protection.
- Responsive teacher and student dashboards.
- Reusable navigation, sidebar, topbar, and footer components.
- Form validation and custom SweetAlert2 notifications.
- Seeded demo data for immediate testing.
- Random quote integration using the DummyJSON API.

## Demo Accounts

| Role | Username | Password |
|---|---|---|
| Teacher | `sereen` | `123456` |
| Student | `abdalqader` | `123456` |
| Student | `belal` | `123456` |

> These accounts are included only for demonstration and testing.

## Technologies

- HTML5
- CSS3
- JavaScript ES Modules
- Browser `localStorage` and `sessionStorage`
- SweetAlert2
- Bootstrap Icons
- DummyJSON Quotes API
- GitHub Pages

## Project Structure

```text
Looply/
├── css/
│   ├── base.css
│   ├── dashboard.css
│   ├── dashboard-student.css
│   ├── exam.css
│   ├── student-exam.css
│   ├── profile.css
│   └── public.css
├── html/
│   ├── home.html
│   ├── login.html
│   ├── contact-about.html
│   ├── teacher/
│   └── student/
├── icons/
├── images/
├── js/
│   ├── components/
│   ├── core/
│   ├── public/
│   ├── services/
│   ├── teacher/
│   └── student/
└── README.md
```

## Running the Project Locally

Because the project uses JavaScript modules, run it through a local web server
instead of opening the HTML files directly with the `file://` protocol.

### Option 1: VS Code Live Server

1. Clone the repository:

   ```bash
   git clone https://github.com/abdalqaderf/Looply.git
   ```

2. Open the project folder in Visual Studio Code.
3. Install the **Live Server** extension.
4. Open `html/home.html`.
5. Select **Open with Live Server**.

### Option 2: Python Server

From the project root, run:

```bash
python3 -m http.server 5500
```

Then open:

```text
http://localhost:5500/html/home.html
```

## Data and Authentication

Looply is currently a front-end demonstration and does not use a back-end
server or database.

- Users, exams, attempts, and seed metadata are stored in `localStorage`.
- The current login session is stored in `sessionStorage`.
- Demo passwords are stored locally and are not suitable for a production
  authentication system.
- Data is specific to the current browser and device.

To reset the application to its seeded state, remove the keys beginning with
`looply_` from the browser storage and reload the page.

## Exam Question Types

Looply supports the following question types:

- Multiple choice
- True or false
- Short answer
- Code output

Scores are calculated automatically when an exam attempt is submitted.

## Deployment

The project is deployed using GitHub Pages from the `main` branch and repository
root.

The main application entry page is:

```text
html/home.html
```

Live deployment:

```text
https://abdalqaderf.github.io/Looply/html/home.html
```

## Team

- Abdalqader Froukh
- Sereen Mousa
- Belal Hamdan

---

<div align="center">
  Built as a collaborative front-end examination management project.
</div>