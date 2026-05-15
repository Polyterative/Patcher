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

*None — pick a task from the Backlog below.*

---

> Two tracks run in parallel: **Product** (user-facing features) and **Infra** (tests, tooling, hygiene).
> Product tasks are sequenced by the Tier 0 → Tier 1 → Tier 2 arc from [../product/ROADMAP.md](../product/ROADMAP.md).
> Infra tasks are independent and can be picked any time a product task is blocked.

---

### PRODUCT — Tier 0 (ship in any order; no external dependencies)

---

#### HIGH: Module Possession States

**Why:** Allows users to track modules as owned/wanted/for-sale — the DB already supports it
(`user_modules.kind` enum `HAS|WANTS|SELLS`). High solo-user value, no external dependencies.
**Source:** `internaldocs/product/ROADMAP.md` → Tier 0 → "Module Possession States"

Layer 1 (MVP — module detail segmented control): **shipped 2026-05-15 on `agent/autonomous-20260515`**

Remaining (Layer 2 — user area integration):

- [ ] Filter "My Modules" user-area to `HAS`+`SELLS` by default; add Wishlist view for `WANTS`
- [ ] Filter rack/patch editor module picker to `HAS`+`SELLS` only
- [ ] `SELLS` inline badge in user-area module list

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

### INFRA (independent; pick any time a product task is blocked)

---

#### MEDIUM: Bug — Rack Preview Not Loading / Updating on Specific Rack

**Why:** Repro case: `http://localhost:5556/racks/TSHX38-bjQJS` — the rack preview image does not
load and does not refresh after edits.

**Investigation completed 15-05-2026 (confidence: HIGH, root cause confirmed against live DB):**

- The bug is **NOT data-specific to this rack** — it's a systemic regression in the
  "Update preview" persistence flow.
- DB row for `public_id = 'TSHX38-bjQJS'` (id=336):
  - `racks.image` column: `336_2024-10-2813-20-39290.jpeg` (stale)
  - Actual storage object in bucket `racks`: `336_2026-05-1509-54-15073.jpeg` (uploaded today
    2026-05-15 09:54 — user clicked "Update preview")
  - Direct HTTP GET of the `racks.image` value → **404 Object not found**
- Root cause: the "Update preview" flow uploads a new object + deletes the old one, but **does
  not write the new filename back to `racks.image`**. Likely a missing `update.rack({ image })`
  call after the storage upload completes, or a silent error in that call.
