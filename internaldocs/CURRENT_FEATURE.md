# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
     layer before starting the next. Layout before interactions.

---

## Active

### Active: Patch Editor Control Height Consistency (2026-02-25)

Goal:

- Keep inline sort/group controls compact in width.
- Restore control height/typography to match existing standard controls in the app.
- Preserve current sort/group logic and options.

Status: **Planned**

Three-layer execution plan:

### Layer 1 (MVP)

- [ ] Remove custom compact height overrides from patch editor inline controls (`font-size`, reduced infix min-height,
  reduced vertical paddings).
- [ ] Keep only width constraints so controls do not span full row width.

Acceptance:

- Inline controls no longer look vertically compressed.
- Controls remain side-by-side (where space allows) and do not take full width on desktop.

### Layer 2 (Structural)

- [ ] Keep responsive width behavior stable (desktop fixed-ish width, tablet half width, mobile full width).
- [ ] Ensure no impact to floating search control style.

Acceptance:

- Layout behavior is unchanged except for restored height.
- Floating search remains as-is.

### Layer 3 (Polish)

- [ ] Tune spacing (`gap`, margin) for visual consistency with nearby content.
- [ ] Run target spec to confirm no regressions.

Acceptance:

- Visual rhythm is balanced around controls.
- Spec passes.

Execution target files:

- `src/app/components/patch-parts/patch-editor/patch-editor.component.scss`

Verification target:

- `yarn test-headless --include="**/patch-editor.component.spec.ts"`

Verification result:

- Pending.

---

## Session Notes

- Keep only one in-flight feature in this file.
- On completion: add a one-line summary to [COMPLETED.md](./COMPLETED.md), then reset this file back to this template
  state.