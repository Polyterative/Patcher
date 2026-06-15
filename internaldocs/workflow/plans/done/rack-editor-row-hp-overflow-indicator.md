<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Rack Editor — Row HP overflow indicator

**Why:** A rack row has a fixed HP capacity (`rackData.hp`). It is currently possible to place
modules that together exceed that capacity with no visual warning — the user can be 1 HP over
without realising it and wonder why the physical rack doesn't fit.

**Design intent:** the indicator should feel like a natural extension of the existing row UI
(ruler, power panel), not a jarring alert. Tone: calm but unmissable — similar to how a code
editor shows a gutter marker.

**Implementation notes:**

- Per-row used HP = `row.reduce((sum, m) => sum + m.module.hp, 0)`. This is already
  computable from `rowedRackedModules` (input to `rack-visual-model.component`).
- `rackData.hp` is the row capacity (all rows share the same HP width for a standard case).
- Derive a `rowHpOverflow: number[]` array alongside the existing `rowPowerBreakdown` array
  in `rack-visual-model.component.ts` (see `buildRackPowerBreakdown` pattern).

**Checklist:**

- [x] Compute `rowUsedHp` and `rowOverflowHp` per row in the component (client-side, no
      backend call needed).
- [x] When `rowOverflowHp > 0`, render a visual overflow indicator on that row. Suggested
      treatment: a thin accent bar at the right edge of the row that protrudes slightly beyond
      the rack boundary, coloured with the design system's warning/error token, with a
      `matTooltip` showing e.g. *"Row 2: 105 / 104 HP — 1 HP over capacity"*.
- [x] Additionally, show a compact summary badge somewhere on the rack card header (or the
      row power panel area) listing total overflow when any row is over — e.g.
      `⚠ 1 HP over` — so the problem is visible without hovering.
- [x] The indicator should animate in/out smoothly when modules are added/removed (tie into
      the diff-based update work once that lands).
- [x] No indicator shown when `rowOverflowHp <= 0`; the UI stays clean for well-packed racks.
- [x] Ground visual decisions in `internaldocs/DESIGN_LANGUAGE.md` — use existing warning
      colour tokens, not ad-hoc colours.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

