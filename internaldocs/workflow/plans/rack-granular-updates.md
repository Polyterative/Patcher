# Rack Editor — Granular Local Updates (no-reload animations)

**Status:** IN PROGRESS — core no-reload behavior is implemented; polish steps remain open.

**Goal:** All rack CRUD operations mutate `rowedRackedModules$` in-place so Angular's `@for` tracker preserves existing DOM elements, eliminating the staggered `[@enter]` re-animation that triggers on full reloads. Drag/drop and future row-move animations are preserved.

**Related prior work:** `rack-editor-optimistic-diff-based-updates-no-full-reload-flash.md` (Layer 1 + Layer 2 partly done — exit animation and remove/reorder optimistic updates are already in). This plan closes the remaining gaps and adds the merge-refresh infrastructure.

---

## Root cause analysis

### Problem 1 — Unstable `@for` track
```html
@for (rackedModule of row; track rackedModule; ...)
  <app-module-realistic [@enter]="{ value: '', params: { delay: (i * 50)}}">
```
`track rackedModule` uses object identity. Any time `rowedRackedModules$` emits a new array built from `buildRowedModulesArray` (which allocates fresh objects), every module element is destroyed and re-created → staggered `[@enter]` on all modules.

**Fix:** `track rackedModule.rackingData.id ?? ('unracked-' + i)` — stable across emits.

### Problem 2 — `singleRackData$` drives module re-fetch unconditionally
```ts
this.singleRackData$.pipe(
  filter(x => !!x),
  switchMap(rack => this.backend.get.rackedModules(rack.id))
)
```
Every `singleRackData$.next(...)` — even metadata-only updates like bumping `rows` count or syncing the name — triggers a full backend fetch and rebuilds all row arrays with new objects. Combined with Problem 1, this flashes the entire rack.

**Fix:** Decouple module-reload from rack-metadata changes with a dedicated `loadModulesFor$` subject.

### Problem 3 — Operations that still call `updateSingleRackData$` or `singleRackData$.next()`
| Subject handler | Offending call |
|---|---|
| `requestAddNewRow$` | `this.updateSingleRackData$.next(id)` |
| `requestRemoveRow$` | `this.updateSingleRackData$.next(id)` |
| `requestRackedModuleRemoval$` | `this.singleRackData$.next(rackData)` |
| `requestRackedModuleRowClearing$` | `this.singleRackData$.next(rackData)` |
| `requestRackedModuleReplaceWithBlank$` | `this.updateSingleRackData$.next(id)` |
| `addModuleToRack$` | `this.updateSingleRackData$.next(id)` |
| `addBlankToRow$` | `this.updateSingleRackData$.next(id)` |
| `callBackendToUpdateModulesOfRack` tap | `this.singleRackData$.next(rack)` (when IDs missing — used by duplication) |

---

## Files touched

| File | Change |
|---|---|
| `rack-visual-model.component.html` | Fix `@for` track (S1) |
| `rack-detail-data.service.ts` | S2–S11: decoupling, subjects, subscribe fixes |
| `rack-detail-data.utils.ts` | S12: add `mergeRefreshedModules()` |
| `rack-detail-data.utils.spec.ts` | S13: unit tests for merge helper |
| `rack-detail-data.service.spec.ts` | S14: verify no regressions |

---

## Assumptions

1. `backend.add.rackModule` does **not** return the newly inserted row's full module data (confirmed — no `.select(...)` in `supabase-add.ts`). A full `refreshModulesFromBackend$` fetch+merge is the cheapest correct path without a schema change.
2. Rows have no stable identity key beyond their index. Row tracking by `$index` is used for S3/S6/S7 correctness; visual row-move animation (S15) uses CSS classes instead of Angular Animations state transitions.
3. The `requestMoveRow$` and `requestDeleteRow$` handlers already do local-state-first updates with rollback — they are not changed by this plan (they already avoid full reloads).

---

## Implementation steps

### Layer 1 — MVP (stop the unintended animation)

**S1 — `rack-visual-model.component.html`**  
Line 112: change
```html
@for (rackedModule of row; track rackedModule; let i = $index)
```
to
```html
@for (rackedModule of row; track rackedModule.rackingData.id ?? ('unracked-' + i); let i = $index)
```

**S2 — Add `refreshModulesFromBackend$` to `RackDetailDataService`**  
Declare: `readonly refreshModulesFromBackend$ = new Subject<void>();`

