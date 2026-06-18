# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut). Future agents read this to avoid relitigating settled questions.

---

## Active

### E2E — Test-Account Hardening + Multi-Instance Patching Coverage

Plan owner: planner persona, 2026-06-18T11:49+02:00.
Backlog entries:

- `internaldocs/workflow/plans/e2e-dedicated-test-account-cleanup.md` (folded as Chunk A — prerequisite)
- `internaldocs/workflow/plans/e2e-multi-instance-patching.md` (Chunks B–D — primary deliverable)

Status: **Active. No migrations, no schema, no RLS. Pure E2E + harness work. Local happy-path scaffold landed; runtime auth verification still needs non-empty local credentials.**

#### Why this is the next chunk (CTO call)

The user delegated prioritization. Hard filter: the user has locked migrations behind verified frontend-first work, which knocks out every Tier-0/2 marketplace task (Purchase Price History needs a new table), Cool reactions (new tables), Module I/O bidirectional (schema), and the active Manufacturer Accounts MVP (M1 migrations drafted, type-gen blocked). Tag-taxonomy split is 5/8 done with only the production migration apply pending — also blocked.

Of the remaining unblocked candidates:

- **E2E Test-Account Cleanup** (HIGH) is genuinely tiny — a creds rotation chore — and on its own is too thin to be the answer to "useful stuff to work with."
- **Docs Screenshot Pipeline Refresh** (MEDIUM) is soft-blocked by the test-account cleanup.
- **E2E Multi-Instance Patching** (HIGH) is substantial: the auto-instance feature has 30 unit tests and zero E2E coverage on the real patch editor — the highest-value-per-spec corner of the product, and a recurring regression risk every time the editor changes.

Strategically, the right move is to fold the cleanup into the same workstream as the multi-instance E2E coverage. The cleanup is the formal prerequisite of the multi-instance plan ("Depends on: Dedicated test account"), and they share the auth E2E harness. Doing them in one chunk produces:

1. A safer, shareable test account decoupled from a personal Supabase identity.
2. Real end-to-end coverage of the patch editor's auto-instance feature (cards, Add Copy, CV-from-instance, duplicate-rejection, delete-with-connections, save+reload, legacy patch back-compat).
3. As a side benefit, an unblocked Docs Screenshot Pipeline refresh (the next domino) since deterministic test-account data is its sole dependency.

#### Parked (was active before this redirect)

- **Manufacturer Accounts & Verification — MVP** (`plans/manufacturer-accounts-verification.md`).
  - M1 local migrations were drafted; type generation is blocked because the user requires local frontend changes to be executed and verified before any migration / RLS / storage policy work runs.
  - No frontend chunk in M2–M7 is independently shippable: every Angular component in M3–M6 depends on M2 backend-access methods, which depend on regenerated `database.types.ts`, which depends on M1.
  - Therefore the right call is to park the feature as-is until either (a) Docker/local Supabase becomes available so M1 type-gen can complete and the user accepts the resulting frontend, or (b) the user explicitly approves a mocked-data frontend prototype path for M3/M4 (would be throwaway code and fights the layering rule, so not recommended).
  - The plan files (`manufacturer-accounts-verification*.md`) and their decision logs remain authoritative; nothing here supersedes them.

#### Problem

- The auto-instance feature in the patch editor (multiple copies of the same module, labelled `(1)`, `(2)`, …, with per-instance CV connections) is exercised by ~30 unit specs but never validated through the real DOM, the real router, the real data services, and the real Supabase persistence path. Every refactor of the patch editor is one regression away from breaking instance numbering, duplicate-connection rejection, instance-deletion fallout, or legacy-patch back-compat — and we wouldn't know until a user reports it.
- E2E credentials currently live on a personal Supabase account (per `e2e-dedicated-test-account-cleanup.md`). That couples the test harness to one developer's identity, leaks personal data into CI artefacts, and risks a credential rotation breaking everyone else's pipeline.

#### Primary outcome

