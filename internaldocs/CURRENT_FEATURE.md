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

**Status:** 🟡 Active — Layer 4 refinements in progress
**Design rationale:** `PRODUCT_NEEDS.md` → *Sticky "Current Selection" Panel — Design Analysis*

### Goal

A **floating overlay** at the root stacking context that shows connection-creation progress in real time:

- Not rendered when neither CV is selected (zero layout cost)
- **Fades in** (150 ms, fade + translateY) the moment *any* CV is selected (either input or output first)
- Visible above all editor content, anchored bottom-left of the viewport
- Shows a richer partial-selection card when only one side is chosen, regardless of which side came first
- Per-side deselect buttons so users can undo just the input or just the output without restarting
- Single dismiss action (no duplicate close + delete); deselect replaces full cancel when partial
- Confirm button mutates into a "recorded ✓" indicator after confirming — panel then fades out
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

| File                                                                      | Change                                                                                                      |
|---------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| `src/app/components/patch-parts/selection-panel-bridge.service.ts`        | ✅ Done — `@Injectable()`, no `providedIn`; typed; action buses `resetA$`, `resetB$`, `confirm$`             |
| `src/app/components/patch-parts/selection-panel-outlet/` (3 files)        | ✅ Done — `standalone: true`; conditional rendering; animation; partial-hint; needs Layer 4 refinements      |
| `src/app/components/patch-parts/patch-detail-data.service.ts`             | ✅ Done — mirrors to bridge; subscribes to action buses; clears on destroy; needs `resetA$`/`resetB$` wiring |
| `src/app/components/patch-parts/patch-editor/patch-editor.component.html` | ✅ Done — static column removed; full-width modules grid                                                     |
| `src/app/app.component.html` / `app.module.ts`                            | ✅ Done — outlet rendered at root; bridge provided in AppModule                                              |

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

#### Current state: imperative subscribe-and-mutate pattern

Almost every stream in `PatchDetailDataService` uses the subscribe-and-mutate pattern:

```
someSource$.pipe(...).subscribe(v => someBehaviorSubject$.next(v));
```

This works but has compounding problems at scale:

- **Hidden coupling**: `selectedForConnection$` is set by three separate `.subscribe()` calls
  (`resetSelectedForConnection$`, `clickOnModuleCV$`, and bridge action buses). The only way to understand
  what drives it is to grep the whole file.
- **Temporal races**: `withLatestFrom(this.editorConnections$)` reads a snapshot — if
  `editorConnections$` emits between the trigger and the `withLatestFrom` snap, the stale value is used.
  `concatMap` on `requestConnectionDbSync$` mitigates this partially but doesn't fix the root cause.
- **Duplicate state**: `selectedForConnection$` is maintained in `PatchDetailDataService` AND mirrored
  into `bridge.selectionState$` via a separate subscription. Two sources of truth that can drift if
  any emission path is missed.
- **Manual bridge mirroring**: Three separate subscriptions mirror `selectedForConnection$`,
  `singlePatchData$`, `instanceLabelMap$` to the bridge. Every new field that needs to cross the bridge
  requires adding another mirror subscription.
- **`confirmSelectedConnection$` reads `.value` directly**:
  `const selectedForConnection = this.selectedForConnection$.value` bypasses the reactive chain entirely — no
  opportunity to compose or intercept.
- **Instance removal scrubs connections imperatively**: The `.subscribe(removed => { ... })` block
  does 4 separate imperative operations (update instances, scrub connections, sync, renumber). Hard
  to test, hard to trace.
- **No stale-selection guard on instance deletion**: When `removeModuleInstance$` completes, the code
  scrubs `editorConnections$` but does NOT check whether the removed instance is the one currently
  selected in `selectedForConnection$`. A dangling ghost selection can then be confirmed and written
  to the DB with a stale FK.

#### Target pattern: declarative derived streams

