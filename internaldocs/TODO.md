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

> Archived in [COMPLETED.md](./COMPLETED.md). Keep one-line summaries there.

> **ABANDONED Feb 21:** Integration test for first-click CV highlight bug
> (`patch-editor-cv-highlight.integration.spec.ts`). Test confirmed failing; fix not worth effort. File kept as
> race-condition documentation.

---

## Active

*(none — see Backlog)*

---

## Backlog

> Two tracks run in parallel: **Product** (user-facing features) and **Infra** (tests, tooling, hygiene).
> Product tasks are sequenced by the Tier 0 → Tier 1 → Tier 2 arc from PRODUCT_NEEDS.md.
> Infra tasks are independent and can be picked any time a product task is blocked.

---

### PRODUCT — Tier 0 (ship in any order; no external dependencies)

---

#### HIGH: Comments — Bug-fix Pass (entity detail pages)

**Why:** Three bugs in `getComments()` make entity-level comments broken in subtle ways. No sort order means comments
appear in random database storage order. No `.range()` means all comments for an entity load unbounded — a popular
module with 500 comments loads all 500 on every page visit. `remapErrors()` is commented out so network failures
silently swallow errors. Full analysis in `internaldocs/tracked-use-cases/comment-feature-rework.md`.

- [x] Add `.order('created', { ascending: false })` to `getComments()` in `supabase-queries.ts` (bug C-1)
- [x] Uncomment `remapErrors()` in `getComments()` (bug C-3)
- [x] Add `.range(from, to)` + `{ count: 'exact' }` parameters to `getComments()` and update `CommentsDataService` to
  expose `commentsCount$` and forward pagination params; add a "Load more" button to `comments-root.component.html`
  (bug C-2)
- [x] Fix `@for (item of data; track item.id)` (was `track item`) in `comments-item-block.component.html`
- [x] Delete the empty `CommentsEditorComponent` stub and remove its declaration from `comments.module.ts`
- [x] Remove `deletedAt?` from `DbComment` model (field not in DB schema)
- [x] Write / update unit tests for `getComments()` to cover ordering, range, and error propagation

---

#### MEDIUM: Comments — UX Improvement Pass

**Why:** Several UX gaps make the comment flow feel rough: patch context is broken in the user area, there is no
delete confirmation, and the character counter is hidden until users have already typed 1/3 of the limit. Full
analysis in `internaldocs/tracked-use-cases/comment-feature-rework.md`.

- [x] Implement `PATCH` case in `CommentContextComponent` so patch comments in the user area show a navigable context
  link (bug M-1)
- [x] Add delete confirmation (inline snackbar-undo or small dialog) before `deleteComment$.next()` fires (Mo-2)
- [x] Show character counter from the first keystroke (or ≥ 10% threshold) instead of after 333 chars; optionally
  colour-code at 80% / 95% (Mo-1)
- [x] Add an in-flight spinner to the submit button and prevent double-submission while the server round-trip is in
  progress (partial fix for M-2)

---

---

#### ~~HIGH: Patch Editor — Report Issue Button Still Visible (regression)~~

**Resolved:** Root cause was two unrelated build errors (`user-patches.component.html` had `async` pipe inside event binding; `rack.module.ts` was missing `ReactiveFormsModule`) that prevented the app from compiling the fix. The guard `@if (!viewConfig.hideReportIssue && !viewConfig.hideButtons)` in `module-details.component.html` is correct; patch editor's `modulesViewConfig` has both flags `true`.

- [x] Investigate why `hideReportIssue: true` in patch editor's `modulesViewConfig` does not hide the `app-module-flag` in `module-details`
- [x] Fix the root cause and verify button is hidden during patch editing but visible everywhere else

---

#### LOW: Module Details — Panel Images Overflow Parent Width

**Why:** When panel images are very large they overflow out of the parent container on the module details page. Need CSS to constrain images to parent width.

- [x] Add `max-width: 100%` (or equivalent) to panel gallery images in `module-details.component.scss`
- [x] Verify images scale down correctly without breaking the gallery layout

---