Every box in `plans/e2e-multi-instance-patching.md` is checked, running green from a dedicated, shareable test account whose secrets live only in the standard `.env` + GitHub Actions secrets. Locally, `pnpm test:e2e:auth --include="**/auth-patch-multi-instance*.spec.ts"` exits 0; in CI, the auth E2E job runs against the new account.

#### Assumptions and CTO decisions

1. **No app source code changes.** This chunk is test-spec authoring + secrets rotation only. If a spec uncovers a real product bug, the bug fix is a separate follow-up chunk under its own plan; do not let scope creep land here.
2. **One spec file** for the multi-instance scenarios: `e2e/auth-patch-multi-instance.spec.ts`, broken into `test()` cases that map 1:1 to the checkboxes in `plans/e2e-multi-instance-patching.md`. Sharing one file keeps fixture setup (open patch in editor) cheap; per-test isolation comes from Playwright's per-test page context.
3. **Reuse existing helpers.** `e2e/helpers/auth.ts`, `e2e/helpers/user-owned-entities.ts` (and `linked-rack-scenario.ts` if needed for collection setup). Do not introduce a new helper folder; extend the existing helpers if a new utility is required (e.g., `findInstanceCard(label)`, `addCopy(moduleId)`).
4. **Selectors via component element names + `data-testid`** where the component already exposes one; otherwise locate by visible text matching the existing UI copy. Do not add new `data-testid` hooks in this chunk — that would be an app source change. If a selector is too brittle, log it in the Decision log and propose a targeted hook in a follow-up.
5. **Test data shape:** the dedicated test account must own (a) at least one patch with no instances yet (for the "0 → 2 → 3 cards" path), (b) at least one collection module suitable for the "Add Copy" flow, (c) at least one legacy patch (pre-instance) that loads without an instance row to prove back-compat. Set this up by reusing existing seed flows from `auth-patch-*` specs; do not write a new seeding RPC.
6. **Account rotation is a one-shot ops step** done by the executing agent (or user) on `https://supabase.com/dashboard`, not automated in this repo. The repo deliverable is: updated `.env.example` if needed, rotated GitHub Actions secrets `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`, and a confirmed green run of `pnpm test:e2e:auth`.
7. **No new Playwright projects, no new viewport, no new browser.** Reuse the existing `chromium` auth project. Adding configuration would muddy the chunk and break parity with other auth specs.
8. **Don't gate on Docs Screenshot Pipeline.** Once this chunk lands, that backlog item is unblocked, but it stays in the backlog until separately picked up.
9. **Local auth credentials are approved when present.** The CTO approved using local `.env` values for `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` during local E2E authoring. Do not print, reveal, commit, or otherwise expose secret values. GitHub Actions secret rotation is deferred and must remain documented as not completed; do not block local spec authoring on CI rotation.

#### Affected files

Test specs (new / extended):

- `e2e/auth-patch-multi-instance.spec.ts` (new) — primary deliverable, ten `test()` cases mapped to the plan checklist.
- `e2e/helpers/user-owned-entities.ts` (touch only if a new helper is genuinely needed; prefer extending existing exports).

Test infra / config (touch only if rotation requires it):

- `.env.example` — confirm the variable names `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` are present and documented; add a comment pointing at the dedicated test account.
- `playwright.config.ts` — read-only verification. Do not modify.
- `package.json` — read-only verification. Do not modify scripts.

Documentation:

- `internaldocs/workflow/plans/e2e-dedicated-test-account-cleanup.md` — append Decision log entry on completion of the rotation.
- `internaldocs/workflow/plans/e2e-multi-instance-patching.md` — tick the ten checkboxes and append Decision log entry.
- `internaldocs/workflow/COMPLETED.md` — move both plan entries when both chunks are green; archive the plan files to `plans/done/`.
- `internaldocs/workflow/TODO.md` — remove both `[ ] HIGH: E2E …` lines after archive.

App source: **none**. If a spec reveals a bug, file it as a separate plan; do not edit app code in this chunk.

#### Layered scope

##### MVP layer (must ship together)