Wire in constructor:
```ts
this.refreshModulesFromBackend$.pipe(
  withLatestFrom(this.singleRackData$),
  filter(([_, rack]) => !!rack),
  switchMap(([_, rack]) =>
    this.backend.get.rackedModules(rack.id).pipe(
      catchError(err => {
        console.error('Failed to refresh rack modules:', err);
        return EMPTY;
      })
    )
  ),
  withLatestFrom(this.rowedRackedModules$, this.singleRackData$),
  takeUntil(this.destroy$)
).subscribe(([freshModules, currentRows, rack]) => {
  this.rowedRackedModules$.next(
    mergeRefreshedModules(currentRows, freshModules, rack)
  );
});
```

**S3 — Decouple `singleRackData$` from module reload**  
Add private: `private readonly loadModulesFor$ = new Subject<number>();`

Replace the existing `this.singleRackData$.pipe(filter(x => !!x), switchMap(rack => this.backend.get.rackedModules(rack.id)...))` pipeline with one driven by `loadModulesFor$`:
```ts
this.loadModulesFor$.pipe(
  switchMap(rackId => this.backend.get.rackedModules(rackId).pipe(
    map(rackedModules => ({ rackedModules, rackId })),
    catchError(err => { ... return EMPTY; })
  )),
  withLatestFrom(this.singleRackData$),
  takeUntil(this.destroy$)
).subscribe(([{ rackedModules, rackId }, rack]) => {
  const rowedRackedModules = buildRowedModulesArray(rackedModules, rack);
  this.rowedRackedModules$.next(rowedRackedModules);
  this.isRackDataLoading$.next(false);
});
```

In the `updateSingleRackData$` subscribe callback (after `singleRackData$.next(x.data)`), add `this.loadModulesFor$.next(x.data.id)`.

In the `updateSingleRackByPublicId$` subscribe callback, same: after `singleRackData$.next(x.data)`, add `this.loadModulesFor$.next(x.data.id)`.

Remove the old `singleRackData$.pipe(filter(x=>!!x), switchMap(rack => backend.get.rackedModules...))` block entirely.

**S4 — Fix `requestRackedModuleRemoval$` subscribe**  
Remove `this.singleRackData$.next(rackData)` from the `.subscribe()` callback. Local removal already happened in `switchMap`.

**S5 — Fix `requestRackedModuleRowClearing$` subscribe**  
Remove `this.singleRackData$.next(rackData)` from the `.subscribe()` callback. Ensure `rowedRackedModules$.next(rackModules)` is called before `forkJoin(...)` (optimistic update already done in the `switchMap` — verify the `rackModules` local var is the mutated clone, then emit).

**S6 — Fix `requestAddNewRow$`**  
Replace `this.updateSingleRackData$.next(this.singleRackData$.value.id)` with:
```ts
const updatedRack = { ...this.singleRackData$.value, rows: this.singleRackData$.value.rows + 1 };
this.singleRackData$.next(updatedRack);
const currentRows = this.rowedRackedModules$.value ?? [];
this.rowedRackedModules$.next([...currentRows, []]);
this.analytics.capture('rack.row_added', { rack_id: updatedRack.id });
```

**S7 — Fix `requestRemoveRow$`**  
Replace `this.updateSingleRackData$.next(this.singleRackData$.value.id)` with:
```ts
const updatedRack = { ...this.singleRackData$.value, rows: this.singleRackData$.value.rows - 1 };
this.singleRackData$.next(updatedRack);
const currentRows = [...(this.rowedRackedModules$.value ?? [])];
currentRows.pop(); // last row is always the removed one (guard already verifies it's empty)
this.rowedRackedModules$.next(currentRows);
this.analytics.capture('rack.row_removed', { rack_id: updatedRack.id });
```

**S8 — Fix `addModuleToRack$` subscribe**  
Replace `this.updateSingleRackData$.next(this.singleRackData$.value.id)` with `this.refreshModulesFromBackend$.next()`.

**S9 — Fix `addBlankToRow$` subscribe**  
Replace `this.updateSingleRackData$.next(this.singleRackData$.value.id)` with `this.refreshModulesFromBackend$.next()`.

**S10 — Fix `requestRackedModuleReplaceWithBlank$` subscribe**  
Replace `this.updateSingleRackData$.next(this.singleRackData$.value.id)` with `this.refreshModulesFromBackend$.next()`.

