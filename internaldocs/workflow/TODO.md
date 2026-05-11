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
> 5. **Do not duplicate** strategy rationale already in `../product/PRINCIPLES.md` or `../product/ROADMAP.md`; one sentence of
     context per task is enough.

**Tasks are ordered by priority within each section.**

---

## Legend

- `[ ]` — Not started
- `[~]` — In progress
- `[x]` — Done

## Active

- None right now. Pick the next concrete backlog item before starting more implementation work.

---

## Backlog

> Two tracks run in parallel: **Product** (user-facing features) and **Infra** (tests, tooling, hygiene).
> Product tasks are sequenced by the Tier 0 → Tier 1 → Tier 2 arc from [../product/ROADMAP.md](../product/ROADMAP.md).
> Infra tasks are independent and can be picked any time a product task is blocked.

---

### PRODUCT — Tier 0 (ship in any order; no external dependencies)

---

#### HIGH: iPad / Tablet Demo Hardening

**Why:** Recent internal audit found that the app is usable on a large tablet in many places but still carries too many
desktop-only assumptions for confident iPad demos. The biggest risks are not "mobile in general" — they are specific
touch-hostile interaction patterns in editing flows, floating UI collisions, keyboard/viewport assumptions, and a few
shared primitives that amplify friction across many screens.

- [x] Enlarge or simplify the highest-frequency touch targets (CV ports, dense icon rows, tiny toggles, crop nudge controls, selection dismiss)
 - [x] Reduce performance-heavy fixed overlays and other demo-visible motion/scroll pressure on iPad work surfaces

---

#### HIGH: Comments — Bug-fix Pass (entity detail pages)

**Why:** Three bugs in `getComments()` make entity-level comments broken in subtle ways. No sort order means comments
appear in random database storage order. No `.range()` means all comments for an entity load unbounded — a popular
module with 500 comments loads all 500 on every page visit. `remapErrors()` is commented out so network failures
silently swallow errors.

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
delete confirmation, and the character counter is hidden until users have already typed 1/3 of the limit.

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

#### MEDIUM: Module Details — Hidden Usage Counters

**Why:** Module detail currently only shows publicly listable racks and patches. A module can still be widely used in private
or otherwise non-publicly-listable contexts, but the page falls back to "No racks/patches using this module yet." Add a
privacy-safe aggregate so users can see that hidden usage exists without exposing who owns what.

- [x] Add a dedicated backend aggregate/RPC for module usage counts that returns public vs hidden rack/patch totals without
  returning private entity rows, ids, or authors
- [x] Define "hidden" to match "not shown in the current public lists" (private entity and/or non-public author profile),
  keeping backend semantics aligned with existing module-detail queries
- [x] Add threshold or bucket rules for low counts so tiny hidden cohorts do not leak sensitive ownership information
- [x] Update module detail UI copy so public lists can be supplemented by hidden/private usage counters when available
- [x] Add focused tests for the aggregate contract and the module-detail display states

---

#### MEDIUM: Module Browser — Tag Filter Loading Feedback

**Why:** Filtering the module browser by tag can take long enough to feel unresponsive. Users need immediate feedback that the
app is processing the filter change instead of looking stuck.

- [x] Add a visible loading state when tag selection triggers module-browser filtering
- [x] Keep the current results stable until the next filtered result set is ready, instead of flashing an ambiguous empty state
- [x] Make the loading feedback match the app's shared loading language rather than introducing a one-off spinner style
- [x] Ensure repeated tag changes do not leave the loader stuck or lagging behind the latest active filter
- [x] Add focused tests for the tag-filter loading state and completion transition

---

#### HIGH: User Area — Compact and Bound the Utility Rail

**Why:** The right side currently grows awkwardly and competes with the owned-content columns. Stats, contributor context,
comments-related signals, and manuals need to become a smaller bounded utility rail instead of an expanding parallel page.

