# Current Feature / AI RAM

> **Rules for AI agents using this file:**
> 1. **Read this file at the start of every session** — it describes the feature currently being developed.
> 2. **Keep it updated as you work** — check off steps, add discoveries.
> 3. **One feature at a time** — when a feature is complete, archive the content as a one-line summary in TODO.md
     > Completed, then reset this file to the Empty Template at the bottom.
> 4. **This file owns the detail; TODO.md owns the backlog.** — implementation steps, gotchas, file names live here.
     TODO.md only holds a one-line entry per feature while it is in progress.

---

## Feature: Duplicate Panel Detection

**Status:** 🟡 In progress
**Started:** Feb 19

### Goal

Prevent users from uploading a panel image with a color/type that already exists on the module. Currently, duplicate
panels are only caught by a backend DB constraint error (`duplicate key value violates`), which gives a poor user
experience. The fix adds proactive client-side validation in the module editor so the "Add Panel" button is disabled
when the selected panel type already exists, and a clear warning message is shown.

### Context

- **Module editor component:** `src/app/components/module-parts/module-editor/module-editor.component.ts` + `.html`
- **Panel types:** Light (1), Dark (2), Special edition (3), Limited edition (4) — defined in `panelType` form control
  options
- **Existing panels:** available via `this.data.panels` (`ModulePanel[]`), each has a `color` field matching the panel
  type value
- **Current error handling:** `catchError` in `savePanels$` stream detects `duplicate key value violates` but only after
  the upload attempt fails
- **DB table:** `module_panels` — `color` field maps to the panel type number

### Steps

- [ ] Add a computed observable `existingPanelColors$` derived from `this.data.panels` that tracks which color values
  are already present
- [ ] Add a `panelTypeAlreadyExists$` observable that combines `existingPanelColors$` with
  `panelType.control.valueChanges` to produce a boolean
- [ ] Disable the "Add Panel" button when `panelTypeAlreadyExists$` emits `true`
- [ ] Show a warning message in the template when the selected panel type already exists (e.g., "This module already has
  a {type} panel")
- [ ] Keep the existing `catchError` as a safety net for race conditions
- [ ] Write unit tests for the duplicate detection logic
- [ ] Run targeted tests to verify

### Gotchas

- `data.panels` is an `@Input()` — need to handle the case where it might update after initial load (e.g., after a panel
  is deleted)
- Panel `color` is a number field (1–4), while `panelType.control.value` is an object `{ name, value, id }`
- The `savePanels$` stream should still retain its `catchError` for the DB constraint as a safety net