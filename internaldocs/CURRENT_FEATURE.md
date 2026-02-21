# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file at the start of every session.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each
     layer before starting the next. Layout before interactions.

---

## Feature: Sticky Floating "Current Selection" Panel in Patch Editor

**Status:** 🟢 Mostly complete — Layer 4 implemented (a few small polish follow-ups remain)
**Design rationale:** `PRODUCT_NEEDS.md` → *Sticky "Current Selection" Panel — Design Analysis*

### Goal

A **floating overlay** at the root stacking context that shows connection-creation progress in real time:

- Not rendered when neither CV is selected (zero layout cost)
- **Fades in** (150 ms, fade + translateY) the moment *any* CV is selected (either input or output first)
- Visible above all editor content, anchored bottom-left of the viewport
- Shows a richer partial-selection card when only one side is chosen, regardless of which side came first
- Per-side deselect buttons so users can undo just the input or just the output without restarting
- Single dismiss action (no duplicate close + delete); deselect replaces full cancel when partial
- Confirm button mutates into a "recorded ✓" indicator after confirming — panel then remains visible (persistent) until
  a new event
- Falls back to inline layout on narrow viewports (< 800 px)

---

## Architecture — Root-level outlet + bridge service ✅ (implemented)

**Data flow:**

```
PatchDetailDataService  (module-scoped — writes state)
         │   mirrors selectedForConnection$, singlePatchData$, instanceLabelMap$ on every change
         ▼
SelectionPanelBridgeService  (provided in AppModule — message bus)
         │   BehaviorSubject<SelectionState>  +  action Subjects (resetA$, resetB$, confirm$)
         ▼
SelectionPanelOutletComponent  (standalone, in app.component.html — reads state, emits actions)
         │   position: fixed, bottom-left, conditionally rendered
         └─  app-patch-connection-minimal  (existing component)
```

Action direction: **outlet → bridge → PatchDetailDataService**.

---

### Key Files

| File                                                                      | Change                                                                                                                                                                    |
|---------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `src/app/components/patch-parts/selection-panel-bridge.service.ts`        | ✅ Done — `@Injectable()`, no `providedIn`; typed; action buses `resetA$`, `resetB$`, `confirm$`; added `recordedKey$`, `editorConnections$`, `confirmed$` derivation      |
| `src/app/components/patch-parts/selection-panel-outlet/` (3 files)        | ✅ Done — `standalone: true`; conditional rendering; animation; partial-hint; Layer 4 refinements applied                                                                  |
| `src/app/components/patch-parts/patch-detail-data.service.ts`             | ✅ Done — mirrors to bridge; subscribes to action buses; implements scan-based selection accumulator, stale-selection guard on instance removal, and emits record$ on save |
| `src/app/components/patch-parts/patch-editor/patch-editor.component.html` | ✅ Done — static column removed; full-width modules grid                                                                                                                   |
| `src/app/app.component.html` / `app.module.ts`                            | ✅ Done — outlet rendered at root; bridge provided in AppModule                                                                                                            |

---

### Three Layers ✅ Complete

**Layer 1 — MVP (layout):** Bridge service + outlet; PatchDetailDataService → bridge; root render; static column
removed. ✅  
**Layer 2 — Structural (behaviour):** Conditional render; confirm/reset; aria; bridge cleared on destroy. ✅  
**Layer 3 — Polish (animation + responsive):** `fadeSlideUp`; narrow-viewport fallback. ✅

---

### Steps

#### Layers 1–3 ✅ Complete

All scaffold, wiring, animation, and responsive work is done. See COMPLETED.md for detailed history.

---

### Dataflow Optimization Analysis

(Analysis kept for reference — summary: moved toward fewer imperative mutations, consolidated selection accumulator
using `scan(...)`, and centralized `confirmed` detection via identity comparisons.)

---

### Specific bugs and gaps identified (and status)

| #  | Location                          | Bug / Gap                                                    | Status / Fix                                                                               |
|----|-----------------------------------|--------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| B1 | `patch-detail-data.service.ts`    | Race in click handler using `withLatestFrom`                 | Fixed — replaced with `scan` accumulator to remove race window                             |
| B2 | `patch-detail-data.service.ts`    | Stale-selection after instance removal                       | Fixed — selection cleared when removed instance was selected                               |
| B3 | `selection-panel-outlet` template | Panel not visible when only `sel.b` present (input-first)    | Fixed — outer guard now `sel.a                                                             || sel.b` and partial-hint shows proper hint   |
| B4 | `SelectionPanelBridgeService`     | Missing per-side deselect action buses                       | Fixed — added `resetA$` / `resetB$` and wired into service/outlet                          |
| B5 | `confirmSelectedConnection$`      | Confirm flow left selection live but no persistent indicator | Fixed — introduced persistent `recordedKey$` and `confirmed$` derivation                   |
| B6 | `SelectionPanelBridgeService`     | Multiple mirror subscriptions                                | Mitigated — bridge now receives mirrored streams and confirmed checks centrally            |
| B7 | `SelectionPanelBridgeService`     | No `confirmed$` previously                                   | Fixed — `confirmed$` is derived via identity comparison with persisted key and editor list |

