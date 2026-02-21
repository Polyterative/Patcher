# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each
     > layer before starting the next. Layout before interactions.

---

## Feature: Sticky Floating "Current Selection" Panel in Patch Editor

**Status:** 🟢 Live — ongoing bug fixes

**Design rationale:** `PRODUCT_NEEDS.md` → *Sticky "Current Selection" Panel — Design Analysis*

### Architecture (implemented)

```
PatchDetailDataService  (module-scoped — writes state)
         │   mirrors selectedForConnection$, singlePatchData$, instanceLabelMap$ on every change
         ▼
SelectionPanelBridgeService  (provided in AppModule — message bus)
         │   BehaviorSubject<SelectionState>  +  action Subjects (resetA$, resetB$, confirm$)
         ▼
SelectionPanelOutletComponent  (standalone, in app.component.html — reads state, emits actions)
         │   position: fixed, bottom-left, conditionally rendered
         └─  app-patch-connection-minimal  (isCreator + showDeselectButtons)
```

Action direction: **outlet → bridge → PatchDetailDataService**.

### Key files

| File                                | Role                                                                 |
|-------------------------------------|----------------------------------------------------------------------|
| `patch-detail-data.service.ts`      | State + business logic; scan accumulator; stale-selection guard      |
| `selection-panel-bridge.service.ts` | Message bus; `confirmed$`; `recordedKey$`; action Subjects           |
| `selection-panel-outlet/`           | Root-level floating panel; async pipe only; extends SubManager       |
| `patch-connection-minimal/`         | Card + slot headers with deselect buttons when `showDeselectButtons` |

---

## Active bug — Spurious auto-save on patch open

**Status:** 🟡 Planned

### Root cause

On every patch open the following cascade fires:

1. `updateSinglePatchData$` → `backend.get.patchWithId()` → `singlePatchData$.next(data)`
2. The `singlePatchData$` initialization subscriber calls `reset()` then `patchValue(data.name)` on both form controls
3. Both calls emit through `valueChanges` (Angular default behaviour)
4. The auto-save pipeline is subscribed to those same `valueChanges` — it sees the emissions as user edits, waits 800
   ms, and calls `backend.update.patchSilent()`

`distinctUntilChanged()` on the auto-save stream does not help because the value genuinely changes (`null` → actual
name) during initialization.

### Fix

Pass `{emitEvent: false}` to the form control calls inside the initialization subscriber. Angular's form API provides
this option specifically for programmatic value setting that must not be treated as user input.

Collapse the current four-line `reset()` + `patchValue()` pattern into two `reset(value, {emitEvent: false})` calls.

**File:** `patch-detail-data.service.ts` only — lines 246–253.

### Steps

- [ ] Replace `reset()` + `patchValue()` in the `singlePatchData$` initialization subscriber with
  `reset(value, {emitEvent: false})`
- [ ] Run `yarn test-headless` — verify no regressions

### Risk

Very low. `{emitEvent: false}` only suppresses events on this initialization path. All user-triggered `valueChanges`
still flow through normally to the auto-save and local mutation subscribers.

---

End of feature file.