- [x] Redefine the right side as a compact secondary rail with explicit height and overflow behavior on large screens
- [x] Split profile utility from contributor context so the rail reads as distinct supporting blocks instead of one long stack
- [x] Demote comments-related signals from a dominant right-rail presence so they do not visually outweigh modules, racks, and patches
- [x] Reduce manuals to a shorter quick-access surface with a smaller footprint while preserving fast entry to owned manuals
- [x] Document how the utility rail should collapse, stack, or move on narrower desktop and tablet widths

---

#### MEDIUM: User Area — Search and Surface Hierarchy Cleanup

**Why:** The floating search currently feels bolted onto the page and adds competition between overlays and the main user-area containers.

- [x] Decide whether search belongs in the page header/shell or as a clearly bounded utility surface, rather than an isolated floating element
- [x] Ensure search never obscures the owned-content columns or fights their internal scroll regions
- [x] Align the user-area search treatment with the shared floating-surface language from the UI consistency audit
- [x] Document z-order, safe-area, and responsive behavior so search supports the workspace instead of competing with it

---

#### LOW: Rack Details — Hide HP Override Counters During Image Upload / Update

**Why:** There is still a bug path where HP override counters can remain visible while uploading or updating the rack image.
We already have other mitigations around disabled HP-override UI, but this upload/update state appears to be missing a guard and
should hide those controls too whenever they would otherwise leak through.

- [x] Audit the rack image upload/update states and identify where HP override counters can still remain visible
- [x] Extend the existing HP-override visibility guards so upload/update mode hides the counters as well
- [x] Keep the fix narrow so it does not reintroduce HP-override UI in normal rack-detail viewing
- [x] Add focused coverage for image upload/update states where HP controls were previously suppressed by other mitigations

---

#### LOW: Patch Details — Modules Needed List Cleanup

**Why:** The "Modules needed" list currently uses icons that add little value, and multi-line names/manufacturer lines do not
align cleanly when an item wraps. This makes the list feel fussier and less polished than it needs to.

- [x] Re-evaluate whether the leading icon should be removed from the modules-needed rows entirely
- [x] Improve wrapped-row alignment so second lines sit cleanly with the text block instead of feeling offset by the icon column
- [x] Keep manufacturer text visually secondary without weakening scanability of the module name
- [x] Review the final row rhythm against nearby rack/patch stats surfaces so the simplified list feels calmer and more consistent

---

#### HIGH: Patch Details — Private Share-Link Behavior Is Broken / Misleading

**Why:** Patch details currently tell owners that a private patch "will be accessible to anyone who has the URL", but the
logged-out detail route only loads patches where `public = true`. In practice, shared links for private patches fail for
external viewers and can get stuck in a partial-loading state instead of showing a clear private / unavailable message.

- [x] Decide the intended product behavior: private patches are truly URL-shareable, or the UI copy must stop claiming that
- [x] Align patch-detail data loading with the chosen behavior so logged-out viewers do not hit the current public-only mismatch
- [x] Add an explicit non-loading state for private / unavailable patch links instead of leaving the page partially loaded
- [x] Audit rack/patch privacy copy so all shareability messaging matches real access behavior
- [x] Add focused coverage for owner view, anonymous view, and shared-link behavior for private vs public patches

---

#### LOW: Manufacturer Detail — Hide Empty Tile Divider When Actions Are Fully Disabled

**Why:** Some manufacturer-detail module tiles still show the lower divider even when the entire action area is effectively absent
because all related buttons are disabled. In that state the divider reads like a broken placeholder and should not be visible.

- [x] Audit the manufacturer-detail module tile states where the footer/action area is fully disabled or empty
- [x] Remove the divider in states where no visible buttons or footer actions remain
- [x] Keep the divider only when it is actually separating visible content blocks
- [x] Review the card rhythm so empty-action tiles do not look visually broken compared with tiles that still expose actions/tags

---

#### MEDIUM: Module / Patch Editing — Restore Compact CV Chip Sizing Outside Touch-First Layouts

