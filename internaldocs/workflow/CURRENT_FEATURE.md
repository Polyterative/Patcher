# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut).
>    Future agents read this to avoid relitigating settled questions.

---

## Active

### Rack Editor — Granular Local Updates (no-reload animations)

**Plan file:** [`plans/rack-granular-updates.md`](./plans/rack-granular-updates.md)
**Goal:** All rack CRUD operations (add/remove/duplicate/replace module, add/remove/move row) mutate `rowedRackedModules$` in-place, eliminating full rack reloads and the staggered `[@enter]` re-animation they cause, while preserving intentional drag/drop and future row-move animations.

#### Layer 1 — MVP (stop the unintended animation)

- [ ] **S1** Fix `@for` track in `rack-visual-model.component.html`: change `track rackedModule` → `track rackedModule.rackingData.id ?? ('unracked-' + i)` so Angular preserves DOM elements across array emits.
- [ ] **S2** Add `refreshModulesFromBackend$: Subject<void>` to `RackDetailDataService` and wire it to a pipeline that fetches `backend.get.rackedModules(rackId)` and merges results into `rowedRackedModules$` using a **preserve-by-id** merge (keeps existing object references for known IDs; appends genuinely new entries; preserves `undefined`-id items by row+column position).
- [ ] **S3** Decouple `singleRackData$` from module reload. Introduce a private `loadModulesFor$: Subject<number>` (emits rack id). The current `singleRackData$.pipe(switchMap(rack => backend.get.rackedModules...))` pipeline becomes `loadModulesFor$.pipe(switchMap(id => backend.get.rackedModules(id)...))`. Only `updateSingleRackData$` and `updateSingleRackByPublicId$` subscribers emit to `loadModulesFor$` after the rack metadata arrives. All other callers of `singleRackData$.next(...)` no longer trigger a module reload.
- [ ] **S4** Fix `requestRackedModuleRemoval$` subscribe: remove the trailing `this.singleRackData$.next(rackData)` call (already does local removal correctly).
- [ ] **S5** Fix `requestRackedModuleRowClearing$` subscribe: remove the trailing `this.singleRackData$.next(rackData)` call; emit `rowedRackedModules$.next(rackModules)` explicitly before the backend calls complete (already done inside the pipe — verify it fires even on error path).
- [ ] **S6** Fix `requestAddNewRow$`: replace `updateSingleRackData$.next(id)` with a local update — increment `singleRackData$.value.rows`, emit `singleRackData$.next(updatedRack)`, and push an empty row to `rowedRackedModules$`.
- [ ] **S7** Fix `requestRemoveRow$`: replace `updateSingleRackData$.next(id)` with a local update — decrement `singleRackData$.value.rows`, emit `singleRackData$.next(updatedRack)`, and pop the last row from `rowedRackedModules$` (only if it is empty, consistent with existing guard).
- [ ] **S8** Fix `addModuleToRack$` subscribe: replace `updateSingleRackData$.next(...)` with `this.refreshModulesFromBackend$.next()`.
- [ ] **S9** Fix `addBlankToRow$` subscribe: replace `updateSingleRackData$.next(...)` with `this.refreshModulesFromBackend$.next()`.
- [ ] **S10** Fix `requestRackedModuleReplaceWithBlank$` subscribe: replace `updateSingleRackData$.next(...)` with `this.refreshModulesFromBackend$.next()`.
- [ ] **S11** Fix `callBackendToUpdateModulesOfRack` tap (used by duplication/sync): when `isAnyModuleWithoutRackingId` is true, replace `this.singleRackData$.next(rack)` with `this.refreshModulesFromBackend$.next()` so new IDs are backfilled without a full visual reload.

#### Layer 2 — Structural

- [ ] **S12** Extract `mergeRefreshedModules(current: RackedModule[][], fresh: RackedModule[], rack: RackMinimal): RackedModule[][]` into `rack-detail-data.utils.ts`. Rules: match by `rackingData.id` first (preserve reference); for items with `id === undefined` match by `row + column`; append genuinely new entries; drop removed entries.
- [ ] **S13** Add unit tests for `mergeRefreshedModules` in `rack-detail-data.utils.spec.ts` (or create that file) covering: add, remove, update-id-on-duplicate, preserve-reference for unchanged.
- [ ] **S14** Verify existing `rack-detail-data.service.spec.ts` and `rack-editor.component.spec.ts` still pass with `pnpm test-headless`.

#### Layer 3 — Polish

- [ ] **S15** Row-level animation: change `@for (row of rowedRackedModules; track row)` → `track rowId` (the `$index`) so row DOM nodes survive reorder; when `requestMoveRow$` fires, add a CSS class pair (`row--moving-up` / `row--moving-down`) via a transient `BehaviorSubject<number | null>` in the component and animate via `@keyframes` in SCSS. Remove class after `transitionend`.
- [ ] **S16** Suppress `[@enter]` delay (`delay: 0`) for modules that survive a replace/blank-insert — pass through a new `[suppressEnterDelay]` input on `app-module-realistic`, driven by a transient `Set<rackingDataId>` in the visual model component that's cleared after one animation cycle.

#### Decision log

- 2025-07-14 — Chose `loadModulesFor$: Subject<number>` (S3) over a boolean gate on `singleRackData$` because a flag would require careful reset logic and could silently swallow legitimate reload requests; a dedicated subject makes the intent explicit and the pipeline linear.
- 2025-07-14 — `refreshModulesFromBackend$` (S2) uses a merge rather than a raw replace so existing object references are preserved, preventing Angular from destroying+recreating DOM elements that didn't change. This is the key mechanism that blocks staggered `[@enter]` for untouched modules.
- 2025-07-14 — `add.rackModule` returns no full module data (no `.select(...)` clause); a targeted single-row backend fetch is not available without a schema change. Using `refreshModulesFromBackend$` (full re-fetch + merge) is preferred over adding a new RPC for now.
- 2025-07-14 — Row move animation (S15) is deferred to Layer 3 since rows don't yet carry a stable identity key; using `$index` as track preserves DOM but requires CSS-class-based animation rather than Angular Animations state transitions.

---

## Empty template

```markdown
### Feature Name

**Plan file:** [`plans/<slug>.md`](./plans/<slug>.md)
**Goal:** one sentence.

#### Layer 1 — MVP
- [ ] step

#### Layer 2 — Structural
- [ ] step

#### Layer 3 — Polish
- [ ] step

#### Decision log
- YYYY-MM-DD — chose X over Y because Z.
```
