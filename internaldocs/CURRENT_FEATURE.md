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

**Status:** 🟢 Fixed — 318 tests passing

Form controls now initialized with `reset(value, {emitEvent: false})` so programmatic population on patch load does not
trigger the auto-save pipeline. Fix is in `patch-detail-data.service.ts`.

---

End of feature file.