**Why:** Input/output CV chips became too large because the recent iPad/tablet touch-target pass widened shared touch tokens at
`max-width: 72.5rem`, and `module-cvitem.component.scss` now applies prominent `min-width`, `min-height`, padding, and margin
to every `app-module-cvitem` inside that range. Since that component is reused in module detail and patch editing flows, the
tablet-sized treatment now leaks into normal desktop and patch-editing layouts where the previous denser rhythm was correct.

- [x] Narrow the enlarged CV-chip treatment so it only applies where touch-first affordances are actually intended (coarse pointers, true tablet layouts, or a smaller explicit breakpoint)
- [x] Restore the previous compact padding and footprint for desktop CV chips in both module detail and patch editing contexts
- [x] Audit every `app-module-cvitem` consumer so the fix lands consistently across module detail, patch editor, and related CV/connection surfaces
- [x] Explicitly protect the current floating/overlay editing controls so this rollback does not change the button sizing that already feels correct
- [x] Add focused coverage for CV-chip sizing across desktop vs tablet contexts to prevent another cross-surface regression

---

#### LOW: App Shell — Keep the Patcher Toolbar Entry in Brand Color When Active

**Why:** The Patcher entry in the toolbar should always preserve the brand color instead of falling into the purple visited/active
HTML-link look when clicked. This is a brand-consistency issue, not a state meant to inherit default browser link styling.

- [x] Define the toolbar rule that the Patcher brand entry keeps brand color in default, active, focused, and visited states
- [x] Remove any reliance on raw HTML link color behavior for the active/clicked state of that brand entry
- [x] Keep interaction feedback through non-color cues if needed, without sacrificing the brand color treatment
- [x] Review neighboring toolbar items so the branded entry remains distinct while the rest of the navigation keeps its normal state behavior

---

#### MEDIUM: Rack Editor — Collection-Only Module Filter

**Status:** Implemented on 05-11. Rack editing now supports owned-only vs full-catalog browsing in the embedded module
browser. The adaptive threshold is **20 collection modules**: below that, the picker defaults to full catalog; at or above
that, it defaults to owned-only. Owned mode defaults to HP-first ordering, includes contextual empty-state guidance, and
remains a convenience filter only rather than a rack restriction.

---

#### LOW: Discovery Tips — Speed and Positioning

**Why:** Tips in the user area cycle too fast to read or interact with, and their screen position feels off.

- [x] Slow down auto-cycle interval — 8s cooldown after acknowledge/snooze; displayDelayMs bumped to 3s
- [x] Review tip overlay positioning — pinned to bottom-right safe zone to avoid obscuring key areas
- [x] Consider a dismiss/pause gesture so tips don't block normal use

---

#### MEDIUM: Rack Balance Analysis — Exclude Blank Modules From Coverage

**Why:** User feedback surfaced a mismatch in the rack balance coverage stat: a rack with 39 modules reports only 38
modules in coverage when one slot is a blank spacer. The likely root cause is that `rack-balance-analysis.service.ts`
counts blanks in `totalModules` / confidence math even though blanks never contribute balance tags. Older rack stats
already exclude `BLANK_MODULE_IDS`, so this newer analysis surface should follow the same rule.

- [x] Filter blank spacer modules out before computing `modules.length`, `confidence`, and low-data thresholds in
  `rack-balance-analysis.service.ts`
- [x] Make blank-only racks behave like an empty rack for the balance panel instead of a low-confidence tagged rack
- [x] Keep coverage copy aligned with the filtered denominator so the UI and tooltip both report non-blank module counts
- [x] Add focused tests for mixed real+blank racks and blank-only racks

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

### PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live)

---

#### HIGH: Manufacturer Accounts & Verification

**Why:** Manufacturer pages need a trustable ownership model before official-field editing, updates, analytics, or B2B surfaces can ship.
**Blocked on:** Explicit user approval for any required Supabase/RLS policy work around `manufacturer_accounts`.

