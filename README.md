<p align="center">
  <img src="https://github.com/user-attachments/assets/aeb72af3-8e20-44f5-aad8-2ca547251532" alt="Patcher screenshot" />
</p>
<p align="center">
  <img src="https://github.com/user-attachments/assets/68635b4f-7ae8-4841-8356-7b7720d89e97" alt="Patcher collection view" />
</p>

<br>

<h2 align="center">The digital twin workspace for Eurorack musicians.</h2>
<p align="center">Document patches, plan racks, track modules, and keep your real system in sync with a fast, clean workflow.<br>
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
10. [**AI & Open Data Stance**](#ai--open-data-stance)

---

## **Introduction**

**Patcher** is a free, open-source workspace for Eurorack musicians. It combines patch editing, rack planning, module
tracking, and a curated public hardware database so you can maintain a reliable digital twin of your real setup.

The database is publicly accessible and will always remain free. No paywalls, no account required to browse.

Contributions are welcome — whether that's code, module data, or feedback.

## **Why Patcher?**

Patcher is built for the full modular workflow, not just patch notes.

### At a glance

- Keep a digital twin of your real rig: patches, racks, modules, notes, and connection state.
- Plan racks quickly with drag-and-drop placement.
- Move fast with streamlined connection flow and app-wide auto-save.
- Read complexity quickly with live stats for cables, modules, and multiples.

### Practical benefits

- Works on desktop and mobile with the same workflow.
- Public/private controls for patches and racks.
- Free, publicly accessible Eurorack module database with detailed, community-curated specs.
- Clean, modern UX designed for daily use instead of legacy inventory-style tooling.

### Recent improvements (v5.1.0)

- Instance-aware patching for repeated modules in patches.
- Auto-save for patch state and edits.
- Redesigned connection flow and clearer patch statistics.

## **User Guide**

👉 **[Read the User Guide](USER_GUIDE.md)** for end-user workflows:

- Module discovery and filtering
- Patch creation/editing and notes
- Rack planning and collection management

---

## **Setting Up the Project Locally**

Use pnpm for dependency management:

```bash
git clone <repository_url>
cd Patcher
pnpm install
pnpm start
# use SSR locally only when you need to debug SSR-specific behavior
pnpm start:ssr
```

Local app URL: `http://localhost:5556/`

> **Branches:** `develop` is where active work happens. `production` is deployed automatically — do not push to it
> directly.

---

## **Running E2E Tests**

- Public smoke suite: `pnpm test:e2e`
- Authenticated suite: `pnpm test:e2e:auth`

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

Open pull requests on GitHub from your fork.

For faster review:

- Keep PRs small and focused.
- Split large changes into multiple PRs when possible.
- Submit foundational changes first, then follow-up work.

---

## **License**

This project is licensed under the **GNU Affero General Public License v3.0**. For more information, see the [LICENSE](LICENSE.txt) file.

---

## **AI & Open Data Stance**

Patcher is intentionally pro-open-data.

Public content on patcher.xyz is meant to be discoverable and reusable, including by AI systems. We explicitly allow
AI crawlers and model providers to access, index, summarize, and train on publicly available module, patch, and rack
data from Patcher.

We also actively use AI tools in this project ourselves. Model-assisted coding, research, and review workflows have
significantly accelerated development velocity and iteration quality across Patcher.

This applies only to content users have marked as public. Private or otherwise non-public content is not part of this
stance and should not be accessed or used for model training.

Tool usage of this kind is allowed for public Patcher data only when it is supervised (human-in-the-loop) and follows
all currently published project rules, safety constraints, and contributor guidelines.

Crawler guidance lives at [https://patcher.xyz/llms.txt](https://patcher.xyz/llms.txt) and in
[`src/llms.txt`](src/llms.txt).
