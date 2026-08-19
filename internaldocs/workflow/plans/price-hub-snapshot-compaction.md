# Price Hub — snapshot compaction and change-only crawl writes

Status: v3 — backend plan review v2 verdict **APPROVE WITH CHANGES**; findings folded in below (no re-review cycle required per reviewer); awaiting owner go for implementation
Owner intent: stop `module_price_snapshots` growth and reclaim existing space; DB is 394 MB of the 500 MB Free-plan cap and this one table is 335 MB (85% of the DB). The pilot's own stop-condition (250 MB) is already breached.

## Problem (measured 2026-08-19, project `sozmatmywjpstwidzlss`)

| Fact | Value |
|---|---|
| `module_price_snapshots` total size | 335 MB (303 MB heap, 31 MB indexes, 120 kB toast) |
| Rows | 372 795 (2026-07-02 → 2026-08-14), 17 668 listings |
| Growth | ~55–70 K rows/week ≈ ~45 MB/week ≈ +2.3 GB/year |
| `raw_meta` jsonb share | **263 MB = 87 % of heap** (avg 740 B/row, max ~1.9 KB, stored inline — TOAST only 120 kB) |
| Redundancy | **92.9 %** of snapshots identical to the previous one per listing (price + currency + availability unchanged) |
| Writers | `scripts/price-hub/import-local-snapshots.ts` = 372 794 rows (`source='scraper'`, 100 %); edge fn `snapshot-store-listings` = 0 rows (`source='api'`; Cron declined, manual-only); 1 manual row |
| Readers | `supabase-queries.price-data.ts` only: latest snapshot per listing (`limit 1` desc) and 60-day history (≤ 500 rows/module, returns `[]` if over). **No reader ever selects `raw_meta`.** Sparse-summary helper needs ≥ 2 points else null. Recent-market helper keys recency off `snapshot.observed_at` (`isWithinLastTwoMonths`). |
| Availability mix (latest per listing) | 52.5 % in_stock, 26.7 % out_of_stock, 9.9 % backorder, 8.5 % preorder, 2.3 % discontinued |

`raw_meta` content: adapter debug (tags, vendor, variant IDs, match score/reasons). Diagnostic; useful only in its *latest* form per listing.

## Semantic model — "floating endpoint" segments (v2, per review)

A price segment (stable price+currency+availability interval) is stored as **two physical rows**:

1. **Start row** — immutable; `observed_at` = when this price was first seen.
2. **Endpoint row** — floating; `observed_at` is **updated in place** on every unchanged crawl (= last confirmation). Created on the first unchanged re-observation of a segment.

Crawl write rule (pure planner, shared by both writers):

- latest row differs from observed values → **INSERT** (new segment start).
- latest row matches, and the row before it also matches → latest is the endpoint → **UPDATE** its `observed_at` (and availability-irrelevant fields untouched).
- latest row matches but is a lone start → **INSERT** endpoint row.

Segment boundaries include availability changes, not just price.

Planner assumes **single-run writers** (manual/local crawls, one at a time — current reality). Two overlapping runs could each insert a redundant endpoint for the same lone start: bloat, not corruption (readers pick latest by `observed_at desc, id desc`). The planner dedupes listings within a batch; cross-run locking is explicitly out of scope (review LOW, accepted).

### Why this beats v1 (`last_confirmed_at` column) — review findings incorporated

- **No new snapshot column, no snapshot schema change at all.** Rollback = revert code.
- **Old and new readers work identically, forever** (kills v1 BLOCKER 2): the endpoint row's `observed_at` is always the last crawl date, so `getRecentModuleMarketPrices`/`getModuleRecentMarketPrice` (`isWithinLastTwoMonths(observed_at)`, recency weight, "latest check" date) and `getModulePriceListings` keep working unchanged as long as crawls run at least every 2 months. No heartbeat bridge, no production-release gate on the write path, no PostgREST `or()` filter.
- Steady-state: 2 rows/segment (~54 K rows for current data) instead of 1 row/observation. New growth ≈ 1 row per actual price change + in-place endpoint updates ≈ **< 0.5 MB/week** (from 45 MB/week).
- `module_price_snapshots` has **no BEFORE UPDATE trigger** (verified) → endpoint updates are safe, no timestamp-wipe risk. Non-HOT index churn on the two indexes from endpoint updates (~17.6 K/day max, manual cadence in practice) is autovacuum-manageable and strictly cheaper than today's 17.6 K inserts/day.