- [ ] Add the minimal `manufacturer_accounts` table shape and generated types once policy work is approved
- [ ] Add claim read/create methods scoped to manufacturer detail surfaces
- [ ] Add CTA states for claim, pending review, and ownership-review request
- [ ] Limit first verified edits to official profile fields, MSRP, and official links
- [ ] Keep shared catalogue edits audited or review-gated

---

---

#### LOW: Manufacturer Updates / Featured Surface

**Why:** Verified manufacturers need a compact way to highlight new releases, updated modules, featured products, and
important notices without turning Patcher into a blog platform.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Add manufacturer-owned update entries with title, body, timestamp, optional linked module
- [ ] Add "featured modules" controls for verified manufacturers
- [ ] Show a compact "what's new" / "featured" section on manufacturer detail pages
- [ ] Define hard constraints up front: posting limits, entry length, expiry/archive model, and reporting flow
- [ ] Define moderation / visibility rules for official update entries

---

#### LOW: Manufacturer Analytics

**Why:** Verified manufacturers need aggregate insight into catalogue performance and audience interest inside Patcher.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Validate with a small set of boutique manufacturers what they would actually want from analytics before building it
- [ ] Define privacy-safe aggregate metrics (views, outbound clicks, collection count, public rack count, public patch count)
- [ ] Define minimum thresholds below which metrics are hidden instead of shown
- [ ] Add manufacturer dashboard queries / aggregation layer
- [ ] Add private analytics UI for verified manufacturers
- [ ] Document privacy boundaries so no user-level ownership data is exposed

---

#### LOW: Manufacturer API / Widgets Pilot

**Why:** Long-term B2B angle — let manufacturers use Patcher as lightweight catalogue infrastructure, not only a public page.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Decide first deliverable: narrow embeddable widget vs authenticated API, using the smallest credible B2B wedge
- [ ] Define manufacturer-owned fields safe for programmatic access
- [ ] Design minimal auth / key model for verified manufacturers
- [ ] Pilot one narrow integration path (e.g. module card widget or official-profile sync)

---

### PRODUCT — Tier 3 (valuable once community layer is active)

---

#### LOW: Application Statistics & Data Insights — Expansion

**Why:** The insights page now covers headline counts and rounded derived signals, but there is still room for richer public-safe exploration once there is enough signal to support more specific patterns without thin-sample noise.

- [x] Decide the smallest reusable chart/stat vocabulary worth adding beyond the current stat-card page
- [x] Add deeper public-safe blocks for catalogue health, rack composition, and patch/network patterns only where the sample is credible
- [x] Define stronger freshness / coverage / suppression language for any richer multi-metric insight sections
- [x] Decide which deeper analysis directions are worth later investment (co-occurrence, trends, rare-module discovery, archetypes)

---

### INFRA (independent; pick any time a product task is blocked)

---

#### HIGH: Insights — Backend Aggregation and Cached Snapshot

**Why:** `/insights` currently builds the page from many count queries plus paged scans of public rows. That is acceptable
for a dev-only rollout, but a public launch should move the heavy work server-side and return a compact cached payload.

- [x] Decide the first production shape: summary tables / materialized views vs a server function returning one payload
- [x] Pre-aggregate the public insights inputs so the page stops scanning full public module / rack / patch datasets on cold load
- [x] Add an explicit cache / refresh strategy for the public insights snapshot
- [x] Switch the page to the compact backend response and keep methodology copy aligned with the new aggregation model

---

#### HIGH: Security — Enforce Public Profile Privacy Server-Side

**Why:** The public-profile feature currently depends on client-side gating plus existing Supabase policy behavior. Public
rack/patch reads should be hardened so a private profile cannot still expose its publicly flagged content through direct API
queries.
**Constraint:** Any RLS/policy change in this task requires manual user approval before implementation; agents may investigate
and propose but must not apply such changes autonomously.

- [x] Verify current Supabase RLS behavior for `profiles`, `patches`, and `racks` against the public-profile privacy model
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
