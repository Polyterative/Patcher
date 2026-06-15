<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### MEDIUM: Rack Editor — Quick-add blank panel shortcut

**Why:** Adding a blank panel to fill leftover HP currently requires opening the full module
picker, searching for a blank, and dragging it in. This is far too many steps for what is a
very common finishing operation. A purpose-built shortcut should take one or two taps.

**Context:** blank modules already exist in the DB as real module rows (`rack-blank-module.constants.ts`):
- 3U Eurorack blanks: IDs 4647–4666 (1 HP → 20 HP, index = HP size)
- Intellijel 1U blanks: IDs 4711–4735 (1 HP → 25 HP)

The correct blank ID for a given HP size is therefore directly derivable — no search needed.

**Interaction design (space-efficient, low-click):**

The primary proposal is a **segmented number strip** rendered at the end of each rack row
(or in the row's hover/action bar). It shows compact HP buttons `1 2 3 4 6 8` (the most
common blank sizes — covers 99 % of use cases in 6 taps). Tapping a number immediately
inserts the matching blank at the end of that row; no confirmation needed (blank panels
are trivially removable). A secondary `…` chip opens a small popover with the full 1–20 HP
range for edge cases.

Alternative considered: a single `+□` button that cycles through sizes on repeated taps —
rejected because it requires counting taps and gives no visual overview of available sizes.

**Checklist:**

- [x] Expose a per-row "add blank" action area in `rack-visual-model.component.html`
      (visible on row hover in edit mode, or always visible when `rowOverflowHp < 0` i.e.
      there is free space to fill). Keep it visually lightweight — icon + number strip,
      not a full button row.
- [x] Build the HP number strip as a row of `mat-mini-fab` or small flat `mat-button`
      elements: `[1, 2, 3, 4, 6, 8]`. Tapping any triggers
      `rackDetailDataService.addBlankToRow$(rowId, hp)` (new action).
- [x] Add `addBlankToRow$` action in `rack-detail-data.service.ts`: resolves the correct
      blank module ID from `BLANK_MODULE_IDS` (offset by HP value from the base ID 4646 for
      3U blanks), calls `backend.add.rackedModule(...)`, then applies an optimistic local
      update (ties into the diff-based update work).
- [x] `…` overflow button opens a compact `MatMenu` or inline number grid showing the full
      1–20 HP range for unusual sizes.
- [x] Ground the strip visual style in `internaldocs/DESIGN_LANGUAGE.md` — should feel like
      a tool affordance, not a call-to-action button.
- [x] Intelligently pre-select / highlight the size that exactly fills the remaining free HP
      in that row (computed from `rowUsedHp` vs `rackData.hp`) so one tap fills the gap.
---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14T20:20+02:00 — Re-enabled the existing rack visual blank-strip affordance instead
  of introducing a new control surface. Kept common sizes inline (`1 2 3 4 6 8`) and put the
  full 1–20 HP range behind a compact Material menu so the row stays dense and tool-like.