The scalable Angular/RxJS pattern is to express derived state as a **single `pipe()` chain that `combineLatest`
or `merge` all its sources**, and keep `BehaviorSubject` only at the imperative "command" boundaries
(form inputs, user gestures). Example:

```
// Instead of:
this.A$.subscribe(v => this.B$.next(transform(v)));

// Use:
readonly
B$ = this.A$.pipe(map(transform), shareReplay(1));
```

For `selectedForConnection$` specifically, the clean form is:

```typescript
readonly
selectedForConnection$ = merge(
        this.resetSelectedForConnection$.pipe(map(() => ({a: null, b: null}))),
        this.clickOnModuleCV$.pipe(
                scan((state, cv) => cv.kind === 'out'
                                ? {...state, a: cv}
                                : {...state, b: cv},
                        {a: null, b: null}
                )
        ),
        this.bridge.resetA$.pipe(withLatestFrom(...), map(...)),
        this.bridge.resetB$.pipe(withLatestFrom(...), map(...)),
        // invalidation: clear stale side when instance is removed
        this.removeModuleInstance$.pipe(...map
to
null
selection
if matching...
),
).
pipe(startWith({a: null, b: null}), shareReplay(1));
```

The bridge then becomes a **pass-through view** — it can subscribe to these declarative streams
instead of receiving `.next()` calls. Long-term, the bridge itself could be eliminated by letting
the outlet inject `PatchDetailDataService` directly (with lazy loading guards), but that's out of
scope here.

#### Specific bugs and gaps identified

| #  | Location                                | Bug / Gap                                                                                                                                                                                                                                                        |
|----|-----------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| B1 | `patch-detail-data.service.ts` L334–345 | `clickOnModuleCV$` uses `withLatestFrom(selectedForConnection$)` — if two rapid clicks arrive, the second `withLatestFrom` snap could be stale (race window). `scan` is the correct operator here.                                                               |
| B2 | `patch-detail-data.service.ts` L662–712 | `removeModuleInstance$` scrubs `editorConnections$` but never checks `selectedForConnection$`. If the deleted instance's CV was selected (either `.a` or `.b`), the selection is dangling. Confirming then writes a connection with a now-invalid `instance_id`. |
| B3 | `selection-panel-outlet` template       | Outer guard `@if (sel.a)` means output-first flow shows the panel, but input-first (`sel.b` only) does not. The panel is invisible until the second click for that order.                                                                                        |
| B4 | `SelectionPanelBridgeService`           | `reset$` and `confirm$` exist but `resetA$` / `resetB$` do not yet. Per-side deselect is not wired at all.                                                                                                                                                       |
| B5 | `confirmSelectedConnection$`            | After a successful confirm, `resetSelectedForConnection$` is never called — the old selection stays visible in the bridge until the user clicks something else. The panel shows a stale state.                                                                   |
| B6 | `SelectionPanelBridgeService`           | Three separate mirror subscriptions (`selectedForConnection$`, `singlePatchData$`, `instanceLabelMap$`) in the service. Adding a fourth field requires touching three places.                                                                                    |
| B7 | `SelectionPanelBridgeService`           | No `confirmed$` signal. After `confirm$` fires and the connection is recorded, the outlet has no way to show the "Recorded ✓" indicator before the panel fades.                                                                                                  |

---

### Optimization plan — what to do (without full rewrite)

A full declarative rewrite of `PatchDetailDataService` is a separate task. The goal here is to fix
the identified bugs and introduce the bridge improvements needed for Layer 4 UI, while keeping the
existing subscribe-and-mutate structure stable. Specific targeted changes:

1. **Replace `withLatestFrom` with `scan` in `clickOnModuleCV$`** — eliminates B1 race.
2. **Add stale-selection guard in `removeModuleInstance$` subscribe** — after scrubbing connections,
   also call `resetSelectedForConnection$` if the removed instance's id matches `sel.a.cv.instance_id`
   or `sel.b.cv.instance_id` — fixes B2.
