<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

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
- [x] Confirm gzip / brotli is in effect for API responses (Supabase default — verify on
      production)
      **Done:** Verified 2026-06-14 with live headers. `https://patcher.xyz` returns
      `content-encoding: br` from Vercel when requested; Supabase REST
      `tags?select=id,name,type&limit=1` returns `content-encoding: br` for Brotli requests
      and `content-encoding: gzip` for gzip requests, with `vary: Accept-Encoding`.
- [x] Estimate bytes saved per query before/after where possible (helps prioritise)
      **Done:** No significant savings available — queries are already well-optimised; total potential savings ~4 unused cols × N rows in one endpoint (negligible)
- [x] Document findings in `internaldocs/workflow/CURRENT_FEATURE.md`
      **Done:** Findings documented below
- [x] Apply rewrites in small batches; run `pnpm updateBackendTypes` if response shapes change;
      validate with `pnpm test-headless` after each batch
      **Done:** No rewrites needed — no actionable over-fetching found
- [x] NO functional regressions — every UI surface still has exactly the data it needs

**Findings:** Queries are already well-optimised. No bandwidth fixes needed at this time. Image thumbnails remain a future hosting-plan-dependent opportunity; production API/app compression is active.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14T20:18+02:00 — Closed the remaining production compression check with live
  Vercel/Supabase headers. No code changes were needed; archived the plan as complete.
- 11-08-2026 — Follow-up egress audit found one write-path over-fetch this plan's read-only
  scan didn't cover: `update.rackedModules()` (`supabase-update.ts`) always re-`.select()`ed
  every upserted racked-module row, even though the response is only consumed when the same
  batch also inserts brand-new modules. Every pure reorder (drag, remix, shuffle, row move —
  the common case, no new modules) re-downloaded the entire rack's module rows for nothing.
  Fixed to skip `.select()` on the upsert when there's nothing to read it; the insert leg
  (which callers do need, for id assignment) is unchanged. Also fixed a related bug found
  while touching this code: the insert query was built (and its network call fired)
  unconditionally even with an empty `newRackedModules` array, wasting a round trip on every
  pure-reorder batch — now only constructed when there's something to insert. Verified via
  `supabase-service`/`rack-detail-data.service`/`rack-parts` suites (1500+ specs) with no
  regressions; two new regression tests lock in the no-new-modules and mixed-batch cases.