---

### Layer 4 — Refinements (current state)

##### 4a — Panel visible regardless of which side is selected first  *(fixes B3)*

- [x] Outlet top-level guard uses `@if (sel.a || sel.b)` so the panel appears for both click orders
- [x] Partial-hint branch renders the correct direction hint and per-side deselect control

##### 4b — Richer partial-selection card

- [ ] Module manufacturer name in the partial card (optional polish)
- [ ] Direction icon placement + waiting placeholder slot for the other side
- [ ] Dashed placeholder styling for the empty slot so the two-slot layout is visually stable

  Status: left as a visual polish pass (4b). I can implement these small template/style tweaks next if you'd like.

##### 4c — Remove duplicate close/cancel; add per-side deselect  *(fixes B4)*

- [x] `resetA$` / `resetB$` added to `SelectionPanelBridgeService`
- [x] Service wired so per-side deselect updates `selectedForConnection$` deterministically
- [x] Global close button removed in favor of per-side deselect UX

##### 4d — Confirm button → "recorded" indicator  *(fixes B5, B7)*

- [x] `recordedKey$` persistent identity added to bridge
- [x] `confirmed$` derived and drives UI `Recorded` chip immediately when selection equals a recorded or existing
  connection
- [x] `PatchDetailDataService` emits `bridge.record$.next()` on save and mirrors `editorConnections$` into the bridge so
  `confirmed$` can detect DB-saved connections
- [x] Selection remains live after confirm (user can tweak one side)
- [ ] (opt) Auto-dismiss recorded indicator — intentionally left off (design choice)

##### 4e — Stale-selection guard on instance deletion  *(fixes B2)*

- [x] After instance deletion the code scrubs `editorConnections$` and clears `selectedForConnection$` if it referenced
  the removed instance, preventing invalid FK writes

##### 4f — Replace `withLatestFrom` with `scan` in CV click handler  *(fixes B1)*

- [x] Implemented `scan`-based accumulator for CV clicks in `PatchDetailDataService` to remove race windows

##### 4g — Smoke-test + unit tests

- [x] Manual smoke checklist validated locally
- [x] Unit tests run: headless Karma suite executed — all tests passed locally after these changes

---

### Implementation notes (what I changed)

- Implemented identity-based persistent confirmation using a `ConnectionKey` shape and a `recordedKey$` on the bridge.
- `confirmed$` is now a pure derived observable that is true whenever the live selection matches the `recordedKey$` or
  any matching connection in `editorConnections$` (mirrored from `PatchDetailDataService`).
- `PatchDetailDataService`:
  - Consolidated selection handling into a merge + `scan(...)` accumulator.
  - Emit `bridge.record$.next()` on successful confirm (persisted key captured in bridge constructor subscription).
  - Mirror `editorConnections$` into the bridge so `confirmed$` can detect existing DB connections immediately.
  - Added a stale-selection guard in `removeModuleInstance$` so deleting an instance clears selection that referenced
    it.
- `SelectionPanelBridgeService`:
  - Added `recordedKey$`, `editorConnections$`, `record$`, `confirmed$` and `resetA$`/`resetB$` action buses.
  - `confirmed$` is derived and `shareReplay(1)` so the outlet sees immediate state.

Files changed (high level):

- `src/app/components/patch-parts/selection-panel-bridge.service.ts`
- `src/app/components/patch-parts/patch-detail-data.service.ts`
- `src/app/components/patch-parts/patch-detail-data.service.spec.ts` (test adapted to derived `confirmed$` subscription)
- `src/app/components/patch-parts/selection-panel-outlet/selection-panel-outlet.component.html` (template guard and
  deselect controls)

Automated checks: local headless Karma run returned: `316 SUCCESS` on the project's test suite after the changes.

---

### Remaining items / follow-ups

- [ ] Decide whether to auto-dismiss the panel after a short timeout when `confirmed$` becomes `true` (UX trade-off).
  For now the recorded indicator is persistent until a new event.
- [ ] Tidy up small TypeScript template warnings (unused lambda args, a few leftover `readonly` uses in unrelated
  files). I left them unchanged to keep this PR focused and low-risk; happy to clean them next.
- [ ] Add a focused Playwright e2e that navigates the full selection→confirm→tweak flow (recommended for regression
  protection).
- [ ] (Optional) Convert `PatchDetailDataService` selection logic to a fully-declarative `selectedForConnection$`
  observable (larger, safe refactor).

---

### Notes for reviewers / QA

- Test the confirm flow carefully: confirm should change the button to a Recorded chip and NOT clear the other side. The
  recorded chip appears immediately whenever the selection equals a recorded or DB-saved connection.
- Confirming twice (without changing the selection) will attempt to create a duplicate and will show an error snack (
  existing behavior preserved).
- Deleting an instance that is currently selected will clear that selected side immediately and show a success snack.

---

## Pre-flight check — issues found from previous session (weaker model)