#### LOW: Discovery Tips — Speed and Positioning

**Why:** Tips in the user area cycle too fast to read or interact with, and their screen position feels off.

- [x] Slow down auto-cycle interval — 8s cooldown after acknowledge/snooze; displayDelayMs bumped to 3s
- [x] Review tip overlay positioning — pinned to bottom-right safe zone to avoid obscuring key areas
- [x] Consider a dismiss/pause gesture so tips don't block normal use

---

#### MEDIUM: Patch Tags — Phase 1 (Solo Organisation)

**Why:** Solo org value now (filter own patches); unlocks Collection-Aware Discovery later. Free-form tags, no taxonomy
yet.

- [x] Add `tags` (text array) to `patches` in `database.types.ts`
- [x] Add `update.patchTags()` to `supabase-update.ts` with `cacheBust(['patches'])`
- [x] Inline chip tag editor in patch editor, auto-save on change
- [x] Tag filter in patch browser (own patches)
- [x] Write tests for update service and filter logic

---

#### LOW: Create Rack Dialog — Privacy Selection

**Why:** New racks are created public by default with no way to set privacy at creation time. Users must edit the rack after creation to make it private. The dialog should include a privacy toggle.

- [x] Add public/private toggle to the "Create new rack" dialog
- [x] Default to private (safer default; user can explicitly make it public)
- [x] Pass the selection through to `add.rack()` backend call

---



**Rack-local HP override status:** UI intentionally removed. Do not treat this as approved product scope.

- [ ] Figure out why rack-local HP override was added and whether any underlying plumbing should remain at all
- [ ] Keep rack editor UI entry points disabled until there is explicit product approval

---

#### LOW: Multi-Instance — Guard Against Ambiguous Collection-Card Wiring

**Why:** CVs clicked from collection cards when instances exist produce ambiguous connections ("mystery node" in graph).
**Decision needed first:** Prompt to pick an instance, or block collection-card wiring entirely when instances exist?

- [ ] Decide guardrail approach (prompt vs block)
- [ ] Implement guard in patch editor CV click handler
- [ ] Write targeted unit test

---

### PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live)

---

#### MEDIUM: Manufacturer Accounts (Claim & Editable Profile)

**Why:** Manufacturers claim their page, manage profile data, submit official MSRP.
**Depends on:** Manufacturer Page Phase 2 live.
**Scope:** Auth-gated edit surface. New `manufacturer_accounts` table links `user_id` → `manufacturer` entity. Profile
fields (name, logo, website, bio) are manufacturer-owned; module data edits go through UGC review queue.

- [ ] Add `manufacturer_accounts` table (user_id, manufacturer_id, verified, created_at) to `database.types.ts`
- [ ] Add `manufacturer_accounts` to `DbPaths` in `DatabaseStrings.ts`
- [ ] Add `add.manufacturerAccountClaim()` and `get.manufacturerAccountForUser()` to `supabase.service.ts`
- [ ] "Claim this page" button on manufacturer detail (auth-gated; one pending claim per manufacturer; manual admin
  approval via Supabase dashboard)
- [ ] Verified: unlock edit controls (name, logo URL, website, bio, social links)
- [ ] Add `update.manufacturerProfile()` with `cacheBust(['manufacturerWithId'])`
- [ ] Verified badge on manufacturer page and on module cards from that manufacturer
- [ ] MSRP field per module (visible to verified account only; feeds Price Hub label hierarchy)
- [ ] Write tests for claim flow and profile update

---

### INFRA (independent; pick any time a product task is blocked)

---

#### HIGH: Security — Enforce Public Profile Privacy Server-Side

**Why:** The public-profile feature currently depends on client-side gating plus existing Supabase policy behavior. Public
rack/patch reads should be hardened so a private profile cannot still expose its publicly flagged content through direct API
queries.
**Constraint:** Any RLS/policy change in this task requires manual user approval before implementation; agents may investigate
and propose but must not apply such changes autonomously.

