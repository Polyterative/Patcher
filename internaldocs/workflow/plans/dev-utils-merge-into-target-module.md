<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# Dev utils — "Merge into target module" action

## Status

- Priority: **LOW**
- Section: INFRA (independent; pick any time a product task is blocked)
- Product area: Module browser → module detail → Dev utils
- Backlog state: open, awaiting `coordinator-loop` pickup
- Touches production code: yes (dev-only surface gated by `appState.isDev || dataService.isAdmin$`)
- Touches schema/RLS: no

## User intent

Productize the manual duplicate-module merge workflow (currently a maintainer-only Supabase script flow,
documented in `.github/skills/duplicate-module-merge/SKILL.md`) as a button inside the existing **Dev utils**
card on the module detail page (`/modules/details/:id`).

Concrete UX as described by the user:

> "I want to input an ID of the target module to keep and to merge the references to. I will be looking
> at the module to delete and then click delete in there providing the ID to the migration target.
> Then locally we should perform all of the changes without calling SQL directly."

So: viewing the **source** module (the duplicate to delete), the dev clicks a new dev-utils action,
enters the **target** module ID to merge references into, confirms, and the app moves all reference
rows (rack placements, ownership, etc.) from source → target via the existing `SupabaseService`
namespaces — not via hand-written SQL — and then deletes the source module.

## Product / roadmap fit

- This is a maintainer/data-quality tool, not a user-facing feature. It does not appear in
  `internaldocs/product/ROADMAP.md` and should not.
- Aligns with the "fewer duplicates, better catalog" data-quality theme that motivates the
  existing Dev utils block (`Delete module`, `Delete module + orphan manufacturer`,
  `Mark as complete`, etc.). It belongs next to those buttons.
- Keeps duplicate cleanup safely **inside the app**, not driven by ad-hoc Supabase SQL,
  reducing the chance of foot-guns documented in
  [`internaldocs/patterns/BACKEND_METHODS.md` §"Schema-change preflight"](../../patterns/BACKEND_METHODS.md#schema-change-preflight-read-before-writing-sql)
  (e.g. backfill UPDATEs accidentally wiping `updated` timestamps).
- Stays compatible with the longer-term direction of pushing schema-aware bulk operations
  behind typed backend methods (see AGENTS.md §5 "Reuse and backend access").

## Current system analysis

### Existing dev utils surface

`src/app/features/module-browser/module-browser-detail/module-browser-detail.component.html`
already renders a `Dev utils` `lib-hero-content-card` gated by:

```html
@if ((appState.isDev || (dataService.isAdmin$ | async)) && bag.data && bag.user && !bag.editing) { ... }
```

with buttons that all dispatch through `ModuleDetailDataService`
(`src/app/components/module-parts/module-detail-data.service.ts`):

- `deleteModule$ : Subject<number>` → `backend.delete.module(id)`
- `deleteModuleAndOrphanManufacturer$ : Subject<DbModule>` → `backend.delete.module` + conditional
  `backend.delete.manufacturer`
- `deleteLastPanel$`, `setDevStandard`, `setDevComplete`, approval toggles, etc.

The new merge action is the same shape: a dev-utils button that dispatches into a Subject on the
data service, which `exhaustMap`s into a new backend method.

### Backend layering today

- `src/app/features/backend/supabase-delete.ts` is where `delete.module(id)` lives. It already
  performs a small multi-step delete (`comments` → `modules`) inside a single Rx chain and busts
  the right cache keys (`modules`, `currentUserModules`, `modulePossessionCounts`,
  `moduleWithId`, `currentUserComments`).
- There is **no existing namespace for bulk update/move operations** that span multiple tables.
  The closest precedent is `delete.module` itself plus the various `update.*` methods.
- All tables that reference `modules.id` are catalogued in the duplicate-merge skill
  (`.github/skills/duplicate-module-merge/SKILL.md`). The same skill documents:
  - the safe order of operations,
  - the unique-constraint conflict cases (`user_modules` PK is `(moduleid, profileid)`,
    `module_tags` duplicates by `tagid`, `rack_modules` same `rackid`/`row`/`column`),
  - the dangerous tables (`module_ins` / `module_outs` cascade into `patch_connections`,
    `patch_module_instances.module_id` has `ON DELETE RESTRICT`).

The merge needs to be safe to drive from the client because all of these can already be
written to from authenticated admin sessions via the existing namespaces. The new code is
mainly orchestration + conflict-resolution, not new RLS.

### Gaps

- No table registration in `DatabaseStrings.ts` for several merge-relevant tables that the
  backend service doesn't currently address from the client (e.g. `comments_duplicate`,
  `module_flags`, `patches_for_modules`). These need to be audited against the
  `delete.module(id)` flow first — many cascade automatically via FK, and the existing
  cascade behaviour should be preferred over manual deletes whenever possible.
