# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each
     > layer before starting the next. Layout before interactions.

---

## Previous context (implemented, stable)

### Sticky Floating "Current Selection" Panel

```
PatchDetailDataService  →  SelectionPanelBridgeService  →  SelectionPanelOutletComponent
```

Action direction: outlet → bridge → PatchDetailDataService.
Key files: `patch-detail-data.service.ts`, `selection-panel-bridge.service.ts`, `selection-panel-outlet/`,
`patch-connection-minimal/`.

Auto-save spurious write: fixed with `reset(value, {emitEvent: false})` in `patch-detail-data.service.ts`.

---

## Feature: Edit FAB — Position Fix + Service-Layer Toggle Routing

**Status:** ✅ Complete

**Problem 1 — FAB position:**  
The FAB uses `position: sticky` inside a flex column, so it moves with scroll and doesn't actually float over the
content at the bottom-right corner. Material spec: FAB is `position: fixed`, `bottom: 1rem`, `right: 1rem`
(≈ 16 dp from both edges).

**Problem 2 — Toggle routing bypasses service layer:**  
Templates call `BehaviorSubject.next()` directly from the template for patch and module editors, which violates the
`Component → Data Service → API` layering in ARCHITECTURE.md. The rack editor already does this correctly via
`requestRackEditableStatusChange$` (a Subject whose pipeline lives entirely in the service). Patch and module editors
need equivalent action Subjects.

---

### Architecture

```
Template  →  requestPatchEditingToggle$.next()  →  PatchDetailDataService
                                                      toggles patchEditingPanelOpenState$

Template  →  requestModuleEditingToggle$.next()  →  ModuleDetailDataService
                                                      toggles moduleEditingPanelOpenState$
```

FAB component emits `toggle$` → host template routes to the appropriate service Subject (no `.next()` on
BehaviorSubjects from templates).

---

### Key files

| File                                   | Change                                                                  |
|----------------------------------------|-------------------------------------------------------------------------|
| `edit-fab.component.scss`              | `position: fixed; bottom: 1rem; right: 1rem` (remove sticky/align-self) |
| `patch-detail-data.service.ts`         | Add `requestPatchEditingToggle$ = new Subject<void>()` + pipeline       |
| `module-detail-data.service.ts`        | Add `requestModuleEditingToggle$ = new Subject<void>()` + pipeline      |
| `patch-minimal.component.html`         | Wire `(toggle$)` to `requestPatchEditingToggle$.next()`                 |
| `module-browser-detail.component.html` | Wire `(toggle$)` to `dataService.requestModuleEditingToggle$.next()`    |

---

### Layers

**MVP**

- [x] Fix FAB SCSS: `position: fixed; bottom: 1rem; right: 1rem`; remove `sticky`, `align-self`
- [x] Add `requestPatchEditingToggle$` Subject + toggle pipeline to `PatchDetailDataService`
- [x] Wire `patch-minimal.component.html` FAB `(toggle$)` to `requestPatchEditingToggle$.next()`
- [x] Add `requestModuleEditingToggle$` Subject + toggle pipeline to `ModuleDetailDataService`
- [x] Wire `module-browser-detail.component.html` FAB `(toggle$)` to `requestModuleEditingToggle$.next()`

**Structural**

- [x] Verify rack FAB already routes via `requestRackEditableStatusChange$` (no change needed)

**Polish**

- [x] Run `yarn test-headless` — all 318 tests pass

---

End of feature file.