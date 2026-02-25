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

### Active: Patch Editor Compact Sort/Group Controls + Extra Modes (2026-02-25)

Goal:

- Make Patch Editor sort/group controls visually compact, matching existing compact controls used elsewhere in the app.
- Add a few low-risk, easy-to-implement sorting and grouping options using the existing strategy pipeline.
- Preserve current behavior for search, copy/remove actions, and backend-first ordering where already supported.

Status: **Planned**

Three-layer execution plan:

### Layer 1 (MVP)

- [ ] Reduce visual footprint of inline sort/group controls (height, padding, label/icon spacing, overall width
  behavior).
- [ ] Keep controls stable on desktop/mobile without overlapping existing floating search/FAB.
- [ ] Preserve existing modes and behavior while applying compact styling.

Acceptance:

- Sort/group controls are clearly smaller and no longer visually dominant.
- Controls remain readable and tappable on mobile.
- Existing sort/group behavior stays unchanged.

### Layer 2 (Structural)

- [ ] Add easy sort modes in strategy registry:
    - `Manufacturer (A→Z)`
    - `Manufacturer (Z→A)`
    - `Connections (most first)`
- [ ] Add easy grouping modes in strategy registry:
    - `Group by connection state` (connected vs no connections)
    - `Group by patch presence` (in patch vs not in patch)
- [ ] Keep integration via existing filter -> sort -> group pipeline.

Acceptance:

- New modes appear in controls and reorder cards immediately.
- No regressions in card actions/connection indicators.
- Strategy model remains single-source and extensible.

### Layer 3 (Polish)

- [ ] Add/adjust unit tests for new sort/group modes and compact-control behavior assumptions (logic-level tests).
- [ ] Fine-tune compact spacing tokens for visual consistency with current app controls.
- [ ] Validate target specs pass.

Acceptance:

- Tests cover added sort/group logic.
- UI remains compact and consistent across breakpoints.
- Verification commands pass.

Execution target files:

- `src/app/components/patch-parts/patch-editor/patch-editor.component.ts`
- `src/app/components/patch-parts/patch-editor/patch-editor.component.html`
- `src/app/components/patch-parts/patch-editor/patch-editor.component.scss`
- `src/app/components/patch-parts/patch-editor/patch-editor.component.spec.ts`

Verification target:

- `yarn test-headless --include="**/patch-editor.component.spec.ts"`

Verification result:

- Pending.

---

## Empty Template

### Active: <Feature Name> (<YYYY-MM-DD>)

Goal:

- <What outcome this feature should create>
- <Any constraints/requirements>

Status: **Planned**

Three-layer execution plan:

### Layer 1 (MVP)

- [ ] <Step 1>
- [ ] <Step 2>

Acceptance:

- <How to tell Layer 1 is done>

### Layer 2 (Structural)

- [ ] <Step 1>
- [ ] <Step 2>

Acceptance:

- <How to tell Layer 2 is done>

### Layer 3 (Polish)

- [ ] <Step 1>
- [ ] <Step 2>

Acceptance:

- <How to tell Layer 3 is done>

Execution target files:

- `<path/to/file>`
- `<path/to/file>`

Verification target:

- `<repo-approved command>`

Verification result:

- Pending.

---

## Session Notes

- Keep only one in-flight feature in this file.
- On completion: add a one-line summary to [COMPLETED.md](./COMPLETED.md), then reset this file back to this template
  state.