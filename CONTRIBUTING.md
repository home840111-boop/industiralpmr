# Contributing to industrialpmr

Thank you for your interest in contributing to **industrialpmr** 🚀.
This document outlines the rules, standards, and workflow to ensure smooth development.

---

## 📌 Code of Conduct

* Be respectful and professional in communication.
* No direct changes to **production environment**.
* Use demo credentials for testing:

  * Email: `demo@industrialpmr.com`
  * Password: `demoadmin`
* Keep all company data and code **confidential**.

---

## 🛠️ Development Workflow

### 1. Fork & Clone

* Fork the repository.
* Clone your fork locally:

  ```bash
  git clone https://github.com/<your-username>/industrialpmr-dashboard.git
  cd industrialpmr
  ```

### 2. Branching

* Always create a new branch for your feature/bugfix.
* Use the following naming convention:

  * `feature/<short-description>` (e.g., `feature/rejected-pieces`)
  * `fix/<short-description>` (e.g., `fix/modal-validation`)

### 3. Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) standard:

* `feat:` → New feature
* `fix:` → Bug fix
* `chore:` → Config changes, cleanup
* `docs:` → Documentation updates
* `style:` → Code style changes

Examples:

* `feat: add modal for rejected pieces`
* `fix: prevent rejected pcs from exceeding total`

### 4. Pull Requests

* Push your branch to GitHub.
* Open a **Pull Request (PR)** into `dev` branch.
* PR Title should be descriptive (e.g., *“Add rejected pieces modal in machine report”*).
* Request review before merge.

---

## 🧪 Testing Guidelines

* Test all changes in the **demo dashboard** (using demo credentials).
* Verify:

  * UI renders correctly.
  * Inputs are validated.
  * Data saves and reloads properly.
* Do **not** test directly on production.

---

## 🎨 Code Style

* Use **Prettier + ESLint** config provided in repo.
* Write clean, readable code (no unused vars, no commented-out blocks).
* Use Tailwind CSS classes consistently for UI.

---

## ✅ Checklist Before Submitting a PR

* [ ] Code runs without errors.
* [ ] Inputs validated (frontend + backend).
* [ ] UI tested on demo dashboard.
* [ ] Commit messages follow convention.
* [ ] PR opened into `dev` branch.

---

## 📢 Communication

* If you get stuck for more than **1 hour**, ask for help.
* Document what you tried before raising a question.
* Use project Slack/WhatsApp for updates.

---

🔒 **Reminder**: industrialpmr is proprietary software of **KunjiSoft Technologies**. Do not share code, credentials, or internal details outside authorized teams.
