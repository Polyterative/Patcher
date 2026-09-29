# Rack layout analysis caps — make large racks load

Goal: cap layout arrangement-count analysis so large/high-slack racks render without hanging, without limiting user rack size; run the expensive exact count only when layout mode actually needs it.

Status: In progress on `develop`, frontend-only. No schema/migration/RLS/RPC change. No user rack-size cap.

## Background (read-only diagnosis, 2026-09-29)

- Rack `x2iWDIhRugPx` (`id 2972`, “Theoretical Lime”, public, 6 rows × 184 HP, 15 modules, all 3U) loads its data fine (`get_rack_by_public_id` 200, `rack_modules` 200) but the page never settles: `RangeError: Map maximum size exceeded` repeats from `ngOnChanges → updateVisualState → render.update → computeLayoutAnalysis → countExactArrangements`.
- `shouldCountExactly` estimated only 54k states (`C(21,6)`) for 15 modules × 6 rows, under the 100k cap — but the DP memo keyed on `remainingHpByRow` vectors explodes (3M+ entries in local repro, still growing) because 364 HP used vs 1104 HP capacity (~33% full) means almost no pruning.
- `RackVisualModelRenderService.update()` calls full `computeLayoutAnalysis` on every rack load, even with analysis mode off. Nothing outside layout mode reads `arrangementCount` (row labels use overflow/wasted/mixed + `autoArrangeMoves`, which is cheap first-fit).

## Layer 1 — MVP (make the rack load)

- [x] Harden `countExactArrangements` with a memo-entry budget; abort to a sentinel instead of growing until `RangeError`.
- [x] `computeLayoutAnalysis` never throws for counting reasons; falls back to sampled/capped estimate.
- [x] Regression spec with the production rack shape (15 modules, 6×184) returns fast without throwing.
- [x] Targeted specs + `pnpm lint` green.

## Layer 2 — Structural (count only when layout mode needs it)

- [x] Add `skipArrangementCount` option to `computeLayoutAnalysis` (default keeps current behavior).
- [x] Render service (`RackVisualModelRenderService.update`) passes the skip flag — initial load stays `O(n log n)`.
- [x] Remix/validity summaries skip the count; only `layoutArrangementSummary` keeps the full count.
- [x] Specs for the skip flag.

## Layer 3 — Polish (avoid burning budget before falling back)

- [x] HP-slack guard in `shouldCountExactly` so loose-packing shapes skip exact counting up front.
- [x] Verify with node repro + targeted specs (prod snapshot still serves the old 6.7.23 build, so live verification waits for release).

## Decision log

- 2026-09-29: Cap the analysis, not the rack. User explicitly rejected capping maximum rack size; all guards live in the counting path (`rack-layout-analysis.utils.ts`).
- 2026-09-29: Default `computeLayoutAnalysis` behavior unchanged (full count) so existing callers/tests keep semantics; cheap paths opt out via `skipArrangementCount`.
- 2026-09-29: Memo budget (not wall-clock) is the abort signal — deterministic, testable, no timers in utils.
- 2026-09-29: Budget set to 100k memo entries, matching the existing `MAX_EXACT_ARRANGEMENT_STATES` scale; prod repro aborted at 100001 entries in milliseconds and fell back to `sampled`.
- 2026-09-29: Slack guard thresholds (`modules × rows > 60` and `used/capacity < 0.5`) chosen so every existing exact-count spec (≤4 modules) still takes the exact path; only wide, mostly-empty groups skip up front.
- 2026-09-29: `rack-layout-analysis.utils.ts` now trips the R4 500-line soft warning (564 lines, check exits 0). Accepted: pure-utils module, far from the 1000-line hard error; splitting it is separate work.
- 2026-09-29: Full `pnpm lint` (`ng lint`) crashes this machine with a Node abort trap (exit 134), unrelated to the change; validated with scoped `eslint` on all touched files (0 errors) plus `check-layering`/`check-docs` (both exit 0).

## Documentation impact

- Classification: internal fix, no public behavior contract change. No public-docs update.
- Production visibility: fix ships with the normal `develop` → release flow; no flag (bug fix, not a feature).
- Screenshots: none (no visual change for normal racks; previously-crashing rack renders normally).
- Changelog summary: `fix(rack): cap layout arrangement counting so large/high-slack racks load; defer exact count until layout mode`.
