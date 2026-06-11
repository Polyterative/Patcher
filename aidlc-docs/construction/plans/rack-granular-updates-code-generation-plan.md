# Rack Editor — Granular Local Updates Code Generation Plan

## Context

- **Feature**: Rack Editor — Granular Local Updates (no-reload animations)
- **Source plan**: `internaldocs/workflow/plans/rack-granular-updates.md`
- **Requirements**: `aidlc-docs/inception/requirements/requirements.md`
- **Execution plan**: `aidlc-docs/inception/plans/execution-plan.md`
- **Status**: Complete; implementation verified with rack-focused specs

## Step 1 — Update rack tracking

- Modify `src/app/components/rack-parts/rack-editor/rack-visual-model/rack-visual-model.component.html`
- Change the rack item tracker to use stable `rackingData.id` with an unracked fallback

## Step 2 — Add backend refresh merging

- Modify `src/app/components/rack-parts/rack-detail-data.service.ts`
- Add a refresh subject for backend module reloads
- Merge fresh rack module data into existing rows without replacing preserved references

## Step 3 — Decouple metadata reloads

- Modify `src/app/components/rack-parts/rack-detail-data.service.ts`
- Route rack metadata updates through a dedicated module-load subject
- Ensure only metadata refresh completion triggers the first module load

## Step 4 — Remove redundant reload triggers

- Modify `src/app/components/rack-parts/rack-detail-data.service.ts`
- Remove unnecessary `singleRackData$.next(...)` reload loops from removal and row-clear flows

## Step 5 — Keep row updates local

- Modify `src/app/components/rack-parts/rack-detail-data.service.ts`
- Update add-row and remove-row handlers to mutate local state first

## Step 6 — Refresh after add/blank/replace flows

- Modify `src/app/components/rack-parts/rack-detail-data.service.ts`
- Replace metadata-driven reloads with backend refresh requests for add-module, add-blank, and replace-with-blank flows

## Step 7 — Backfill missing rack IDs

- Modify `src/app/components/rack-parts/rack-detail-data.service.ts`
- Refresh modules after duplication/sync detects missing rack IDs

## Step 8 — Extract merge helper

- Add `src/app/components/rack-parts/rack-detail-data.utils.ts`
- Extract `mergeRefreshedModules()` for stable reference preservation

## Step 9 — Add merge tests

- Add `src/app/components/rack-parts/rack-detail-data.utils.spec.ts`
- Cover add, remove, duplicate-ID backfill, and unchanged reference preservation

## Step 10 — Verify no regressions

- Run existing rack-detail-data and rack-editor test coverage
- Confirm rack editor behavior remains stable across the targeted flows

## Approval gate

- Do not modify application code until this plan is approved