### Decision matrix (chosen vs rejected)

| Option | Why rejected / accepted |
|---|---|
| **Floating-endpoint rows (chosen)** | Accepted: zero reader migration, zero schema change on snapshots, kills v1 blockers |
| v1: `last_confirmed_at` column, 1 row/segment | Rejected by review (BLOCKER 2): freezes latest `observed_at` at segment start → stable listings silently drop out of recent-market estimate; requires migrating latest-price readers + release gating + heartbeat bridge; 2× row saving not worth the compatibility machinery |
| Daily/weekly rollup table + prune | Second write path, lossy for "when did the price change"; segments answer it exactly |
| Retention-only (delete > 60 d) | Loses long-term history while still writing 93 % redundant rows |
| Monthly partitioning | Operational overkill at ~54 K meaningful rows |
| Bump `observed_at` on the single latest row (1 row/segment, no start row) | Destroys segment-start date |
| Keep per-snapshot `raw_meta`, compress | Still O(rows) diagnostic bytes with zero readers |

### Diagnostic relocation

`module_store_listings.last_raw_meta jsonb null` (additive column): latest adapter/match provenance per listing, overwritten each crawl. Bounded ≤ ~13 MB (one per listing). Snapshots stop carrying `raw_meta` (write `'{}'`). Historical `raw_meta` is archived to a local gitignored JSONL **before** being stripped (explicit data-retention call; "retention/diagnostics" pre-approved in principle in the Approvals ledger; re-confirmed at apply time).

Known, accepted exposure (per review MEDIUM): `last_raw_meta` is anon-readable via existing table-level SELECT grant — same posture as today's `raw_meta`, no client reads it. Optional hardening (column-level revoke to service_role) is listed as a follow-up that requires the explicit RLS approval gate; **not** part of this plan.

## Layers

### Layer 1 — MVP (stop the growth; code + one additive migration)

- [x] Migration `add_price_hub_listing_last_raw_meta`: `alter table public.module_store_listings add column last_raw_meta jsonb;` (nullable, no default, no rewrite, no RLS/GRANT changes) **plus** read-only RPC `price_hub_latest_snapshots(p_listing_ids bigint[])` — `row_number() over (partition by listing_id order by observed_at desc, id desc) <= 2` — because PostgREST has no top-N-per-group and a flat `.in()` fetch would pull every historical row per listing pre-backfill (review MEDIUM). SECURITY INVOKER; anon RLS posture unchanged (SELECT-only either way).
- [x] `pnpm updateBackendTypes`; verify `last_raw_meta` lands optional in Insert/Update generated types and the RPC appears in `Functions` (BACKEND_METHODS §3).
- [x] Shared pure change-planner (insert-start / update-endpoint / insert-endpoint) in `supabase/functions/_shared/price-hub/` with unit tests; consumed by both writers (same pattern as existing shared normalizers).
- [x] Local importer `import-local-snapshots.ts`: fetch latest-two rows per affected listing via the RPC (chunked listing-id batches); split rows via planner; batch-insert new rows **without `raw_meta`** (`'{}'`); endpoint updates as **one** `.update({ observed_at: now }).in('id', endpointIds)` per batch — all endpoints share the batch `now` (review note); write `last_raw_meta` onto listings within the existing `upsertListings` payload (listing `updated_at` trigger firing on crawl updates is current behavior — acceptable).
- [x] Edge worker `snapshot-store-listings`: same planner (parity; currently contributes 0 rows).
- [x] Tests: planner unit tests (change / lone-start / endpoint-update / A→B→A flip / first-ever crawl), importer tests in `scripts/tests/price-hub-import-local.test.mjs`, worker tests in `scripts/tests/snapshot-worker.test.mjs`.