- No typed `merge.moduleInto(source, target)` method.
- No UI for free-form numeric ID input inside the dev-utils card — current buttons are all
  zero-arg or `module`-bound. A small inline form is needed (input + confirm + cancel).

## Future strategy

- Keep the action **dev-only**, gated identically to existing dev utils
  (`appState.isDev || isAdmin`).
- Do **not** expose this to end users; do not surface it in the regular owned-modules
  manager. It is a maintainer tool.
- All writes go through `SupabaseService` namespaces. **No raw SQL strings, no Supabase
  RPCs added in this slice, no client-side `supabase.from(...).rpc(...)` shortcuts that
  bypass the data-service contract.**
- Reuse the existing conflict-handling order from the duplicate-merge skill verbatim — that
  ordering has already been exercised against real production data.
- When a future need appears for atomicity (e.g. partial failure of the multi-step merge
  leaving inconsistent state), promote the orchestration to a Postgres function and a typed
  RPC. That is **out of scope** here and explicitly belongs to a follow-up plan.

## Goals

1. From the module detail page of any module (acting as the **source**), an admin/dev can:
   - click a new "Merge into target module…" dev-utils action,
   - enter a target module ID,
   - see basic validation (target ID is numeric, exists, is not the same as source, target
     and source share manufacturer or the user explicitly overrides),
   - confirm, and have references migrated and the source module deleted in one Rx flow,
   - get a snackbar telling them what moved and what was removed,
   - be redirected to the target module's detail page.
2. Migration is performed only via `SupabaseService` namespaces, with the same cache-busting
   keys as `delete.module(id)` plus any keys for tables touched by the move.
3. The flow is feature-flag-free but gated by `appState.isDev || dataService.isAdmin$` at
   the UI layer.

## Non-goals

- A full admin-panel "duplicate finder" UI. The dev enters the target ID by hand, just as
  described by the user.
- Server-side transactional atomicity (Postgres RPC). Document the risk, accept best-effort
  client-side sequencing for this slice.
- Patch-port remapping (`module_ins` / `module_outs` → `patch_connections`). If the source
  module has any rows in `module_ins`, `module_outs`, or `patch_module_instances`, the
  merge **aborts before any writes** with a clear error pointing at the manual skill flow.
- End-user duplicate reporting. Out of scope.
- Schema changes, new RPCs, RLS edits.

## Assumptions

- Admins (`dataService.isAdmin$ === true`) already have write/delete privileges over the
  relevant tables via existing RLS — the manual skill workflow confirms this in practice.
- Dev-mode (`appState.isDev`) developers run against local/dev data where they have the
  needed privileges; the same UI gate is sufficient.
- The duplicate-merge skill's `user_modules` + `rack_modules` move pattern covers the
  common case. Less common reference tables either cascade on module delete or have no
  meaningful references for typical duplicates.

## Dependencies and sequencing

- Soft dependency on the existing dev-utils UI and `ModuleDetailDataService` — no
  refactor required.