3. **Add `resetA$`, `resetB$` to bridge; wire in service** — fixes B4, enables 4c deselect UI.
4. **Add `confirmed$` BehaviorSubject to bridge; emit from service after successful confirm** — fixes B7, enables 4d.
5. **Auto-reset selection after confirm** — after recording, call `resetSelectedForConnection$.next()` — fixes B5.
6. **Fix outer guard in outlet template** — `@if (sel.a || sel.b)` — fixes B3.

---

### Layer 4 — Refinements (in progress)

##### 4a — Panel visible regardless of which side is selected first  *(fixes B3)*

**Bug:** `clickOnModuleCV$` puts an `out` CV into `sel.a` and an `in` CV into `sel.b`. The outlet template gates
on `@if (sel.a)` — so starting with an `in` click (which sets only `sel.b`) never shows the panel.

- [x] In the outlet template: change the outer guard from `@if (sel.a)` to `@if (sel.a || sel.b)` so the panel
  appears for both click orders
- [x] In the partial-hint branch (one side only): detect which side is populated and render the right slot:
     - `sel.a` (output selected): show "Output selected — now pick an input"
     - `sel.b` (input selected): show "Input selected — now pick an output"
       Use a computed label: `sel.a ? sel.a : sel.b` for the CV label row; show `kind` chip accordingly

##### 4b — Richer partial-selection card

Currently the partial card only shows module name + CV name. Add:

- [ ] Module **manufacturer name** in a dimmer sub-line (`cv.module.manufacturer?.name`) if available
- [ ] A direction icon: `call_made` for outputs, `call_received` for inputs — placed left of the CV name
- [ ] A dimmed "waiting for…" label on the *other* side (e.g. "Waiting for input…" or "Waiting for output…")
  styled as an empty dashed placeholder slot so the two-slot layout is always visible

##### 4c — Remove duplicate close/cancel; add per-side deselect  *(fixes B4)*

Currently the panel header has a global `close` button, and `app-patch-connection-minimal` also exposes a
`(remove$)` which resets everything. This is redundant.

- [x] Add `resetA$` and `resetB$` Subjects to `SelectionPanelBridgeService`
- [x] In `PatchDetailDataService`: subscribe `bridge.resetA$` → emit `{ a: null, b: sel.b }` into
  `selectedForConnection$`; subscribe `bridge.resetB$` → emit `{ a: sel.a, b: null }`
- [x] Remove the global `close` button from the panel header entirely
- [x] In the partial-hint view: show a small deselect button (`×`) next to the selected CV chip that emits
  `bridge.resetA$.next()` or `bridge.resetB$.next()` depending on which slot is filled
- [x] In the full (both-sides) view: show per-side deselect `×` icons on the input and output slot labels so
  users can undo one side without cancelling the whole connection

##### 4d — Confirm button → "recorded" indicator  *(fixes B5, B7)*

New findings and change of scope: after reviewing UX needs the Recorded flow should not immediately
close the panel. Instead the Confirm button must flip into a non-interactive "Recorded" label (so the
user sees confirmation) and the selection must be kept — the user can then tweak one side (deselect one
slot or choose a different CV) and confirm again. The outlet will still expose the global reset if they want
to cancel everything.

- [x] Add `confirmed$` BehaviorSubject<boolean> (default `false`) to `SelectionPanelBridgeService`
- [x] In `PatchDetailDataService` after successful `isAlreadyInList` check: call
  `this.bridge.confirmed$.next(true)`, but DO NOT immediately call `resetSelectedForConnection$.next()` — keep selection
  live.
- [x] Ensure `bridge.confirmed$` resets to `false` whenever `reset$`, `resetA$`, or `resetB$` fires
- [x] In the outlet template: when `bridge.confirmed$ | async` is `true`, show a read-only success chip (`check_circle`
  icon + "Recorded")
- [x] In `app-patch-connection-minimal` add an `@Input() confirmed` so it swaps the Confirm button for the Recorded
  indicator while preserving selection