The end-to-end deliverable: dedicated test account is in use **and** every multi-instance E2E checkbox is green.

- Chunk A. **Dedicated test account rotation.** Create the new Supabase test account, seed it with the data shape required by the auth E2E suite (existing specs are the reference set), update local `.env`, rotate GitHub secrets, run `pnpm test:e2e:auth` to confirm the existing auth suite is still green against the new account. Append Decision log to `plans/e2e-dedicated-test-account-cleanup.md`.
- Chunk B. **Spec scaffold + happy paths.**
  - Create `e2e/auth-patch-multi-instance.spec.ts` with `test.describe('Authenticated patch — multi-instance')` and a `beforeEach` that opens a known patch in the editor and confirms collection modules render as instance cards.
  - Implement: "Open patch in editor → cards visible", "Add Copy from 0 → two cards labelled (1)(2)", "Add Copy again → three cards", "Save + reload → instances and labels survive roundtrip".
- Chunk C. **Connection cases.**
  - Implement: "Connect CV from instance (1)", "Same output CV to instance (2) accepted", "Same connection again rejected as duplicate".
- Chunk D. **Destructive cases + back-compat.**
  - Implement: "Delete instance with connections → confirmation dialog", "Confirm deletion → instance removed, connections scrubbed, remaining renumbered", "Legacy patch (pre-instance) loads correctly".
  - Tick the ten checkboxes in `plans/e2e-multi-instance-patching.md`, append Decision log entries.

##### Structural layer

- If brittle locators surface during MVP, file a follow-up plan that proposes a small, targeted set of `data-testid` hooks on the relevant patch-editor templates. Do **not** add them in this chunk.
- If `e2e/helpers/user-owned-entities.ts` ends up with multi-instance utilities (e.g., `addCopy`, `instanceCardByLabel`), promote them to clearly named exports with JSDoc.

##### Polish layer

- Optional: a lightweight assertion that the auto-instance feature respects `prefers-reduced-motion` (would be a single new test; defer unless trivially additive).
- Optional: parametrise the spec over two starting patches (one with 1 instance pre-seeded, one with 0) to amplify coverage without doubling spec length.
- Optional: once the Docs Screenshot Pipeline Refresh runs, a screenshot of "patch with three instances" can be added to the dedicated screenshot spec — but that is the next domino, not this chunk.

#### Ordered execution chunks

The chunk order below is the contract for any execution agent. Do not reorder.

1. **Chunk A — Test-account rotation** (`plans/e2e-dedicated-test-account-cleanup.md`).
   1. Create a fresh Supabase user (e.g. `e2e-bot+patcher@…`); record the credentials in the user's password manager, **never** commit them.
   2. Seed the new account by signing in locally and reproducing the data shape that existing auth E2E specs assume. Spot-check by running `pnpm test:e2e:auth` against the new credentials in `.env`.
   3. Rotate GitHub Actions secrets `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` from the user's GitHub UI (this repo's tooling cannot rotate them autonomously).
   4. Re-run `pnpm test:e2e:auth` locally; confirm green.
   5. Append Decision log entry to `plans/e2e-dedicated-test-account-cleanup.md` (date, who, "rotated; existing auth suite green").
2. **Chunk B — Multi-instance happy paths.**
   1. Add `e2e/auth-patch-multi-instance.spec.ts` with `test.describe`, a `beforeEach` that opens a deterministic patch in the editor, and the four happy-path tests listed under MVP Chunk B.
   2. Run `pnpm test:e2e:auth --include="**/auth-patch-multi-instance.spec.ts"` until green.
3. **Chunk C — Connection cases.**
   1. Add the three connection tests; assert duplicate rejection surfaces the actual app behaviour (a notification or a refused mutation, whichever the editor uses today — discover from existing patch-editor specs, do **not** invent a new contract).
   2. Re-run targeted spec; green.