### Layer 2 — Structural (reader robustness + backfill + reclamation)

- [x] **No reader changes.** `getModulePriceHistorySnapshots` keeps its 60-day filter and ≤ 500 guard: its only functional consumer (`getModuleSparsePriceHistorySummary` → trend chip) re-applies an internal 60-day clamp anyway, so a latest-N reader change would be inert for the chip and would newly break the row-guard on uncompacted modules (review v2 HIGH — v2's latest-N idea dropped).
- [x] **Accepted consequence (owner decision 2026-08-19):** post-backfill, a long-stable single-listing module has 1 in-window point (fresh endpoint; start row aged past 60 d) → sparse summary returns null → trend chip disappears for that module until its price next changes. Latest price, listings, and recent-market estimates are unaffected. This does **not** self-heal via releases; it is a conscious compaction trade-off. Multi-listing modules keep the chip via endpoints.
- [ ] `getModuleSparsePriceHistorySummary` spec: add collapsed-segment fixtures — (a) recent segment: start + endpoint in-window, identical price → pair extends time axis without skewing `trendPercent`/min/max; (b) **aged-out segment**: start > 60 d, endpoint fresh → single-listing module yields null summary; multi-listing yields summary from endpoints only (review v2 MEDIUM).
- [x] Backfill executed 2026-08-19 (user-present window, per-phase confirmation; archive via read-only anon key — service role unneeded since snapshots are publicly readable; SQL phases via Supabase MCP), strict order per review:
  1. Paginated JSONL archive of `(snapshot_id, listing_id, observed_at, raw_meta)` by id ranges — streams to a local gitignored file, never buffers all 372 K rows (review LOW).
  2. Copy latest non-empty `raw_meta` per listing → `module_store_listings.last_raw_meta`, with `alter table module_store_listings disable trigger trg_module_store_listings_updated_at` for the window, then re-enable (review MEDIUM; BACKEND_METHODS §1).
  3. Collapse each unchanged run to **first + last** rows (window-function pass; DELETE interior rows ≈ −86 % rows). Single-observation segments keep 1 row.
  4. Plain `VACUUM (ANALYZE) module_price_snapshots` so the strip reuses freed pages without growing the file.
  5. Strip survivors: `UPDATE module_price_snapshots SET raw_meta = '{}'::jsonb WHERE raw_meta != '{}'::jsonb` in id-range batches (no update trigger on this table — verified).
  6. `VACUUM FULL public.module_price_snapshots` — **disk math (corrected per review BLOCKER 1):** new relation ≈ 54 K rows ≈ 5 MB heap + ~6 MB rebuilt indexes ≈ **~11 MB copy**; peak ≈ current DB (394 MB, old file resident until commit) + 11 MB + WAL ≈ **~416 MB < 500 MB cap**. Preconditions (review v2 MEDIUM — margin is only ~40 MB): measure `pg_database_size` + `pg_total_relation_size`, `select sum(size) from pg_ls_waldir()`, and `pg_replication_slots` retained-WAL lag immediately before; **abort if projected DB-size peak > 460 MB or any slot retains > 100 MB of WAL**; confirm at the window which metric Supabase Free enforces the 500 MB cap on (`pg_database_size` vs disk incl. `pg_wal`) via dashboard/API before running. pg_repack is explicitly rejected as fallback (larger transient footprint: original + full copy + apply log — review HIGH). If preconditions fail, the fallback is a temporary paid-tier upsize for the window, user decision.
  7. Post-assertions: per-listing latest (price, currency, availability, fresh `observed_at`) equals pre-backfill sample; segment count matches dry-run plan; `pg_total_relation_size` before/after recorded here.
- [x] `get_advisors` (security + performance) after migration and after backfill; address or document findings.
- [x] Sequencing: the backfill has **no release dependency** — no reader changes ship. Latest price, listings, and recent-market estimates stay correct on live production throughout (endpoint `observed_at` is fresh). The only visible effect is the accepted trend-chip loss on long-stable single-listing modules (see Layer 2 accepted consequence — permanent until the price next changes, owner-approved). Growth is already stopped by Layer 1; the backfill window is schedulable at leisure (static ~394 MB buys months of headroom).

### Layer 3 — Polish

- [ ] Optional adaptive cadence: `next_check_at` +3–7 d for out_of_stock/discontinued listings (−30–40 % crawl volume). Separate decision; not required for the storage goal.
- [ ] Optional `last_raw_meta` column-level privilege hardening (requires explicit RLS/GRANT approval gate; never autonomous).
- [ ] Docs: update `scripts/price-hub/README.md` (endpoint semantics, backfill runbook); `COMPLETED.md` entry; TODO line reset.

## Rollback

- Migration: additive; `drop column last_raw_meta` + `drop function price_hub_latest_snapshots` restores prior schema exactly.
- Write paths: revert commit → old insert-always behavior returns instantly (writers are our scripts/functions, not shipped clients).
- Backfill: interior-row deletion and `raw_meta` strip are irreversible by design; the JSONL archive is the escape hatch for `raw_meta`; collapsed interior rows are informationally redundant by definition (values equal to both endpoints). This claim is scoped to *after* the backfill — before it, everything is reversible (review LOW).
- VACUUM FULL: no logical change; abort-safe.

## Validation

- `pnpm test-headless --include="**/module-price-summary.utils.spec.ts"`; importer/worker mjs suites; `pnpm lint`.
- Backfill dry-run report reviewed by owner before the live window.
- App smoke post-backfill: module detail price card + history chart on a long-stable module and a recently-changed module.

## Documentation impact (DOCUMENTATION_LIFECYCLE)

Internal-only: no public behavior contract changes (history chart data density changes; latest-price surfaces unchanged). No public-docs queue entry.

## Approval gates

- Standing approval: "Price Hub retention/diagnostics … approved in principle — same preflight/typegen/advisor validation required before any mutation" (TODO.md ledger). The migration apply and the backfill/VACUUM window still get explicit per-window confirmation with the user present.
- No RLS/policy/GRANT changes in scope. Supabase Cron remains declined — compaction is one-shot scripted.

## Decision log

- 2026-08-19 — Measured: 335 MB table, 87 % `raw_meta` (zero readers), 92.9 % unchanged snapshots, 100 % of volume from the local importer. v1 chose SCD-2 `last_confirmed_at` segments.
- 2026-08-19 — Backend plan review v1: **BLOCK**. BLOCKER 1: VACUUM FULL after a strip-only Stage 1 breaches the 500 MB cap (~590 MB peak: dead heap resident + full-rowcount index rebuild + WAL); pg_repack invalid as low-disk fallback. BLOCKER 2: freezing latest `observed_at` at segment start silently drops stable listings from recent-market estimates (`isWithinLastTwoMonths`), and v1 only migrated the history reader. Plus: heartbeat ≥8-points claim was cadence-conditional (real floor is the ≥2-point sparse-summary null threshold); listing-trigger `updated_at` bump on backfill; JSONL must precede strip and paginate; `last_raw_meta` public-readability must be an explicit accepted posture.
- 2026-08-19 — v2 adopts the review's recommended path: **floating-endpoint segments** (first + last row per run, endpoint `observed_at` updated in place). No snapshot schema change; latest-price readers untouched by construction; two-stage release gating, heartbeat, and PostgREST `or()` all removed. Backfill reorders to archive → relocate raw_meta (trigger disabled) → collapse rows → plain VACUUM → strip → VACUUM FULL with corrected disk math (~416 MB peak) and a measured-precondition abort threshold. History reader moves from 60-day cutoff to bounded latest-N (volume guard obsolete post-compaction). Historical `raw_meta` discarded after local JSONL archive; latest copy preserved per listing on `module_store_listings.last_raw_meta` (publicly readable — accepted, hardening optional later).
- 2026-08-19 — Backend plan review v2: **APPROVE WITH CHANGES** (both v1 blockers confirmed resolved; floating-endpoint model verified sound). Findings folded into this v3: (HIGH) latest-N reader change dropped — it was inert for its only consumer (`getModuleSparsePriceHistorySummary` re-clamps to 60 d internally at `module-price-summary.utils.ts:86,90`) and would newly break the ≤ 240/500 row guard on uncompacted modules; the "self-heals at next release" sequencing claim was false and is removed. (MEDIUM) sparse-summary fixture extended to the aged-out case (start > 60 d → single-listing null). (MEDIUM) latest-two fetch specified as a read-only `row_number()` RPC — PostgREST has no top-N-per-group and flat `.in()` would pull full history pre-backfill. (MEDIUM) VACUUM FULL precondition extended with WAL size, replication-slot lag, and cap-metric confirmation. (LOW) single-run writer assumption documented; duplicate endpoints from overlapping runs are bloat-not-corruption, in-batch dedupe only.
- 2026-08-19 — Owner decision: **accept trend-chip disappearance** on long-stable single-listing modules post-backfill (reviewer's recommended option) instead of clamping segments to the window edge. Zero reader work; chip returns when a module's price next changes.
- 2026-08-19 — **Layer 1 landed.** Migration applied live (advisors clean); typegen hand-edited (remote regen would delete develop-only tables — never regenerate raw). Shared planner + 13 unit tests (new `pnpm test:functions:price-hub-change-planner`); importer fetches latest-two via RPC (chunked ≤500, deduped ids), inserts `raw_meta: '{}'`, bumps endpoints in one batched update, writes `last_raw_meta` in the listing upsert, reports `updatedSnapshotEndpoints`; edge worker gained planner parity. Suites: planner 13/13, importer 33/33, worker 18/18, crawler 107/107, parser 12/12; `pnpm lint` clean. Commits `2f51e3d0`, `4f549fd8`, `7b921f85`. Edge worker redeploy not performed (deploys are user-gated; function currently contributes 0 rows).
- 2026-08-19 — **Layer 2 backfill executed** (user-present window, explicit confirmation before every destructive phase). Archive: 372,795/372,795 rows streamed to gitignored `tmp/price-hub-raw-meta-archive-2026-08-19.jsonl` (272 MB) via new `scripts/price-hub/archive-snapshot-raw-meta.ts` using the anon key (snapshots are publicly readable; PostgREST caps pages at 500 rows — loop stops only on an empty page, a short page is not end-of-data). Relocate: 17,668/17,668 listings got `last_raw_meta`; `updated_at` md5 checksum identical pre/post (trigger-disable window worked). Collapse: interior ids materialized into an unlogged worktable — 325,291 ids, matching the dry-run exactly; batched data-modifying-CTE deletes (6×50K + 25,291); survivors 47,504 across 26,447 segments/17,668 listings; per-listing latest checksum `114c40ed…` identical pre/post. Plain `VACUUM (ANALYZE)` and `VACUUM FULL` both ran fine via MCP `execute_sql`. Strip: 47,504 `raw_meta → '{}'` in 3 batches. VACUUM FULL preconditions measured: DB 411 MB, WAL 128 MB, 0 replication slots, projected peak ~422 MB < 460 MB abort line; cap metric is `pg_database_size`. **Result: DB 394 MB → 84 MB (−79 %), snapshots relation 335 MB → 8 MB, rows 372,795 → 47,504.** Advisors (security + performance) post-backfill: zero findings on price-hub tables (only pre-existing unrelated INFO/WARN entries). Trend-chip loss on long-stable single-listing modules is now live as accepted.
