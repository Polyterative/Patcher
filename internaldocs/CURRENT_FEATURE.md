# Current Feature

> **Rules for AI agents using this file:**
> 1. **Read this file at the start of every session** — it describes the feature currently being developed.
> 2. **Keep it updated as you work** — check off steps, add discoveries, update selectors/decisions inline. Save after
     > every meaningful change.
> 3. **One feature at a time** — when a feature is complete, archive the content as a one-line summary in TODO.md
     > Completed, then reset this file to the Empty Template at the bottom.
> 4. **This file owns the detail; TODO.md owns the backlog.** — implementation steps, gotchas, file names, and
     > test results live here. TODO.md only holds a one-line entry per feature while it is in progress.

---

## Feature: E2E Tests — Module Browser Smoke Test

**Status:** 🟡 In progress  
**Started:** Feb 19, 2026  
**Spec file:** `e2e/module-browser.spec.ts`  
**Config:** `playwright.config.ts` — `testMatch: ['**/module-browser.spec.ts']`

---

### Goal

Verify that the module browser page loads and displays real content without authentication, using Playwright + Chromium.

---

### Current test results

| Test                                               | Status    |
|----------------------------------------------------|-----------|
| page loads without error                           | ✅ passing |
| shows at least one module card                     | ✅ passing |
| paginator shows total item count greater than zero | ✅ passing |
| page title / heading is visible                    | ✅ passing |

---

### Key discoveries / gotchas

- `app-brand-primary-button` renders as `<a mat-raised-button>` — **link role, not button role**.
  Always use `getByRole('link', { name: … })`, never `getByRole('button')` for these elements.
- `getByLabel(/email/i)` matches both the `<section aria-label="Email login">` and the `<input>` — strict mode
  violation. Use `locator('input[type="email"]')` and `locator('input[type="password"]')` instead.
- Module cards render as `<div class="card">` (from `lib-clean-card`) — not `mat-card` or `app-module-micro`.
  Selector: `page.locator('div.card').first()`.
- Paginator renders a `role="status"` element with text `"1 – 20 of 4001"` — reliable data-loaded signal.
- Logout button is on `/user/account`, not the toolbar.
- Login submit is an `<a>` inside `region "Email login"`:
  `page.getByRole('region', { name: 'Email login' }).getByRole('link', { name: /log in/i })`

---

### Steps

- [x] Install `@playwright/test`; add `test:e2e`, `test:e2e:ci`, `playwright:install` scripts to `package.json`
- [x] Create `playwright.config.ts` with `e2e/tsconfig.json` (Node moduleResolution — root uses "bundler")
- [x] Create `e2e/helpers/auth.ts` with `loginAs()` and `logout()`
- [x] Remove Protractor from devDependencies
- [x] Write `e2e/module-browser.spec.ts` — 4 passing smoke tests
- [x] Fix `div.card` selector (was `app-module-micro, mat-card` — both wrong)
- [x] Fix login helper — `getByRole('button')` → scoped `getByRole('link')` inside region
- [ ] Expand: add search/filter test (type manufacturer name, assert list narrows)
- [ ] Expand: add module detail navigation test (click card, assert detail page loads)

---

```