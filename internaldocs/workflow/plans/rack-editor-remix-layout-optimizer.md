<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Rack Editor — "Remix" layout optimizer

**Why:** Users sometimes want to know if there is a better arrangement of their modules across
rows — one that avoids row overflows and wastes less HP — without having to drag everything
manually. A "Remix" feature automates this and also gives a sense of *how many valid
arrangements* exist, which is itself an interesting analytical view.

**Format isolation constraint (hard rule):**
Modules of different physical formats must **never** be mixed across format groups during a
remix. The formats are encoded in `module.standard` (already loaded on every `RackedModule`):
- `standard.id === 0` (or null) → 3U Eurorack
- `standard.id === 1` → Intellijel 1U
- `standard.id === 2` → PulpLogic 1U

The remix algorithm partitions modules into separate format groups first, then runs
bin-packing independently within each group. A 1U module can never be assigned to a 3U row
and vice versa — this is a hard constraint, not a preference.

**Pre-condition: homogeneous rows.** Remix assumes each row already contains modules of
one format only. Mixed-standard rows (e.g. a 3U and a 1U module sitting in the same row)
are an inconsistent rack state. When the layout panel is opened, `computeLayoutAnalysis`
must check every row first:
- If any row contains modules of more than one `standard.id`, remix is **blocked** for that
  format group.
- The panel surfaces a clear, non-destructive warning: *"Row 3 contains mixed formats (3U
  and 1U). Fix this before remixing."* — with a link/highlight to the offending row.
- No auto-arrange or shuffle action is offered while mixed rows exist.
- The HP overflow indicator still works normally — mixed rows are a separate validity
  concern from overflow.

The layout panel exposes a **scope selector** so the user can choose what to remix:
- **All formats** — runs FFD independently for each format group and recombines results.
- **3U only** — leaves 1U rows untouched.
- **1U only** (if 1U modules are present) — leaves 3U rows untouched.
- **Single row** — reshuffles only within a specific row (order-only remix, no cross-row
  movement). Useful for tidying a single messy row without disturbing anything else.

**Mathematical background:**
This is a variant of the **bin-packing problem** (NP-hard in general), but Eurorack racks
are small enough to make exact or near-exact solutions tractable:
- Typical rack: 6–12 rows × 84/104 HP capacity.
- Typical module count: 20–80 modules, each 1–28 HP wide.
- A **First-Fit Decreasing (FFD)** greedy heuristic (sort modules by HP descending, place
  each into the first row that fits) runs in O(n log n) and produces a solution within
  11/9 of optimal. Good enough for instant feedback.
- For exact counting of valid arrangements, **dynamic programming on subsets** (bitmask DP)
  works up to ~20 modules; beyond that, randomised sampling or branch-and-bound with pruning
  gives an estimate with confidence bounds. The key constraint is only that each row's used
  HP ≤ `rackData.hp` — no ordering constraint within a row (user can drag after).