4. **Chunk D — Destructive + back-compat.**
   1. Add the three destructive / legacy tests; the legacy-patch case will require a known patch on the test account that has no instance rows.
   2. Tick the ten checkboxes in `plans/e2e-multi-instance-patching.md`; append Decision log entry.
   3. Run the full `pnpm test:e2e:auth` once more to confirm no regressions in the broader auth suite.
   4. Run `pnpm lint`. Test files do not need additional checks.
5. **Archive.** Move both plan entries to `COMPLETED.md`, archive the plan files under `plans/done/`, remove their lines from `TODO.md`.

#### Validation strategy

- After Chunk A: `pnpm test:e2e:auth` (full auth suite) — green.
- After each of Chunks B / C / D: `pnpm test:e2e:auth --include="**/auth-patch-multi-instance.spec.ts"` — green.
- After Chunk D: full `pnpm test:e2e:auth` — green; `pnpm lint` — green.
- Per `AGENTS.md §3`: do not introduce `npx ng test`, `ng test`, watch mode, or new Playwright projects.
- Trim test output: agents should report only the summary line and any failing test names, not full Playwright stdout.

#### Risks and unknowns

- **Selector brittleness.** Multi-instance UI labels and "Add Copy" / delete affordances may not have stable test selectors. Mitigation: locate by visible text mirroring existing auth specs; if a selector is brittle, log it in the Decision log and propose a follow-up `data-testid` plan rather than scattering hooks now.
- **Test-account seeding drift.** If the dedicated test account is missing a legacy (pre-instance) patch, the back-compat case can't run. Mitigation: as part of Chunk A, explicitly create one such patch via the existing patch-creation flow and snapshot its id in the Decision log.
- **Duplicate-connection rejection contract.** The exact UI signal (snackbar text, toast, silent rejection) is not documented in the plan. Mitigation: discover empirically from the editor, then encode the assertion to match what ships today; do not invent a contract.
- **CI auth secrets.** GitHub Actions secret rotation requires user-side action; agents cannot do it autonomously. Mitigation: agent prepares everything else, then surfaces a one-line "user must rotate `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` in GitHub Settings → Secrets".
- **Account 2FA / verification email loops.** Supabase's free-tier account creation may require email confirmation. Mitigation: use a real inbox the user controls; do not hard-code disposable addresses.
- **Scope creep into product code.** If a spec reveals a real auto-instance bug, the temptation will be to fix it inline. Mitigation: the CTO decision (#1 above) bans app source edits in this chunk.

#### Decision log

- 2026-06-18T11:49+02:00 — Planner persona switched the active feature from Manufacturer Accounts & Verification to E2E Test-Account Hardening + Multi-Instance Patching Coverage, on the user's explicit "decide for yourself" instruction. Manufacturer feature is parked because every M2–M7 chunk depends on M1 type-gen which is blocked by the no-Docker-no-local-Supabase environment plus the no-migrations-before-frontend rule, and a mocked-data frontend prototype would be throwaway code that fights the layering rule.
- 2026-06-18T11:49+02:00 — Folded `e2e-dedicated-test-account-cleanup` into this chunk as Chunk A because the multi-instance plan formally depends on it and both share the auth E2E harness; the cleanup alone was too thin to be the next chunk on its own.
- 2026-06-18T11:49+02:00 — Locked: no app source code changes, no new Playwright project / viewport / `data-testid` hooks in this chunk; brittle-selector finds become a follow-up plan.
- 2026-06-18T11:49+02:00 — Locked: spec lives in `e2e/auth-patch-multi-instance.spec.ts` as a single file with ten `test()` cases mapping 1:1 to the plan checklist.
- 2026-06-18T12:17+02:00 — CTO approved local `.env` E2E credentials for local auth E2E authoring, with secret values protected and CI/GitHub Actions secret rotation explicitly deferred.
- 2026-06-18T12:17+02:00 — Coordinator round landed the local-unblocked multi-instance happy-path scaffold and auth runner include handling. Runtime `pnpm test:e2e:auth --include="**/auth-patch-multi-instance.spec.ts"` currently skips because this worktree's `.env` keys are present but empty, so the plan stays active and unchecked until non-empty local values are supplied and the spec executes.
