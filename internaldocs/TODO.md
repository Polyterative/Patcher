# TODO

> **Rules for AI agents using this file:**
> 1. **Pick one task** from the Backlog — immediately cut it from Backlog and paste it under Active *before* doing any
     other work. Do not start implementation until the file reflects the task as Active.
> 2. **Update steps inline as you go** — check off `[ ]` → `[x]` after completing each step; save the file before moving
     to the next step. Never leave Active half-finished when handing back.
> 3. **On completion** — move the task to Completed as a one-line summary (date + what changed + key files/test counts),
     then clear Active. Also reset `CURRENT_FEATURE.md` to its Empty Template.
> 4. **Domain detail lives in `CURRENT_FEATURE.md`** — implementation steps, file names, schema fields, test results,
     and gotchas go there while a feature is in progress. Only a one-line entry per feature belongs here.
> 5. **Do not duplicate** strategy rationale already in PRODUCT_NEEDS.md; one sentence of context per task is enough.

**Tasks are ordered by priority within each section.**

---

## Legend

- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done

---

## Completed (compressed)

- [x] **Bug sweep** (Feb 19) — Fixed double backend call, snackBar conventions, readonly @Input errors, fxLayout
  deprecations, dead code, wrong tooltips across module-editor, module-details, module-browser-detail.
- [x] **Private Patches** (Feb 18) — Added `public` field to patches; Privatable interface; toggle button + tooltip;
  default public on creation. Tests: integration-user-patches, patch-detail-data-service-privacy, crud-operations.
- [x] **Blank Module Education** (Feb 18) — FAQ entry, rack editor tooltip, enhanced context menu label "Replace with
  blank (add spacing)".
- [x] **User-Submitted Manufacturers** (Feb 19) — Inline manufacturer creation form in module submission;
  BehaviorSubject options list; auto-select on create. 18 tests in module-adder-manufacturer-creation.spec.ts.
- [x] **Account Data Deletion** (Feb 19) — `delete.allUserData()` in SupabaseService; deleteAccountAction$ handler in
  UserManagementService with confirm dialog; single "Delete my data" button wired up.
- [x] **Cable/Multiples Counter** (Feb 19) — PatchConnectionStatsPipe (cables, modules, multiples); statistics panel in
  patch-composite. 10 tests in patch-connection-stats.spec.ts.
- [x] **iOS Clipboard Fix** (Feb 19) — textarea + execCommand fallback in app-copy-on-click.directive.ts.
- [x] **Rack Statistics Blank Filter** (Feb 19) — rack-blank-module.constants.ts; BLANK_MODULE_IDS filter in all 6 stats
  pipes. 30 tests in rack-stats-blank-filter.spec.ts.

---

- [x] **E2E Test Setup — Playwright** (Feb 19) — Added `@playwright/test`; `playwright.config.ts`; `yarn test:e2e` /
  `test:e2e:ci` / `playwright:install` scripts; `e2e/helpers/auth.ts`; 8 spec files (flows 1–8) with `test.todo` stubs;
  removed Protractor; updated FOR_AI_AGENTS.md Commands table. Key files: `playwright.config.ts`,
  `e2e/helpers/auth.ts`, `e2e/flow-01-signup.spec.ts` … `e2e/flow-08-delete-account.spec.ts`.
- [x] **E2E — Module browser smoke test** (Feb 19) — Removed 8 unimplemented flow stubs; added
  `e2e/module-browser.spec.ts` (4 passing tests: page loads, `div.card` visible, paginator status > 0, heading visible);
  fixed selector — cards render as `div.card` not `mat-card`; `playwright.config.ts` `testMatch` narrowed to
  `module-browser.spec.ts`. ✅ Done Feb 19.

- [x] **Account Management — Password Change** (Feb 19) — `changePassword$` + `showPasswordForm$` toggle in
  `UserManagementService`; `updatePassword$` in `SupabaseService`; inline form (new + confirm, min 8 chars) in
  `user-management.component.html`; ReactiveFormsModule + Material modules added to `user-management.module.ts`. 9 tests
  in `password-change.spec.ts`.
- [x] **Security Audit — Secrets & Credentials** (Feb 19) — Ran gitleaks on full history: 0 secrets in current tree,
  8 historical findings (5× Supabase anon JWT — safe/public, 3× old Firebase/GCP API keys in deleted `firebase.ts`).
  Fixed `.gitignore` (added `.env*`, `*.pem`, `*.key`, `*.p12`). Manual follow-ups: revoke 2 old GCP keys in console,
  verify Supabase RLS in dashboard.

---

## Active

*(none)*

---

## Backlog

*(empty — other tasks managed in separate branch)*