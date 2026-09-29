# Rack layout analysis caps — make large racks load

Goal: cap layout arrangement-count analysis so large/high-slack racks render without hanging, without limiting user rack size; run the expensive exact count only when layout mode actually needs it.

Status: In progress on `develop`, frontend-only. No schema/migration/RLS/RPC change. No user rack-size cap.

## Background (read-only diagnosis, 2026-09-29)

- Rack `x2iWDIhRugPx` (`id 2972`, “Theoretical Lime”, public, 6 rows × 184 HP, 15 modules, all 3U) loads its data fine (`get_rack_by_public_id` 200, `rack_modules` 200) but the page never settles: `RangeError: Map maximum size exceeded` repeats from `ngOnChanges → updateVisualState → render.update → computeLayoutAnalysis → countExactArrangements`.
- `shouldCountExactly` estimated only 54k states (`C(21,6)`) for 15 modules × 6 rows, under the 100k cap — but the DP memo keyed on `remainingHpByRow` vectors explodes (3M+ entries in local repro, still growing) because 364 HP used vs 1104 HP capacity (~33% full) means almost no pruning.
- `RackVisualModelRenderService.update()` calls full `computeLayoutAnalysis` on every rack load, even with analysis mode off. Nothing outside layout mode reads `arrangementCount` (row labels use overflow/wasted/mixed + `autoArrangeMoves`, which is cheap first-fit).

## Layer 1 — MVP (make the rack load)

- [ ] Harden `countExactArrangements` with a memo-entry budget; abort to a sentinel instead of growing until `RangeError`.
- [ ] `computeLayoutAnalysis` never throws for counting reasons; falls back to sampled/capped estimate.
- [ ] Regression spec with the production rack shape (15 modules, 6×184) returns fast without throwing.
- [ ] Targeted specs + `pnpm lint` green.

## Layer 2 — Structural (count only when layout mode needs it)

- [ ] Add `skipArrangementCount` option to `computeLayoutAnalysis` (default keeps current behavior).
- [ ] Render service (`RackVisualModelRenderService.update`) passes the skip flag — initial load stays `O(n log n)`.
- [ ] Remix/validity summaries skip the count; only `layoutArrangementSummary` keeps the full count.
- [ ] Specs for the skip flag.

## Layer 3 — Polish (avoid burning budget before falling back)

- [ ] HP-slack guard in `shouldCountExactly` so loose-packing shapes skip exact counting up front.
- [ ] Verify with node repro + production snapshot (`agent-snapshot.mjs` vs `https://patcher.xyz/racks/x2iWDIhRugPx`).

## Decision log

- 2026-09-29: Cap the analysis, not the rack. User explicitly rejected capping maximum rack size; all guards live in the counting path (`rack-layout-analysis.utils.ts`).
- 2026-09-29: Default `computeLayoutAnalysis` behavior unchanged (full count) so existing callers/tests keep semantics; cheap paths opt out via `skipArrangementCount`.
- 2026-09-29: Memo budget (not wall-clock) is the abort signal — deterministic, testable, no timers in utils.

## Documentation impact

- Classification: internal fix, no public behavior contract change. No public-docs update.
- Production visibility: fix ships with the normal `develop` → release flow; no flag (bug fix, not a feature).
- Screenshots: none (no visual change for normal racks; previously-crashing rack renders normally).
- Changelog summary: `fix(rack): cap layout arrangement counting so large/high-slack racks load; defer exact count until layout mode`.