**S11 — Fix `callBackendToUpdateModulesOfRack`**  
Change the `tap`:
```ts
tap(() => {
  if (isAnyModuleWithoutRackingId(rackModules)) {
    this.refreshModulesFromBackend$.next(); // was: this.singleRackData$.next(rack)
  }
})
```

---

### Layer 2 — Structural

**S12 — Add `mergeRefreshedModules` to `rack-detail-data.utils.ts`**

Signature:
```ts
export function mergeRefreshedModules(
  current: RackedModule[][] | null,
  fresh: RackedModule[],
  rack: RackMinimal
): RackedModule[][]
```

Logic:
1. Build `knownById = Map<number, RackedModule>` from `current.flatMap(r => r)` for items with a defined `id`.
2. Build the new `RackedModule[][]` using `buildRowedModulesArray(fresh, rack)`.
3. For each module in the new structure: if `rackingData.id` is in `knownById` and the data is unchanged (same `id`, `row`, `column`, `moduleid`), substitute the original object reference.
4. Return the merged structure.

**S13 — Unit tests in `rack-detail-data.utils.spec.ts`**

Test cases:
- Adding a new module: fresh list has 1 extra; existing references preserved; new item appended.
- Removing a module: fresh list has 1 fewer; surviving references preserved.
- Duplicated module gets ID assigned: module with `id === undefined` in `current` is matched by position to a concrete ID in `fresh`.
- Empty current (`null`): behaves like a full build.

**S14 — Regression check**

Run `pnpm test-headless --include="**/rack-detail-data*"` and `pnpm test-headless --include="**/rack-editor*"` to verify no existing tests break.

---

### Layer 3 — Polish

**S15 — Row-level move animation (`rack-visual-model.component.html` + `.scss`)** ✅ 16-06-2026
- Change outer `@for` track: `track rowId` (i.e. `$index`) so row elements survive swap.
- In `RackVisualModelComponent`, add `movingRowId$ = new BehaviorSubject<{id: number, dir: 'up'|'down'} | null>(null)`.  
- Subscribe to `rackDetailDataService.requestMoveRow$`; set `movingRowId$` with the row id and direction; clear it after 350 ms.
- In template: `[class.rackRow--movingUp]="(movingRowId$|async)?.id === rowId && (movingRowId$|async)?.dir === 'up'"` etc.
- In SCSS: `@keyframes rowSlideUp` / `rowSlideDown` with `translateY`.

**S16 — Suppress `[@enter]` delay for replace-with-blank result**  
- `RackVisualModelComponent` exposes `suppressEnterDelayIds = new Set<number>()`.
- After `requestRackedModuleReplaceWithBlank$` fires (subscribe or tap in component), add the target row+column to the set; clear after one animation cycle.
- Template: `[@enter]="{ value: '', params: { delay: suppressEnterDelayIds.has(rackedModule.rackingData.id) ? 0 : (i * 50)}}"`.

---

## Validation

1. Manual: add, remove, duplicate, replace-with-blank, add-blank, add row, remove row — no staggered flash on untouched modules.
2. Manual: drag/drop reorder still animates correctly (drag preview + drop reveal).
3. Unit: `pnpm test-headless --include="**/rack-detail-data*"` passes.
4. Lint: `pnpm lint` passes (no new layering violations).

---

## Decision log

- 2025-07-14 — `loadModulesFor$: Subject<number>` over boolean gate on `singleRackData$`: explicit subject keeps the pipeline linear and avoids hidden side-effects from flag timing.
- 2025-07-14 — `mergeRefreshedModules` preserves object references by stable `rackingData.id` so Angular's `track` function sees no change for untouched items; only genuinely new/removed items trigger DOM add/remove → enter/leave animations.
- 2025-07-14 — `backend.add.rackModule` has no `.select()` — we cannot skip the full re-fetch after add/blank/replace. `refreshModulesFromBackend$` + merge is the least-invasive approach without a backend schema change.
- 2025-07-14 — `requestAddNewRow$` / `requestRemoveRow$` assume the row to remove is the *last* one; the existing guard already enforces the row must be empty before deletion, so trimming the last element of `rowedRackedModules$` is safe for `requestRemoveRow$`. For `requestDeleteRow$` (the newer row-menu path), the handler already uses `splice(rowId, 1)` locally — no change needed.
- 2026-06-16 — S15 row move motion stays in `RackVisualModelComponent` as a transient observer of `requestMoveRow$`; it marks the source and target row shells for 350ms and leaves `RackDetailDataService` persistence/order handling untouched.