- No dependency on other open backlog items.
- Recommended sequencing inside the slice:
  1. Audit which reference tables `delete.module(id)` already cleans (directly or via FK
     cascade) — document in the plan's Decision log.
  2. Add `SupabaseService.merge.moduleInto(sourceId, targetId)` covering only the tables
     the audit shows need explicit move (initial candidates: `rack_modules`,
     `user_modules`, `module_tags`; everything else either cascades or aborts).
  3. Wire the data-service Subject + backend method.
  4. Add the dev-utils UI: inline form, confirm dialog, snackbar, redirect.
  5. Add unit tests around the data-service orchestration with a mocked `SupabaseService`.

## MVP layer

- `SupabaseService.merge.moduleInto(sourceId: number, targetId: number)` returning an
  `Observable<MergeModuleResult>` where the result reports per-table moved/removed counts.
- Inside the orchestration, mirror the skill's safe order:
  1. Fetch both modules; abort if either is missing or `sourceId === targetId`.
  2. Abort if source has any rows in `module_ins`, `module_outs`, or
     `patch_module_instances`.
  3. Remove `user_modules` rows on source that conflict with target by `profileid`
     (same-profile duplicate ownership).
  4. Remove `module_tags` rows on source that conflict with target by `tagid`.
  5. Move remaining `user_modules`, `module_tags`, `rack_modules` rows from source to
     target via UPDATEs.
  6. Call `delete.module(sourceId)` to reuse the existing comments+module delete flow
     and cache busting.
- `ModuleDetailDataService` gets `mergeIntoTargetModule$: Subject<{ sourceId: number;
  targetId: number }>` wired with `exhaustMap` and the same `catchErrors` + analytics
  pattern as `deleteModule$`.
- Component:
  - new button "Merge into target module…" inside the existing dev-utils
    `lib-hero-content-card`,
  - reveals an inline form (input + Confirm + Cancel) using
    `BehaviorSubject<boolean>` for visibility (per `internaldocs/patterns/UI_PATTERNS.md`),
  - on confirm, dispatch into `mergeIntoTargetModule$`,
  - on success, snackbar with the result counts and `router.navigate` to the target.

## Structural layer

- Generalize `MergeModuleResult` so additional reference tables (e.g.
  `comments_duplicate`, `module_flags`, `patches_for_modules`) can be added later by
  extending the orchestration without touching the UI.
- Add a guard that compares source vs target manufacturer/name and surfaces a warning in
  the confirm dialog when they diverge (manufacturer mismatch is a strong "are you sure"
  signal for duplicate merges).

## Polish layer

- Replace the inline form with a small custom dialog that shows a side-by-side preview of
  source vs target (name, manufacturer, HP, panel count, owner count, rack-placement
  count) before confirmation. Reuse existing `app-module-minimal` for the preview.
- After the merge, briefly highlight the moved counts on the target module page.
- Telemetry: `analytics.capture('module.merged', { source_id, target_id, ... counts })`.

## File / surface map

- UI:
  - `src/app/features/module-browser/module-browser-detail/module-browser-detail.component.html` — add button + inline form inside the existing `Dev utils` `lib-hero-content-card`.
  - `src/app/features/module-browser/module-browser-detail/module-browser-detail.component.ts` — wire form state, dispatch into data service, handle redirect on success.
  - `src/app/features/module-browser/module-browser-detail/module-browser-detail.component.spec.ts` — extend dev-utils visibility tests to cover the new control.
- Data service:
  - `src/app/components/module-parts/module-detail-data.service.ts` — add `mergeIntoTargetModule$` Subject and Rx wiring.
- Backend service:
  - `src/app/features/backend/supabase.service.ts` (or a new sibling file in `src/app/features/backend/` following the existing split pattern, e.g. `supabase-merge.ts`) — add `merge.moduleInto`.
  - `src/app/features/backend/DatabaseStrings.ts` — confirm all touched tables are registered; add only what is missing.