> Reviewed on 2026-02-21. No logic bugs found. The following are rule violations left behind.

| File                                  | Issue                                                                                                                                                           |
|---------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `selection-panel-bridge.service.ts`   | Constructor has two raw subscriptions with no `takeUntil`; service does not extend `SubManager`                                                                 |
| `selection-panel-bridge.service.ts`   | `startWith(false)` is placed after `distinctUntilChanged()` in `confirmed$` — emits a redundant `false` on subscribe, bypassing dedup                           |
| `selection-panel-outlet.component.ts` | Does not extend `SubManager`; `ngOnInit` subscription on `bridge.confirmed$` has no `takeUntil` — leaky                                                         |
| `selection-panel-outlet.component.ts` | Dead timer code: `confirmedTimer` + `clearConfirmedTimer()` declared but timer is never set                                                                     |
| `patch-detail-data.service.ts`        | Three commented-out code blocks (violates no-dead-code rule)                                                                                                    |
| `patch-detail-data.service.ts`        | `withLatestFrom(this.selectedForConnection$)` in scan chain is dead — `prevPublished` is never read (commented block was removed but `withLatestFrom` was left) |

These will be fixed as part of Layer 5 execution (add to step list below).

---

## Layer 5 — Deselect button integration + duplicate name removal

**Status:** 🟡 Planned — awaiting user confirmation

### Problem

When both CVs are selected the panel renders two independent sections:

1. `.panel-preview-actions` — two `.panel-slot` rows: direction icon + **module name** + deselect `close` button + CV
   name
2. `app-patch-connection-minimal` below — `app-module-minimal` for each side, which renders the **module name again**

Result: module names are duplicated. The deselect buttons sit above the cards they control, visually disconnected from
what they affect.

### Goal

- Module name appears exactly once per side, inside the module card
- Deselect button is co-located with the card it controls (direction icon + X button as a slot header row above each
  module card)
- No behaviour change in non-creator or non-both-selected states
- Zero change to other usages of `PatchConnectionMinimalComponent`

### Files changed

| File                                      | Change                                                                                                                                                                                    |
|-------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `patch-connection-minimal.component.ts`   | Add `@Input() showDeselectButtons = false`, `@Output() readonly deselectA$`, `@Output() readonly deselectB$`                                                                              |
| `patch-connection-minimal.component.html` | When `isCreator && showDeselectButtons`, render `.slot-header` row (direction icon + deselect button) above each `app-module-minimal`                                                     |
| `patch-connection-minimal.component.scss` | Add `.slot-header`, `.slot-direction-icon`, `.slot-deselect` styles                                                                                                                       |
| `selection-panel-outlet.component.html`   | Remove `.panel-preview-actions` block; add `[showDeselectButtons]="true"` `(deselectA$)="bridge.resetA$.next()"` `(deselectB$)="bridge.resetB$.next()"` to `app-patch-connection-minimal` |
| `selection-panel-outlet.component.scss`   | Remove duplicate rule blocks; remove unused `.panel-slot` / `.panel-preview-actions` / `.slot-*` styles                                                                                   |

### Steps

- [ ] 
  1. Add `showDeselectButtons`, `deselectA$`, `deselectB$` to `PatchConnectionMinimalComponent`
- [ ] 
  2. Update `patch-connection-minimal.component.html` — slot header rows with direction icon + deselect button, guarded
     by `isCreator && showDeselectButtons`
- [ ] 
  3. Update outlet template — remove `.panel-preview-actions`; bind new inputs/outputs
- [ ] 
  4. Clean up outlet SCSS — remove duplicate blocks + dead selectors
- [ ]
  5. Fix pre-flight violations: SubManager + takeUntil on bridge service and outlet; remove dead timer code; remove
     commented-out blocks from data service; remove unused `withLatestFrom` from scan chain
- [ ]
  6. Run `yarn test-headless` — verify no regressions

### Edge cases

| Case                                                   | Handling                                                                                                            |
|--------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| Same module on both sides                              | Direction icons (`call_made` / `call_received`) distinguish A from B; deselect buttons work independently           |
| Confirmed state                                        | Deselect buttons remain visible and functional — user should still be able to tweak one side                        |
| Non-creator mode (`isCreator=false`)                   | `showDeselectButtons` defaults to `false`; guard `isCreator && showDeselectButtons` means zero visual change        |
| Narrow viewport (< 800px)                              | Panel hidden via SCSS; `col-lt-MD` stacks modules vertically for wider-narrow cases — slot headers follow naturally |
| `instanceLabelMap` with multi-instance module          | Unchanged — labels still render via `nameSuffix` input on `app-module-minimal`                                      |
| `deselectA$` / `deselectB$` unbound (other call sites) | `EventEmitter` outputs with no listener — no effect; Angular does not require outputs to be bound                   |

### Backward compatibility

All changes to `PatchConnectionMinimalComponent` are additive. New inputs default to non-breaking values. Existing call
sites (connection list, edit mode) are unaffected.

---

End of feature file.