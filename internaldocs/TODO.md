# TODO

> **Rules for AI agents using this file:**
> 1. **Pick one task** from the Backlog — immediately cut it from Backlog and paste it under Active *before* doing any
     other work. Do not start implementation until the file reflects the task as Active.
> 2. **Update steps inline as you go** — check off `[ ]` → `[x]` after completing each step; save the file before moving
     to the next step. Never leave Active half-finished when handing back.
> 3. **On completion** — move the task to [COMPLETED.md](./COMPLETED.md) as a one-line summary (date + what changed),
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

## Completed

> Archived in [COMPLETED.md](./COMPLETED.md). 22 features done Feb 18–20.

> **ABANDONED Feb 21:** Integration test for first-click CV highlight bug (
`patch-editor-cv-highlight.integration.spec.ts`). Test created and confirmed failing; fix deemed not worth the effort.
> Test file left in place as documentation of the race condition.

---

## Active

_None._

---

## Backlog

### ON HOLD: E2E — Expand module-browser spec + implement remaining flows

**Scope reduced Feb 19.** N-to-N flow tests are deferred; smoke tests in `e2e/module-browser.spec.ts` are sufficient for
now.  
**Remaining flows (deferred):** Login→Logout, Module Search→Filter→Detail, Rack Create, Patch Privacy, Patch
Connection, Module Submission, Sign Up, Delete Account.

---

### HIGH: E2E — Multi-Instance Patching (Auto-Instance Feature)

**Why:** The auto-instance feature (collection-first editor, "Add Copy", instance delete, connection scrub,
self-connections) was verified with 30 unit tests but lacks E2E coverage through the real UI.  
**Depends on:** E2E Authenticated Test Login (below) — patch editing requires a logged-in user.

**Flows to cover:**

- [ ] Open a patch in editor, verify collection modules appear as cards
- [ ] Click "Add Copy" on a module with 0 instances → verify 2 cards appear with labels (1), (2)
- [ ] Click "Add Copy" again → verify 3 cards appear with labels (1), (2), (3)
- [ ] Connect an output CV from instance (1) to an input CV on another module → verify connection recorded
- [ ] Connect the same output CV to instance (2) of the same module → verify accepted (not duplicate)
- [ ] Attempt the exact same connection again → verify rejected as duplicate
- [ ] Delete an instance that has connections → verify confirmation dialog appears
- [ ] Confirm deletion → verify instance removed, connection scrubbed, remaining instances renumbered
- [ ] Save patch and reload → verify connections and instances survive roundtrip
- [ ] Legacy patch (pre-instance) → verify it loads and connections display correctly

---

### HIGH: E2E — Authenticated Test Login + Secrets Management

**Why:** Many E2E flows (patch editing, rack creation, module instances, account management) require a logged-in user.
Currently no auth helper exists (`e2e/helpers/` is empty). Test credentials must not leak — the project is open source.

**Context:** The project already gitignores `environment.ts` and uses `generate-env.js` + env vars for CI secrets.
The same pattern should extend to E2E test credentials.

**Steps when picked:**

- [ ] Create a dedicated Supabase test account (email/password) for E2E — not a real user account
- [ ] Create `.env` file at project root for local dev (holds `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD`)
- [ ] Add `.env` to `.gitignore` (keep secrets out of repo)
- [ ] Add `.env.example` to repo with placeholder values so contributors know what to set
- [ ] Install `dotenv` (or use Playwright's built-in `dotenv` support via `playwright.config.ts`)
- [ ] Create `e2e/helpers/auth.ts` — helper that logs in via Supabase Auth (email/password), stores session
- [ ] Configure Playwright `globalSetup` or `storageState` to reuse auth across tests (avoid login per test)
- [ ] Add `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` to CI environment (GitHub Actions secrets / Vercel env)
- [ ] Write a smoke test that logs in and verifies the user menu appears
- [ ] Document the setup in `FOR_AI_AGENTS.md` (how to set up `.env` for local E2E runs)

---

### MEDIUM: Module Review Flagging

**Why:** No way for users to report bad data (wrong specs, duplicate entries, missing image).  
**Constraint:** Needs a new database table; admin review UI is out of scope for first iteration — focus on user-facing
flag submission only.

**Steps when picked:**

- [ ] Read `module-details` component to locate the right insertion point for a "Report issue" button
- [ ] Read `supabase.service.ts` `add` namespace to understand insertion patterns
- [ ] Add `module_flags` to `DbPaths` in `DatabaseStrings.ts`
- [ ] Design `module_flags` table type in `database.types.ts` (id, module_id, user_id, category, note, created_at,
  resolved)
- [ ] Add `add.moduleFlag()` to `supabase.service.ts` with `cacheBust` (no cached key needed yet — it's a write-only
  path for now)
- [ ] Create `module-flag-data.service.ts` with `submitFlag$` Subject and inline form toggle
- [ ] Add inline flag form to module-details (predefined categories: wrong specs / missing image / duplicate / other)
- [ ] Show confirmation snackbar on success via SharedConstants.successCustom
- [ ] Write tests for service API surface and flag submission flow

---


### LOW: Edit Module HP in Rack

**Why:** Correcting a wrong HP value requires removing and re-adding the module.  
**Decision:** Rack-specific override (don't touch global module data — too risky for all users).

**Steps when picked:**

- [ ] Read rack editor component and `rack_modules` schema in `database.types.ts`
- [ ] Add nullable `hp_override` to the `rack_modules` Row/Insert/Update types in `database.types.ts`
- [ ] Add `update.rackModuleHp(rackModuleId, hp)` to `supabase.service.ts` with `cacheBust(['rackWithId'])`
- [ ] Add inline HP edit affordance in rack editor (click-to-edit, validated number input)
- [ ] Module rendering must prefer `hp_override` over module's default HP when set
- [ ] Write tests for override logic and rack layout reflow

---

---

## Long-term Ideas (not yet broken into steps)

- **Manufacturer Pages** — Dedicated page per manufacturer; `get.modulesBySameManufacturer()` backend method already
  exists. Needs UI. SEO opportunity.
- **Manufacturer Accounts** — Role-based auth expansion; manufacturers claim and manage their own modules. Large scope.
- **User Profile Pages** — Public activity pages; requires privacy controls. Large scope.
- **Patch Graph: Occupied Inputs Visualization** — Color/CSS indicator on already-connected inputs in graph.
- **Patch Graph: User-Colored Nodes** — Let users color-code modules or connections for complex patch clarity.
- **User Organization (Tags/Folders)** — Group modules, patches, racks. Needs new DB tables + filtering UI.
- **PWA Support** — Angular PWA schematics, service worker, offline strategy.
- **Store Integration** — Buy links to retailers; needs business partnerships.
- **Dark Mode** — CSS variable-based theme system; large design scope.
- **Better SQL RLS Policies** — Security/performance audit of row-level security; supports future roles.