- [ ] Verify current Supabase RLS behavior for `profiles`, `patches`, and `racks` against the public-profile privacy model
- [x] Enforce profile-level visibility on public rack/patch reads server-side (policy and/or query-layer hardening)
- [x] Add regression coverage for private-profile API access paths so the privacy boundary is not UI-only

---

#### HIGH: Security — Fix Dependabot Vulnerability Alerts

**Why:** GitHub flagged 18 vulnerabilities on the default branch (8 high, 10 moderate). Review and resolve via Dependabot.

- [x] Review alerts at https://github.com/Polyterative/Patcher/security/dependabot
- [x] Apply fixes (upgrade or patch affected dependencies)
- [x] Re-run `pnpm test-headless` to confirm nothing breaks

---

#### HIGH: E2E — Dedicated Test Account Cleanup

**Why:** E2E credentials are coupled to a personal Supabase account — should use a dedicated test account.

- [ ] Create dedicated Supabase test account (email/password)
- [ ] Update local `.env` and rotate GitHub secrets `E2E_TEST_EMAIL` + `E2E_TEST_PASSWORD`
- [ ] Re-run `pnpm test:e2e:auth` to confirm

---

#### HIGH: E2E — Multi-Instance Patching

**Why:** Auto-instance feature has 30 unit tests but no E2E coverage through the real UI.
**Depends on:** Dedicated test account (above).

- [ ] Open patch in editor → verify collection modules appear as cards
- [ ] "Add Copy" from 0 instances → verify 2 cards with labels (1)(2)
- [ ] "Add Copy" again → verify 3 cards
- [ ] Connect CV from instance (1) → verify connection recorded
- [ ] Same output CV to instance (2) → verify accepted
- [ ] Same connection again → verify rejected as duplicate
- [ ] Delete instance with connections → verify confirmation dialog
- [ ] Confirm deletion → instance removed, connections scrubbed, remaining renumbered
- [ ] Save + reload → connections and instances survive roundtrip
- [ ] Legacy patch (pre-instance) → loads and displays correctly

---

#### ON HOLD: SEO — OG Image Generation

**Paused 2026-02-23.** Resume when Manufacturer Page Phase 1 is live (manufacturer pages need OG images too).

Completed: sitemap, robots.txt, canonical URLs, JSON-LD, llms.txt, og:image dimensions, bot cache headers (partial).

Remaining:

- [ ] OG image generation endpoint (`@vercel/og`)
- [ ] Middleware wiring to generated OG image URLs
- [ ] Rich preview validation (Telegram / WhatsApp / Slack + debuggers)
- [ ] Visual polish pass

---

#### POLICY: Unit Test Coverage

Target: statements and lines ≥ 75% (baseline 03-02: ~57%).
Not a blocking task — coverage rises naturally as new features ship with tests.
If coverage stalls after two feature completions, revisit as a targeted task:

- Highest-yield uncovered files: `rack-detail-data.service.ts`, `module-detail-data.service.ts`,
  `user-area-data.service.ts`

---

## Long-term Ideas

> Not yet broken into executable steps. Strategy and rationale in [PRODUCT_NEEDS.md](./PRODUCT_NEEDS.md).

**Tier 1 — Community Foundation**

- Public User Profiles — gate for marketplace and community price reporting
- Contextual Activity — inline activity on module/patch/rack pages (companion to profiles, not a gate)

**Tier 1–2 — Price Hub**

- Cross-store price display (read-only, Tier 1)
- Price history charts (Tier 1 for scraped data)
- Community price reports (Tier 2, requires profiles)

**Tier 2 — Market Layer**

- Peer-to-peer module listings from collection; one-way inquiry contact model

**Tier 3 — Discovery & Depth**

- Collection-Aware Patch Discovery — "patches I can play right now" subset query (requires Tags + community layer)
- User Organization — folders/sets on top of Patch Tags

**Tier 3 — Catalogue & UX**

- Manufacturer Accounts MSRP → Price Hub integration
- PWA Support — service worker, offline for marketplace/price hub
- Patch Graph Enhancements — color coding, connected-input indicators
- Dark Mode — CSS variable theme system (after component library is stable)
