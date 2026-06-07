<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Rack Analytics — Power Header Count

**Why:** A Eurorack rack needs one power header (bus board connector) per module that draws
power. Passive modules (all power rails = 0 mA) and blank panels don't need a header.
Knowing the required header count before buying or wiring a rack saves mistakes and money.
The existing `buildRackPowerBreakdown` already iterates over all racked modules and has
access to every power field — this is purely a derived display value, no new backend data
needed.

**Definition of "needs a power header":**
A module counts toward the power-header total if **all three** of these are true:
1. It is not a blank panel (`!isBlankModule(rackedModule.module.id)`).
2. It has known power data for at least one rail (`!hasMissingPowerData` is NOT required —
   a module with partial data is still active and still needs a header).
3. It is not purely passive — i.e. at least one rail value is non-zero:
   `(powerPos12 ?? 0) !== 0 || (powerNeg12 ?? 0) !== 0 || (powerPos5 ?? 0) !== 0`.

Modules with all rails explicitly set to `0` are passive and do **not** count.
Modules with `null` rails are ambiguous — count them conservatively (they may draw power).

**Conservative counting rule for `null` rails:**
- All three rails `null` → unknown module, count it (assume it needs power, flag it).
- At least one rail non-zero → active, count it.
- All three rails explicitly `0` → passive, do not count.

**Output to surface:**
- `powerHeaderCount: number` — total headers needed across the whole rack.
- `passiveModuleCount: number` — modules confirmed passive (all rails 0).
- `unknownPowerModuleCount: number` — modules with all-null power data (ambiguous).
- Per-row breakdown: `rowPowerHeaderCount: number` per `RackPowerRowBreakdown` (how many
  headers are on each row / bus board row).

**Where to show it:**
Surface the count in the existing rack **power analysis panel** (the floating panel used in
`power` analysis mode in the rack editor, and in the rack detail/view page power section).
Place it as a summary line below the +12V / −12V / +5V totals:
```
Power headers needed: 14  (2 passive · 1 unknown)
```
Link the "unknown" count to the existing missing-power-data warning if one exists.

**Checklist:**

- [ ] Add `powerHeaderCount`, `passiveModuleCount`, and `unknownPowerModuleCount` to
      `RackPowerBreakdown` interface in `rack-power-breakdown.utils.ts`.
- [ ] Add `rowPowerHeaderCount` to `RackPowerRowBreakdown` interface.
- [ ] Implement the counting logic inside `buildRackPowerBreakdown` using the conservative
      rule above. Pure function — no service injection needed.
- [ ] Update the power analysis panel template to show the summary line (rack editor +
      rack detail view). Use existing typography tokens; keep it one line under the rail totals.
- [ ] Unit-test `buildRackPowerBreakdown` with fixtures covering: all active, all passive,
      mixed, all-null rails.

---



**Why:** Regression. Previously, dragging a module inside the rack visual model showed a
semi-transparent preview of the module tile at the drop target position before releasing —
giving clear visual feedback of where the module would land. After a recent change this
preview has disappeared: only an empty gap is shown during the drag, making reordering
confusing and error-prone.

**Investigation notes:**
- The rack visual model uses CDK Drag-and-Drop (`cdkDrag` on each module tile in
  `rack-visual-model.component.html`).
- CDK renders a `*cdkDragPreview` template while dragging; if none is defined it falls back
  to a clone of the dragged element. The current template has no `*cdkDragPreview` block —
  it was likely removed during a refactor, leaving CDK with no preview to render or a
  misconfigured one.
- `dropRevealSuppressed` / `dropRevealAnimating` CSS classes are still present in the
  template, suggesting the suppression logic may now be incorrectly hiding the preview for
  all tiles instead of only the source tile.

**Fix checklist:**

- [x] Audit `rack-visual-model.component.html` for the `*cdkDragPreview` template block —
      if missing, restore it (render `<app-module-realistic>` or equivalent minimal tile).
- [x] Check `isDropRevealSuppressed()` — ensure it returns `true` only for the actively
      dragged module, not for all modules or the placeholder slot.
- [ ] Verify `[cdkDragScale]` is set correctly so the preview matches the visual size of
      the tile in the rack grid.
- [x] Restore the entry animation on drop so the placed module animates into its final
      position (was working before the regression).
- [ ] Add a Playwright visual smoke test: drag a module to a new slot and assert the
      preview element is present in the DOM during the drag.
  Remaining: Playwright test requires live E2E test account (see blockers.md).

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

