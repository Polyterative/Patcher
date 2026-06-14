<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### LOW: Filter inputs — focus-triggered preset chips overlay

**Why:** Numeric and certain text filter fields require manual typing even when the vast
majority of users pick from a small set of common values. Surfacing 3–4 preset chips on
focus saves keystrokes and is faster than typing, without replacing the ability to type a
custom value.

**Interaction model:**
- On `focus`, a small overlay/panel appears **above or below** the input (aligned to the
  input width, never wider) containing up to 4 preset chips.
- Clicking a chip fills the control value and dismisses the overlay — identical to typing
  that value.
- The overlay dismisses on blur or on Escape. It does **not** block the user from typing.
- If the control already has a value that matches a preset, that chip is highlighted.

**Implementation approach:**
`mat-form-entity.component` already imports `MatAutocomplete`. Add an optional
`@Input() presets: (string | number)[]` input (empty by default — zero-impact on existing
uses). When `presets` is non-empty and the field type is `numeric` or `text`, wire a
`matAutocomplete` panel with the preset options rendered as compact chips rather than the
standard autocomplete list style. This reuses the existing CDK overlay infrastructure.

Alternatively, implement as a standalone wrapper directive `AppInputPresetsDirective` that
can be applied to any `mat-form-field` — more composable, zero changes to the existing
component.

**Fields that benefit from presets (initial set):**

| Field | Presets |
|-------|---------|
| HP (module filter) | `2, 4, 8, 16` |
| HP (rack creator) | `84, 104, 126, 168` |
| Rows (rack creator) | `3, 4, 6, 9` |
| Any HP numeric in forms | same as module filter |

More fields can opt in by passing `[presets]` — the mechanism is generic.

**Checklist:**

- [x] Decide implementation: extend `mat-form-entity` with `@Input() presets` vs standalone
      directive. Prefer directive for composability.
- [x] Build the preset overlay (4 chips max, compact, dismisses on blur/Escape/chip click).
- [x] Wire preset chips to set the `FormControl` value directly.
- [x] Apply to HP filter field in module browser and manufacturer page.
- [x] Apply to rack creator HP + rows fields.
- [x] Unit-test: preset chip click sets correct control value; overlay absent when
      `presets` is empty.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