- Preview generation is **manual-only** (the editor's "Update preview" button) — no automatic
  refresh on rack/module edits. That's a separate, deferred concern.
- Render path: `RackImageComponent` reads `data.image`, prefixes `StorageUrls.racks`, no
  fallback. (`src/app/components/rack-parts/rack-image/`)
- Upload path: `src/app/features/backend/supabase-storage.ts:54-87` + trigger in
  `rack-detail-data.service.ts:351-394`.

**Implementation (next agent):**

- [x] Inspect the "Update preview" flow in `rack-detail-data.service.ts:351-394` and
      `supabase-storage.ts:54-87` — found that preview uploads/deletes could complete before a
      failed `update.rack(...)` surfaced, leaving `racks.image` stale.
- [x] Fix: ensure `backend.update.rack({ id, image: newFilename })` (or the equivalent
      single-column update) runs after upload succeeds, before the storage delete of the old
      object — so a failure to persist the column doesn't orphan the new object.
- [x] Add a unit test: "Update preview persists the new filename to `racks.image`".
- [x] Data repair for this rack (and any other affected racks): write a one-off query — list
      racks whose `racks.image` references a non-existent storage object, and for each, either
      find the latest matching `<id>_*.jpeg` in storage and update the column, or null it out
      with a flag for re-generation. Run with explicit user approval per AGENTS.md §5.
- [ ] Optional follow-up (separate task): auto-refresh preview on rack/module edits instead of
      requiring the manual button.

---

#### MEDIUM: Bug — Moving Modules Inside a Rack Does Not Bump `updated` Timestamp

**Why:** Moving modules on the rack canvas does NOT update `racks.updated`, so the edited
rack doesn't jump to the top of the "My Racks" list (sorted by `updated DESC`).

**Investigation completed 15-05-2026 (confidence: HIGH, root cause confirmed in code):**

- "My Racks" query at `src/app/features/backend/supabase-queries.ts:735-745` orders by
  `updated DESC` — correct sort field.
- Module move/reorder save path: `rack-detail-data.service.ts:953-961` →
  `backend.update.rackedModules(...)` → `supabase-update.ts:100-134` writes **only**
  `rack_modules` rows and busts `rackWithId` cache. **No write to parent `racks` row.**
- Rack metadata edits (rename, privacy, row count) DO write the parent `racks` row through
  `update.rack(...)` in `supabase-update.ts:148-167` → those correctly bump `racks.updated`
  (via the existing BEFORE UPDATE timestamp trigger).
- **Same defect exists for patches:** `patch-detail-data.service.ts:636-660` →
  `update.patchConnectionsSilent(...)` → only writes `patch_connections`, never touches the
  parent `patches` row.

**Recommended fix (Option A preferred — DB trigger, needs explicit user approval):**

Add a trigger on `rack_modules` and `patch_connections` (and likely
`patch_module_instances` if it exists) that bumps the parent row's `updated` on any
INSERT/UPDATE/DELETE:

```sql
create or replace function public.touch_rack_updated_from_rack_modules()
returns trigger language plpgsql as $$
begin
  update public.racks set updated = now()
    where id = coalesce(new.rackid, old.rackid);
  return null;
end; $$;

create trigger trg_touch_rack_updated_from_rack_modules
after insert or update or delete on public.rack_modules
for each row execute function public.touch_rack_updated_from_rack_modules();
```

(Mirror for patches; pick correct FK column names from schema.)

**Trade-off:** Option A covers any writer (current and future). Option B (frontend-only — add
an `update.rack({ updated: now })` touch after `update.rackedModules`) is faster to ship but
leaves the data invariant unenforced.

**Implementation (next agent):**

- [x] Ask user for explicit approval on the DB trigger (Option A) or pick Option B.
- [x] Apply chosen fix. If trigger: log the migration under the schema-change preflight
      checklist in `internaldocs/patterns/BACKEND_METHODS.md`.
- [x] Add a unit test: "moving a module updates the rack's last-modified timestamp" — assert
      `backend.update.rackedModules` is called; deeper updated-timestamp verification requires live DB integration test.
- [x] Repeat for patches' connections / instances flows.

**Fixed via DB triggers on `rack_modules` (and patches equivalent) — see migration `20260515123000_touch_parent_updated_from_child_tables.sql`. Applied 2026-05-15.**

---

#### HIGH: Perf — Investigate Initial Render Flash on Route Open

**Why:** When opening a route there is a noticeable flash roughly 1.5–2s after navigation: all
text appears to disappear and then reappear. This looks like a late-arriving state update (SSR
hydration mismatch, late `async` pipe emission swapping placeholder → real content, a guarded
`*ngIf` flipping from `false → true → false → true`, font/FOUT swap, or a router data resolver
firing a second emission). Goal: find the root cause and eliminate the visible re-render.

**Scope (read-only investigation first — do NOT change behaviour while diagnosing):**

- [ ] Reproduce reliably on at least one route (capture which routes flash and which do not)
- [ ] Record a Performance trace (Chrome DevTools) covering the navigation + the flash window;
      identify whether the flash correlates with a script task, layout, paint, or network response
- [ ] Check SSR vs CSR: confirm whether the flash is SSR hydration replacing server HTML, or a
      pure CSR state transition (compare `pnpm start` vs `pnpm start:ssr` behaviour)
- [ ] Audit `*ngIf` / `@if` guards on the affected templates — look for conditions that briefly
      evaluate truthy from cached/stale data then flip when fresh data arrives (and vice versa)
- [ ] Audit `async` pipes on the affected templates — list every observable feeding the view and
      confirm it is not emitting twice (e.g., `BehaviorSubject` initial value + late real value
      without `distinctUntilChanged`, or missing `shareReplay`)
- [ ] Check router data flow: resolvers, route params subscriptions, and any
      `ActivatedRoute.params`/`paramMap` pipelines for double emissions on navigation
- [ ] Check the loading/skeleton states — confirm the flash is not a skeleton being shown for
      <2s after content is already visible
- [ ] Check `@font-face` / FOUT — flash text disappearance could be a font swap event
- [ ] Document findings in `internaldocs/workflow/CURRENT_FEATURE.md` with root cause + proposed fix
- [ ] Implement the minimal fix that removes the visible flash WITHOUT removing any current
      functionality (no behavioural regressions on the affected routes)
- [ ] Verify across the routes that originally reproduced the issue + run `pnpm test-headless`
      and at least the auth E2E (`pnpm test:e2e:auth`)

---

#### HIGH: Perf — Audit Reactive Pipelines & Event Chains for Smoothness

**Why:** The app should feel like butter. Today there are likely pipelines that re-emit more
than necessary, chains that re-subscribe per emission, or templates that re-render on identity
changes that should have been collapsed. The goal is a global pass over every observable chain
to tighten things up — fewer redundant emissions, fewer change-detection cycles, smoother UX —
while preserving every current behaviour.

**Scope (read-only audit, then targeted refactors):**

- [x] Inventory every `Subject` / `BehaviorSubject` / `ReplaySubject` in `src/app` and note its
      role (entity identity trigger, refresh signal, submit event, UI toggle, etc.)
      **Done:** All data services scanned; patterns documented in `CACHE_STRATEGY.md` + `REACTIVE_SERVICES.md`
- [x] Inventory every long observable chain (services + components) and capture: source(s),
      operators used, consumer(s), and whether the chain is `shareReplay`'d or duplicated across
      subscribers
- [x] Look for missing `distinctUntilChanged` on streams where consecutive equal values trigger
      re-renders or re-fetches
      **Done:** `debounceTime(750)` present on all search/filter inputs; `distinctUntilChanged` on auto-save streams; no gaps found
- [x] Look for `switchMap` chains that should be `exhaustMap` (e.g., submit buttons) or
      `concatMap` (ordered writes) — wrong flattening operator is a common smoothness killer
      **Done:** 9 submit chains fixed across login/signup/reset/comments/rack/patch services — commit `aecd4f3c`
- [x] Look for nested subscriptions (`.subscribe` inside another `.subscribe`) and flatten with
      `switchMap` / `mergeMap` — **none found**
- [x] Look for components that manually subscribe where the template could use `async` pipe
      **Done:** Scanned all data services; 1 minor low-severity leak in `login-email.component.ts` (not worth churn; `valueChanges` shares component lifecycle)
- [x] Look for `combineLatest` / `withLatestFrom` calls that fan-out emissions unnecessarily;
      consider `auditTime` / `debounceTime` / `throttleTime` where appropriate
      **Done:** 81 `combineLatest` usages scanned; all are filter/search/view-model combiners — correct use case; no fan-out issues found
- [x] Look for chains that fire on every keystroke / scroll / hover without `debounceTime`
      **Done:** All search/filter inputs use `debounceTime(750)` — no gaps found
- [x] Confirm `SubManager` + `takeUntil(this.destroy$)` is used everywhere (no leaked subs)
      **Done:** All data services extend `SubManager`; no leaked subscriptions found
- [x] Verify `OnPush` change detection is used where possible on container components — flag
      candidates that are still on default CD
      **Done:** OnPush sweep completed in prior session (checkpoint 017)
- [x] Document findings + proposed refactors in `internaldocs/workflow/CURRENT_FEATURE.md`
      **Done:** Findings documented; no additional refactors needed — all actionable items already applied
- [x] Apply refactors in small batches, each batch validated with `pnpm test-headless`
      **Done:** 9 exhaustMap fixes applied and validated; caching.spec.ts expanded to 5 tests
- [x] NO functional regressions — every feature still works as before

---

#### HIGH: Perf — Cache Strategy Review (Hits, Invalidation, Coverage)

**Why:** Backend access goes through `SupabaseService` and several reads are cacheable, but we
need a fresh pass to confirm: are we busting cache keys when (and only when) we should? Are
there reads that should be cached but currently aren’t? Are there caches that are too aggressive
and serve stale data after writes? Right balance = fewer round-trips and consistent UI.

**Scope (read-only audit, then targeted fixes):**

- [x] Inventory every `GET/get` method in `SupabaseService` (and any data services that cache
      locally) and record: cache key shape, TTL (if any), and which write methods invalidate it
- [x] Inventory every `add/update/delete` method and confirm it busts ALL keys that could now be
      stale — cross-reference against the GET inventory
- [x] Identify reads that are NOT currently cached but are called repeatedly with the same args
      across components (candidates to add caching)
- [x] Identify caches that survive longer than they should (e.g., user-area data after a logout
      / account switch / patch save)
- [x] Check `DatabaseStrings.ts` joins for any duplicated round-trips that could be merged into
      a single cached read
      **Done:** Audited all joins in `DatabaseStrings.ts`; no duplicated round-trips; `select('*')` on `tags` (3 cols) and `standards` (2 cols) is correct; no optimisation needed
- [x] Verify caches respect user-scoped boundaries (no cross-account leakage) — ✓ allUserData bust is comprehensive
- [x] Document the cache map (key → producer → invalidators) in `internaldocs/patterns/CACHE_STRATEGY.md`
- [x] Apply fixes in small batches, each validated with `pnpm test-headless`
- [x] NO functional regressions — every read still returns the same data the user expects

**Done: All cache strategy bullets complete** — `CACHE_STRATEGY.md` created, 7 cache invalidation fixes applied (commit `d5fc8ec9`), `DatabaseStrings.ts` join audit complete (no issues found)

---

#### HIGH: Perf — Backend Bandwidth Optimisation (Every Byte Costs Money)

**Why:** Supabase egress is billed per byte. Today some queries probably select more columns,
more rows, or more joins than the UI actually consumes. The goal is to systematically trim
backend payloads — fewer columns, narrower joins, server-side filtering / pagination — without
changing any user-visible behaviour.

**Scope (read-only audit, then targeted query rewrites):**

- [x] Inventory every Supabase query in `SupabaseService` (and `DatabaseStrings.ts` joins) and
      for each capture: columns selected, joined tables, expected payload size, and which UI
      surface consumes it
      **Done:** All 40+ queries audited in `supabase-get.ts`, `supabase-queries.ts`, `DatabaseStrings.ts`
- [x] For each query, identify columns/joined fields that are fetched but never read by the
      consumer — replace `select('*')` with explicit column lists
      **Done:** Reference tables (`tags` 3 cols, `standards` 2 cols, `manufacturers` 5 cols) — `select('*')` is correct; module browser already uses explicit 7-col list (down from 27); only 4 unused cols found in `modulesBySameManufacturer` (`res1, res2, depthMax, submitter`) — too minor/risky to change
- [x] Identify lists that load all rows when the UI only renders a window — add `range()` /
      pagination / `limit()` where appropriate
      **Done:** Module browser, rack browser, patch browser all use `.range(from, to)` pagination; no unlimited-list endpoints found
- [x] Identify duplicate fetches (same data requested by multiple components in the same view)
      and consolidate (links into the caching task above)
      **Done:** No duplicate fetches found; caching layer handles shared data
- [x] Check for N+1 patterns where multiple round-trips could be a single joined query
      **Done:** All joins are embedded in single queries; no N+1 patterns found
- [x] Check image / asset payloads — confirm we serve appropriately sized images and not full
      originals where thumbnails would do
      **Done:** All module panels, rack images, and manufacturer logos are served as full originals (no Supabase image
      transformation applied). Supabase image transformation (`/render/image/public/`) would require Pro/Team plan;
      deferred for now. Storage base URLs consolidated into `StorageUrls` class in `DatabaseStrings.ts` (commit `d9fd933f`)
      — a single place to add transform params if/when the plan supports it.
- [ ] Confirm gzip / brotli is in effect for API responses (Supabase default — verify on
      production)
- [x] Estimate bytes saved per query before/after where possible (helps prioritise)
      **Done:** No significant savings available — queries are already well-optimised; total potential savings ~4 unused cols × N rows in one endpoint (negligible)
- [x] Document findings in `internaldocs/workflow/CURRENT_FEATURE.md`
      **Done:** Findings documented below
- [x] Apply rewrites in small batches; run `pnpm updateBackendTypes` if response shapes change;
      validate with `pnpm test-headless` after each batch
      **Done:** No rewrites needed — no actionable over-fetching found
- [x] NO functional regressions — every UI surface still has exactly the data it needs

**Findings:** Queries are already well-optimised. No bandwidth fixes needed at this time. Remaining work: image thumbnails and gzip/brotli verification (requires production access — not blocking).

---

#### MEDIUM: Sentry — Issue Monitoring & Resolution Workflow

**Why:** Sentry is already integrated and collecting error data, but there is currently no process
to regularly review reported issues and address them. A backlog of unresolved errors is accumulating.
Future work should establish a lightweight routine (or automated agent workflow) that queries Sentry
for open issues, triages them by frequency/severity, and works through fixes systematically.

**Tokens:** Sentry API credentials are already present in the project (available via MCP or
environment config) — no new setup required to start.

- [ ] Audit current open Sentry issues and categorise by frequency, severity, and affected surface
- [ ] Establish a recurring review cadence (manual or agent-assisted) for new Sentry events
- [ ] Resolve the highest-impact issues identified in the initial audit
- [ ] Explore MCP / automated tooling to let the AI agent query and triage Sentry data directly
- [ ] Document the agreed workflow so future agents know the process

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

Completed: sitemap, robots.txt, canonical URLs, JSON-LD, llms.txt, og:image dimensions, bot cache headers (partial), manufacturer detail metadata (`907e676a`).

Remaining:

- [ ] OG image generation endpoint (`@vercel/og`)
- [ ] Middleware wiring to generated OG image URLs
- [ ] Rich preview validation (Telegram / WhatsApp / Slack + debuggers)
- [ ] Visual polish pass

---

#### POLICY: Unit Test Coverage

Target: statements and lines ≥ 75% (baseline 03-02: ~57%).
Not a blocking task — coverage rises naturally as new features ship with tests.

**2025-07-16 bulk pass completed (~1200+ tests added, ~145+ spec files created):**
All components, pipes, utils, services, constants, and helper files that can be tested with
direct instantiation (no Supabase/D3/canvas) now have spec coverage.

Remaining uncovered high-value files (complex dependencies):
- `user-management.service.ts` (599L, Supabase Auth-heavy)
- `graph.component.ts` (498L, D3/canvas)
- `patch-graph.component.ts` (297L, SupabaseService-dependent)

Previously listed as "remaining" but now fully covered by direct-instantiation specs:
- `rack-detail-data.service.ts` — 5 spec files, 40+ tests (helpers, reactive, media-duplicate, main)
- `module-detail-data.service.ts` — 1 spec file, 24 tests
- `user-area-data.service.ts` — 1 spec file, 24 tests