- Module *identity* is preserved (the user's specific modules are rearranged, not replaced).
  Blank panels are excluded from remix input and can be re-added via the quick-add shortcut
  after the remix.

**Integration with existing analysis modes:**
Add `layout` to `RACK_ANALYSIS_MODES` in `rack-analysis-mode.ts`. In `layout` mode the
rack visual model shows a "remix" control panel in the same floating options area used by
`power` and `function` modes.

**UX design:**

- A **"Remix" button** in the rack editor toolbar (edit mode only) activates `layout`
  analysis mode and opens the layout panel.
- The panel shows:
  - **Current layout validity** — is any row over capacity right now? How much HP is wasted?
  - **"Auto-arrange" action** — applies FFD in one tap, animates modules into their new
    positions using the optimistic diff-based update (ties into that work). Shows a diff
    summary: "3 modules moved across rows".
  - **Valid arrangements estimate** — a computed or sampled count: *"~420 valid arrangements
    exist for your current modules"*. Updates live as modules are added/removed. For small
    racks (≤ 20 modules) show exact count; for larger racks show a sampled estimate with
    `~` prefix.
  - **"Shuffle" action** — picks a random valid arrangement from the solution space (fun /
    inspirational use case).
- The panel is read-only analysis when no row is overflowing; the auto-arrange CTA is
  highlighted when overflow is detected (ties into the HP overflow indicator feature).

**Checklist:**

- [x] Add `layout` to `RACK_ANALYSIS_MODES` and `RACK_ANALYSIS_MODE_OPTIONS`.
- [ ] Implement `computeLayoutAnalysis(modules: RackedModule[], rackHp: number)` pure
      function in a new `rack-layout-analysis.utils.ts`:
      - **First step:** partition input by `module.standard.id` into format groups.
      - Run FFD and arrangement counting independently per group — never mix groups.
      - Returns `{ isValid: boolean, wastedHp: number[], overflowHp: number[], validArrangementCount: number | 'estimated', estimate?: number }`.
      - Accepts an optional `scope: 'all' | '3u' | '1u' | { rowIndex: number }` param to
        limit which group(s) are touched.
      - Uses FFD for `autoArrange` output (returns new `row` assignments per module).
      - Uses bitmask DP for exact count when `modules.length ≤ 20` per group, randomised
        sampling otherwise.
- [x] Wire into `rack-visual-model.component.ts` alongside existing `rowPowerBreakdown`.
- [ ] Build the layout panel UI in the floating options area (same pattern as power/function
      panels in `rack-editor.component.html`).
- [x] "Auto-arrange" emits new row assignments through `rackDetailDataService` using the
      diff-based update path (batch move, not full reload).
- [x] Blank panels (`isBlankModule`) are stripped before remix and ignored in HP accounting
      for arrangement count.
- [x] Unit-test `computeLayoutAnalysis` with known fixtures (e.g. 4 modules × [10, 20, 30,
      40] HP into a 84 HP rack).

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- **2026-06-14:** Added the first pure layout-analysis foundation in `rack-layout-analysis.utils.ts`: current row HP validity, mixed-standard row blocking, blank-panel exclusion, scope filtering, and FFD auto-arrange move output. This does **not** complete the full checklist item yet because exact/estimated arrangement counting and UI wiring remain.
- **2026-06-14:** Added `layout` to the rack analysis mode constants and visible options, while preserving the existing paused `signal` mode as hidden from the UI options.
- **2026-06-14:** Wired `computeLayoutAnalysis` into the rack visual model as a read-only layout-mode row hover panel. It surfaces used/wasted/overflow HP and mixed-format blockers, but intentionally does not expose auto-arrange/shuffle controls yet.
- **2026-06-14:** Tightened FFD auto-arrange output to run independently for each physical standard and map moves back onto rows of the same standard. `1u` scope still handles Intellijel and Pulp Logic as separate groups.
- **2026-06-14:** Added the first `Remix layout` action in layout mode. It triggers the existing rack data service, applies FFD row assignments through the existing `backend.update.rackedModules` batch path, blocks mixed-format rows and arrangements that need extra rows, and leaves blank-panel stripping as a separate open checklist item so persisted blanks are not deleted implicitly.
- **2026-06-14:** Refined Remix after real-rack feedback: move output now includes target columns, row-local ordering changes count as valid Remix work, repeated clicks rotate through alternate valid orderings, single-row 1U layouts can be reordered, and successful Remix shows a 10-second Undo snackbar that persists the previous layout if used.
- **2026-06-14:** Implementation note for Remix motion refinement: reuse `rack-visual-model` rows/modules, the existing `app-module-realistic` host, rack editor analysis controls, and current CDK drag timing; preserve signal overlay coordinate keys and add a separate stable movement key; modify only rack visual model component/template/scss and co-located utils/specs; do not touch Supabase, layout algorithm persistence, module rendering internals, or new UI surfaces. Risk: cross-row moves can otherwise recreate row DOM, so row shells now track by index and FLIP resolves post-render elements before playing compositor transforms.
- **2026-06-14:** Corrected cross-row Remix motion for the scaled rack surface by converting viewport-space FLIP deltas into local transform distance using the existing `dragScale` input. Slowed the movement to 420ms with a softer ease-out curve so cross-row moves read as intentional travel instead of a snap.
- **2026-06-14:** Restored manual drag/drop animation isolation after the Remix FLIP work. Manual CDK drops now suppress only the Remix layout-move animation for a short cooldown so the original drag settle/reveal timing can run without competing transforms.
- **2026-06-14:** Refined Remix FLIP to capture full module rects, animate any width/height deltas from a top-left origin, disable the base transform transition while WAAPI owns the move, and scale duration by travel distance from a slower 620ms floor. This targets the remaining edge-case wonkiness in long cross-row or dimension-changing transforms.
- **2026-06-14:** Rejected the ghost-overlay approach after runtime feedback because it combined fade/reappear with awkward movement. Kept direct FLIP, and instead disable Angular enter/leave animations at the rack-screen boundary only during programmatic Remix motion so row-container teardown does not show through while WAAPI owns movement.
- **2026-06-16:** Replaced the placeholder 0/1 valid-arrangement count with exact dynamic counts for bounded small physical-format groups plus a deterministic sampled estimate for larger groups. Surfaced the live exact/estimated summary in the existing Layout analysis panel, while keeping shuffle and confidence intervals out of scope.
