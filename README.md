<p align="center">
  <img src="https://github.com/user-attachments/assets/aeb72af3-8e20-44f5-aad8-2ca547251532" alt="Patcher screenshot" />
</p>
<p align="center">
  <img src="https://github.com/user-attachments/assets/68635b4f-7ae8-4841-8356-7b7720d89e97" alt="Patcher collection view" />
</p>

<br>

<h2 align="center">The patch manager for Eurorack artists.</h2>
<p align="center">Document your patches, plan your racks, and explore a free modular database — all in one place.<br>
<a href="https://patcher.xyz">patcher.xyz</a> &nbsp;·&nbsp; <a href="https://discord.gg/N6Z32xJR">Discord</a> &nbsp;·&nbsp; <a href="CHANGELOG.md">Changelog</a></p>

<br>

---

<br>

## 🎉 What's New in v5.1.0

**Patcher v5.1.0 is live** — the patch editor is now everything it was meant to be, with auto-save, instance-aware
patching, a redesigned connection flow, and the deepest UX overhaul we've ever shipped.

See the full [CHANGELOG](CHANGELOG.md) for details.

<br>

---

<br>

### Feedback & bug reports

Have an idea or found something broken? Come talk to us on [Discord](https://discord.gg/N6Z32xJR) — it's the fastest way
to reach the team and the right place for feature discussions.

Technical bug reports can also be opened as [GitHub issues](https://github.com/Polyterative/Patcher/issues).

<br>
<br>

## **Table of Contents**

1. [**Introduction**](#introduction)
2. [**Why Patcher?**](#why-patcher)
3. [**User Guide**](#user-guide)
4. [**Setting Up the Project Locally**](#setting-up-the-project-locally)
5. [**Running E2E Tests**](#running-e2e-tests)
6. [**Project Dependencies**](#project-dependencies)
7. [**DB Model Details**](#db-model-details)
8. [**Pull Requests**](#pull-requests)
9. [**License**](#license)

---

## **Introduction**

**Patcher** is a free, open-source web application for Eurorack modular synthesizer artists. It brings together
everything you need to work with modular equipment: a patch editor, a rack planner, a personal module collection, and a
curated public database of hardware — all in a single, fast interface.

The database is publicly accessible and will always remain free. No paywalls, no account required to browse.

Contributions are welcome — whether that's code, module data, or feedback.

---

## **Why Patcher?**

Most tools in this space stop at rack planning or image exports. Patcher is a living patch document — it understands
your modules, tracks every connection, and keeps everything in sync as your setup evolves.

A few things that make it different:

---

### ⚡ Fast by design

Everything is optimised for speed. Adding a module, wiring a connection, or jotting down a note takes seconds — not a
sequence of modals and confirmations. The interface gets out of your way so you can focus on the music.

---

### 📱 Works on any device

Patcher runs in the browser, on desktop and mobile alike. Sketch a patch idea on your phone between sessions, then open
the same document on your computer and pick up exactly where you left off.

---

### 🔁 Tracks every copy of every module

When you use the same module more than once in a patch, Patcher keeps each copy distinct — connections are anchored to
the right physical unit, labels are automatic, and nothing gets mixed up. Reopen the patch days later and the wiring is
exactly as you left it.

> *Instance-aware patching — shipped in v5.1.0.*

---

### 💾 Nothing gets lost

Changes persist automatically. Notes, connection updates, patch state — all saved without ever touching a save button.
Close the tab, lose power, come back: everything is there.

> *Auto-save — shipped in v5.1.0.*

---

### 🔌 Wiring is frictionless

Adding a connection is a two-step interaction: pick an output, pick an input, confirm. A floating panel stays visible
while you work and clears itself the moment a connection lands. No modals, no page navigation.

> *Redesigned connection flow — shipped in v5.1.0.*

---

### 📊 Understand a patch without counting cables

Patcher surfaces connection statistics automatically — total cables, outputs driving multiple inputs, modules in use.
Complexity becomes readable at a glance.

> *Patch statistics panel — shipped in v5.1.0.*

---

### 🔒 Full control over what you share

Patches and racks can each be kept private or made public independently. Public content is discoverable by the
community; everything else stays yours.

---

### 🌍 A database built on accuracy

Every module in the database is curated for correctness — HP, manufacturer, CV specs. The data is free, publicly
accessible, and never behind a paywall. If something is missing, you can submit it directly from the interface.

---

## **User Guide**

**New to Patcher? Looking for help on how to use the application?**

👉 **[Read the User Guide](USER_GUIDE.md)** for a comprehensive introduction to all features, including:

- How to browse and discover Eurorack modules
- Creating and managing your patches
- Planning and visualizing your racks
- Managing your personal collection
- Tips, best practices, and community resources

The User Guide is designed for users of the application. For technical setup and development information, continue
reading below.

---

## **Setting Up the Project Locally**

To set up the project locally, follow the steps below:

1. **Clone** the repository to your local machine using `git clone <repository_url>`.
2. **Navigate** to the project directory using `cd Patcher`.
3. **Install** the necessary dependencies using `yarn install`.  
   **Note:** We use **Yarn** as our package manager. Please do not generate a `package-lock.json` file.
4. **Run** `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

> **Branches:** `develop` is where active work happens. `production` is deployed automatically — do not push to it
> directly.

---

## **Running E2E Tests**

- Public smoke suite: `yarn test:e2e`
- Authenticated suite: `yarn test:e2e:auth`

For contributor setup (required `.env` keys, dedicated test account, and why `playwright/.auth/` is ignored), see
[`e2e/README.md`](e2e/README.md).

---

## **Project Dependencies**

The project uses the following tools and libraries:

| **Tool/Library**       | **What**                                                             |
|------------------------|----------------------------------------------------------------------|
| **Angular**            | Web framework. Using v18                                             |
| **Angular Material**   | UI components                                                        |
| **Supabase**           | Database, authentication, and storage                                |
| **Vercel**             | Deployment, hosting                                                  |
| **GitHub**             | Version control, issue tracking, project management, test automation |
| **Database**           | PostgreSQL hosted on Supabase                                        |
| **Sentry**             | Technical analytics and error tracking                               |
| **Other Dependencies** | Check the `package.json` file                                        |

---

## **DB Model Details**

The database model for the project is as follows:

![Database Model](https://user-images.githubusercontent.com/16295552/155419090-3e3a0cd6-77b9-4d3b-91be-d525ef43dd03.png)

---

## **Pull Requests**

If you have forked on **GitHub**, then the best way to submit your patches is to push your changes back to GitHub and then send a "pull request" on GitHub.

If your pull request is small, for example, one or two commits each containing only a few lines of code, then it is easy for the maintainers to review.

If you are creating a larger pull request, then please help the maintainers by making the reviews as straightforward as possible:

- The smaller the PR, the easier it is to review. In particular, if a PR is too large to review in one sitting, or if changes are requested, then the maintainer needs to repeatedly re-read code that has already been considered.
- If you are creating a large pull request, then please consider splitting your pull request into multiple PRs. If part of your work can be considered standalone, or is a foundation for the rest of your work, please submit it separately first.

---

## **License**

This project is licensed under the **GNU Affero General Public License v3.0**. For more information, see the [LICENSE](LICENSE.txt) file.
