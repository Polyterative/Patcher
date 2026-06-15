<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: PRODUCT — Tier 0 (ship in any order; no external dependencies) -->

#### HIGH: Rack Editor — Optimistic / diff-based updates (no full-reload flash)

**Why:** Every destructive rack operation (remove module, reorder, etc.) triggers a full data
reload that flashes the entire view, making it impossible to track which module was just
affected. The goal is to eliminate full-page re-renders for rack mutations and make every
change feel instant and local.

**Layer 1 — Exit animation before reload (quick win)**

- [x] Add a CSS/Angular-animation exit sequence to the module tile in the rack visual model
      (`rack-visual-model` / `module-realistic` component). When a remove action is confirmed,
      play the exit animation on the specific tile first (e.g. fade+scale-down, ~180 ms),
      *then* trigger the backend delete and reload pipeline. This ensures the user always sees
      which module was removed before the view updates. Use the existing `[@leave]` animation
      pattern already present in `module-tags.component.html` as reference.

**Layer 2 — Optimistic / diff-based state (structural)**

- [x] Replace the "delete → full reload" pattern with an **optimistic local update**: on
      remove, immediately splice the module out of the in-memory rack state (the observable
      driving the visual model) and fire the backend call in the background. On backend success,
      do nothing (state is already correct). On error, restore the original state and show an
      error snackbar.
- [x] Apply the same diff pattern to **reorder** operations: `requestRackedModulesDbSync$`
      pipeline now captures a snapshot before backend sync and restores on error.
- [x] Apply the optimistic diff pattern to **add** operations (harder — requires DB-generated ID).
- [x] Audit `rack-detail-data.service.ts` for every place a full `rackWithId` cache bust +
      reload is triggered after a write; replace each with a targeted `state$.next(patchedState)`
      emission where the operation is local enough to compute the new state deterministically.
- [x] Long-term: no rack operation should cause a visible full-page re-render. Track remaining
      full-reload call sites as tech debt until all are eliminated.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14 — Add operations slice completed: bottom-picker modules are inserted as local unracked modules before backend completion, quick-add blanks are inserted into `rowedRackedModules$` without a full rack reload, and generated racking ids are reconciled through `applyPersistedRackingIds` with targeted rollback on failure.
- 2026-06-14 — Full-reload audit completed. The only remaining `updateSingleRackData$` write path is rack duplication after `history.replaceState()` to hydrate the newly created rack id/token; same-rack mutations now stay local where deterministic. Tightened panel-switch persistence so a failed backend update restores the prior `selectedPanelId` instead of leaving failed local state visible.