- [ ] (opt) Add a short auto-dismiss if you want the panel to eventually hide without losing the UX nuance (currently
  intentionally omitted)

##### 4e — Stale-selection guard on instance deletion  *(fixes B2)*

When `removeModuleInstance$` completes, `editorConnections$` is scrubbed. But `selectedForConnection$` is
not checked — a dangling CV selection referencing the deleted instance can then be confirmed, writing a DB row
with an invalid FK.

- [x] In the `removeModuleInstance$` subscribe block, after scrubbing connections, read
  `this.selectedForConnection$.value`; if `sel.a?.cv.instance_id === removed.id` or
  `sel.b?.cv.instance_id === removed.id`, call `this.resetSelectedForConnection$.next()` to clear
  the dangling selection
- [x] Also ensure `bridge.confirmed$` resets to `false` in this path (since reset$ fires, it's covered
  automatically if the confirmed$ reset is wired to reset$ — see 4d)

##### 4f — Replace `withLatestFrom` with `scan` in CV click handler  *(fixes B1)*

`clickOnModuleCV$` currently uses `withLatestFrom(selectedForConnection$)` — if two rapid clicks arrive
before the BehaviorSubject ticks, the second snap could be stale.

- [x] Replace the `withLatestFrom` + `switch` block in `clickOnModuleCV$` with a `scan` operator (implemented in
  service)

##### 4g — Smoke-test + unit tests

- [x] Smoke-test: idle → no panel; output-first click → partial hint (output slot); input-first click → partial
  hint (input slot); both sides → full preview; deselect one side → back to partial; confirm → "Recorded" chip →
  panel remains visible and allows tweaking; delete instance while selected → selection clears immediately; navigate
  away → panel gone
- [x] Unit tests added for selection/deselect flows and the cancel→input resurrection bug

---

### New findings (user feedback)

During implementation and user review we discovered a few UX clarifications which changed the polish behavior:

- The Confirm action must not immediately close the panel. The user needs the ability to confirm, see a
  persistent "Recorded" indicator, then optionally change only one side (for cases when they want to keep
  the other side and swap the input/out). We implemented this: the `confirmed$` signal is emitted and the
  Confirm button is replaced with a `Recorded` chip; the selection stays live until the user resets or
  changes a side.
- Per-side deselect controls must be visually integrated with the module slot (small deselect chip, not a
  big icon floating far away). The outlet template now renders `deselect-chip` controls inline next to
  the module title; the `app-patch-connection-minimal` component will show a Recorded indicator instead of
  a Confirm button when `confirmed` is true.
- When both CVs belong to the same module, repeating the module name is noisy. The outlet now hides the
  second module name in that case (we still show each CV name) to keep the preview compact and readable.

These UX changes have been applied in code and documented above.

---

### Remaining items / follow-ups

- [ ] Decide whether to auto-dismiss the panel after a short timeout when `confirmed$` becomes `true`.
  Pros: panel eventually clears without user action; Cons: user could be mid-editing and lose context. For
  now we left auto-dismiss out (the outlet shows the Recorded chip and the selection remains until the user acts).
- [ ] Tidy up small TypeScript template warnings (unused lambda args, a few leftover `readonly` uses in unrelated files)
- [ ] Add Playwright e2e that navigates the full flow (select output → cancel → select input; both → deselect one side;
  confirm → recorded chip remains and then tweak one side)
- [ ] If desired, convert `PatchDetailDataService` selection logic to a fully-declarative `selectedForConnection$`
  observable (low-risk but larger refactor).

---

### Notes for reviewers / QA

- Test the confirm flow carefully: confirm should change the button to a Recorded chip and NOT clear the other side.
- Confirming twice (without changing the selection) will attempt to create a duplicate and will show an error snack.
- Deleting an instance that is currently selected will clear that selected side immediately and show a success snack.

---

End of feature file.