- Skill / doc:
  - `.github/skills/duplicate-module-merge/SKILL.md` — add a short "See also: dev-utils action" pointer once implemented.

## Acceptance criteria

- [ ] Acting on `/modules/details/<source>`, an admin sees a "Merge into target module…" button only when the existing dev-utils gate is true.
- [ ] Clicking it reveals an inline numeric input + Confirm + Cancel.
- [ ] Entering an invalid ID (non-numeric, same as source, non-existent module) shows an inline error and does not write.
- [ ] On confirm, the source's `rack_modules`, `user_modules`, and `module_tags` references are merged into the target with conflict pre-removal as in the skill.
- [ ] The source module is deleted via the existing `delete.module(id)` path.
- [ ] All relevant cache keys are busted (at minimum the keys already busted by `delete.module`).
- [ ] A snackbar reports per-table moved/removed counts.
- [ ] The router navigates the dev to `/modules/details/<target>` after success.
- [ ] If the source has any `module_ins`, `module_outs`, or `patch_module_instances` rows, the operation aborts before any writes and explains why.
- [ ] No raw SQL strings or `supabase.rpc(...)` calls are added outside `SupabaseService`.
- [ ] Existing dev-utils spec coverage continues to pass.

## Validation strategy

- `pnpm lint` — must pass (layering check covers `Component → Data Service → API Service → Supabase`).
- `pnpm test-headless --include="**/module-browser-detail.component.spec.ts"` — extend with cases for:
  - merge control hidden for non-admin non-dev users,
  - merge control visible for admin,
  - confirm dispatches into `mergeIntoTargetModule$` with the right payload,
  - cancel does not dispatch.
- `pnpm test-headless --include="**/module-detail-data.service.spec.ts"` (or add the file if missing) — orchestration tests with a mocked `SupabaseService` covering: happy path, abort on patch ports / instances, conflict pre-removal.
- Manual smoke against local dev data using a freshly created duplicate module — verify the snackbar counts match the skill's count query.
- `node scripts/checks/check-docs.cjs` for this plan file.

## Risks and open questions

- **Atomicity:** without a Postgres function, a failure between the conflict-removal step and the final delete can leave the source partially merged. Mitigation: order operations so partial state is still safe to retry (idempotent UPDATEs, conflict-removal repeated on retry). Promotion to RPC is a separate plan.
- **Hidden FK references:** the skill's FK-discovery query lists more tables than the MVP will cover explicitly. Open question: does the dev want the MVP to abort on any non-MVP reference rows (safest), or to attempt the merge and let cascades handle the rest?
- **Cache invalidation completeness:** writes touch `rack_modules`, `user_modules`, `module_tags`. Open question: which cache keys, beyond those `delete.module` already busts, must also be busted (`rackById`, `currentUserModules` for the affected profile, tag caches, etc.)? Resolve during implementation by auditing existing call sites of these tables.
- **RLS:** admin RLS is assumed; if a non-admin dev runs in `appState.isDev` mode against production-shape data, some writes may silently fail. Mitigation: surface backend errors in the snackbar verbatim.
- **Patch-port modules:** explicitly out of scope here. Future plan if needed: a separate connector-remapping flow.

## Coordinator-loop handoff

- Eligible for `coordinator-loop` pickup as a single feature slice.
- Suggested implementer model: `gpt-5.5` (codebase-heavy, layered Rx work).
- Suggested reviewer model: `claude-opus-4.7` (data-correctness + product framing).
- Before kickoff, the implementer **must** re-read `.github/skills/duplicate-module-merge/SKILL.md` and `internaldocs/patterns/BACKEND_METHODS.md` §"Schema-change preflight".
- Do not touch RLS, Postgres functions, or migrations in this slice — promote to a follow-up plan if needed.

## Decision log

- 2026-06-18 — Plan created from a user intake to productize the duplicate-module merge that has previously been performed manually via the skill workflow. Priority set to LOW per explicit user instruction. (`feature-notetaker`)
