<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Rack Comparison — balance diff between two racks

> **Status:** On hold indefinitely by user direction on 2026-06-14. Do not resume unless the user explicitly asks for Rack Comparison work.

**Why:** Users who maintain multiple versions of a rack (e.g. current vs planned rebuild, or
two rack concepts) have no way to see at a glance what they would gain or lose functionally.
A diff of the balance analysis radars answers exactly that: *"+12 HP of Voices, −8 HP of
Modulation"*.

**Entry point — user area (simplest viable placement):**
The feature is most useful in the user's own rack list, not on a single rack page. A
"Compare" action on the rack list lets the user pick two of their racks; the result opens as
a dedicated comparison view (or a panel/overlay). Starting here avoids adding complexity to
the rack detail page before the UX is proven.

**Data model:**
`RackBalanceAnalysisResult` already contains `axes: RackBalanceAxisResult[]` where each
axis has `id`, `label`, `share` (0–100 normalised score), and `hp` (matched HP).
A diff is computed as:
```
diffAxes = axes_A.map(a => ({
  ...a,
  shareDiff: a.share - axes_B.find(b => b.id === a.id).share,
  hpDiff:    a.hp    - axes_B.find(b => b.id === a.id).hp
}))
```
No new backend calls needed — both racks' modules are already loaded via existing queries.

**Comparison view UI:**
- Side-by-side radar charts (existing `rack-balance-panel` reused, read-only).
- A **delta panel** between or below the two radars: one row per axis showing
  `▲ +12 HP  Voices` / `▼ −8 HP  Modulation` / `= 0  FX`. Colour: green for positive
  delta, muted warning for negative, neutral for zero. Font and token choices from
  `internaldocs/DESIGN_LANGUAGE.md`.
- Rack names and thumbnail images as column headers.
- A short **plain-language summary** derived from the top 2 positive and top 2 negative
  deltas: *"Rack B has more Voices (+12 HP) and Utilities (+6 HP) but less Modulation
  (−8 HP)."*

**Checklist:**

- [ ] Add `compareRacks` route or modal entry point in the user-area rack list
      (e.g. a "Compare" toggle that lets the user select two racks from the list).
- [x] Implement `computeRackBalanceDiff(a: RackBalanceAnalysisResult, b: RackBalanceAnalysisResult): RackBalanceDiff`
      pure function in `rack-balance-analysis.service.ts` (or a sibling utils file).
- [ ] Build `RackComparisonComponent` (or a dedicated route under user-area) that:
      - Accepts two rack IDs as inputs / route params.
      - Loads both racks' `rowedRackedModules` (reuse existing data service pattern).
      - Runs `RackBalanceAnalysisService.analyze()` on each.
      - Calls `computeRackBalanceDiff` and renders the delta panel.
- [ ] Reuse `rack-balance-panel` in read-only mode for each radar — no duplication.
- [ ] Generate the plain-language summary string from the diff (pure function, unit-testable).
- [ ] Keep the comparison view accessible from a direct URL so it can be shared
      (e.g. `/compare?a=<publicIdA>&b=<publicIdB>`). Public racks only for shared URLs;
      private racks visible only to their owner.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- **2026-06-14:** Added the pure diff foundation in `rack-balance-analysis.utils.ts`: `computeRackBalanceDiff()` diffs `share` and `matchedModules` by axis id, and `buildRackBalanceDiffSummary()` produces the first plain-language summary. Current `RackBalanceAxisResult` does not expose matched HP, so HP-specific delta copy remains deferred until the analysis model is extended.
- **2026-06-14:** User postponed this feature indefinitely. Stop after the committed pure diff foundation; do not add the user-area entry point, comparison route, or UI until explicitly requested.
