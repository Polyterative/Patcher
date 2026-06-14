# Decision Log

## 14-06-2026 13:00

- **Module collection SEO polish:** Selected `CURRENT_FEATURE.md` Layer 3 SEO/share metadata as the next unblocked frontend-only slice. Reused the existing detail-page SEO pattern from rack detail and public profile instead of adding a new metadata service or UI. Kept analytics separate because `ModuleCollectionsDetailDataService` already captures `module_collection.viewed`, while the remaining docs item asks for creation/discovery analytics as a distinct follow-up.
- **Module collection analytics polish:** Reused `AnalyticsService` and the module browser/home discovery event shapes. Chose not to send raw collection search text because searches are user-entered; events use search length/active flags plus order/count metadata instead.
- **Rack editor optimistic add slice:** Chose bottom-picker add plus blank quick-add as the bounded next step. Existing delete/reorder/row paths already prove the rollback pattern; add paths need generated id reconciliation, so this slice will reuse `applyPersistedRackingIds` instead of adding a second id-mapping helper.
- **Rack editor optimistic add implementation:** Kept the solution inside `RackDetailDataService` and `rowedRackedModules$` rather than creating UI-level state. Bottom-picker adds use an optimistic unracked row, quick-add blanks fetch the existing blank module data before local insertion, and both paths patch generated ids through `applyPersistedRackingIds` or remove only the optimistic object on failure.
- **Rack editor full-reload audit:** Treated duplicate-rack hydration as an intentional route handoff instead of same-rack reload debt. The remaining same-rack opportunity was panel switching, which already updated local state but did not roll back on failed persistence; fixed it by restoring the prior `selectedPanelId`.

## 17-05-2026

- **Load More for public profile tabs:** Followed the established `PatchBrowserDataService` accumulation pattern exactly (skip===0 → replace, skip>0 → append, loading state only on fresh load). Considered keeping `MatPaginator` for simplicity but rejected it — it's inconsistent with every other list view in the app since `25240a44` and `c874817a`. No new pattern introduced. `MatPaginatorModule` removed from the feature module entirely; replaced with `MatButtonModule` which was already present elsewhere.

## 2026-05-12T11:16:04+02:00

- Bootstrapped the missing `agent/` control files instead of blocking on their absence, because the iterative loop needs durable in-repo state.
- Chose the smallest safe linked-rack task first: define the state contract before changing schema or UI.
- Kept the linked-rack definitions aligned with the existing product rules: collection-first editing stays canonical, and unavailable racks must degrade without mutating patch instances or leaking private rack data.
- Next implementation slice is the nullable schema/backend association for `patches.linked_rack_id`.

## 2026-05-12T11:24:00+02:00

- Added a forward-only migration for nullable `patches.linked_rack_id` with `ON DELETE SET NULL` and an index for later lookups.
- Extended patch types plus add/query plumbing so the new field can round-trip without changing existing no-rack behavior.
- Added focused backend coverage for add/update/detail handling of `linked_rack_id`.
- Updated `database.types.ts` in-repo to match the migration-backed schema contract so app code can compile against the new field before a separate live-schema apply/type-regeneration step.
- Next bounded task is the owner-facing choose/change/clear UI slice.

## 2026-05-12T11:41:00+02:00

- Added owner-only linked-rack status UI to the patch detail shell and linked-rack choose/change/clear controls to patch edit metadata.
- Kept the linked-rack edit path metadata-only: changing or clearing the link updates `linked_rack_id` without forcing a patch-detail reload that would disturb local connection state.
- Reused `get.currentUserRacks()` instead of widening the backend API surface.
- Added focused service/component coverage and updated the authenticated patch-detail screenshot spec to capture the linked-rack edit shell.
- Next bounded task is patch creation support for optional linked-rack selection.

## 2026-05-12T11:57:44+02:00

- Fixed the patches browser regression by removing `linked_rack_id` from the default public `getPatches()` select, so public listing surfaces do not depend on the linked-rack schema rollout.
- Added a focused backend regression assertion that the public patch listing query stays free of `linked_rack_id`.
- Tightened the patch-browser smoke test to target actual patch-list items and the paginator range label instead of generic page-wide selectors.
- Validated the fix with the focused backend spec, a production build, and the patch-browser Playwright smoke suite.
- Remaining linked-rack work stays scoped to patch creation, viewer-facing unavailable/privacy handling, and the later linked-rack module-proposal enhancement.

## 2026-05-12T12:17:17+02:00

- Added optional linked-rack UI to patch creation, loading the current user's racks into a select and keeping the create flow text explicit that rack context is optional.
- Kept patch creation rollout-safe by omitting `linked_rack_id` from patch inserts unless the user explicitly selected a rack, so unlinked patch creation and all existing unlinked patches keep working.
- Added focused creator/backend coverage for linked and unlinked creation payloads, and extended the authenticated patch-creation E2E to assert the linked-rack field and complete the create flow via the returned patch id.
- Recorded the live Supabase migration apply as an external rollout dependency before selected linked-rack persistence can be used in production.
- Next bounded task is privacy-safe viewer handling for unavailable or inaccessible linked racks.

## 2026-05-12T12:36:00+02:00

- Normalized patch add/update Supabase `{ error }` responses into real observable errors so linked-rack UI flows can handle the pending schema rollout explicitly instead of treating `PGRST204` as success.
- Added rollout-safe linked-rack fallback copy and disabled-state handling in both patch detail editing and linked-rack-selected patch creation, so users can keep working unlinked while the live migration is still pending.
- Kept the external migration blocker in place: the repo now degrades gracefully, but actual linked-rack persistence still requires the live `patches.linked_rack_id` column.
- Validated the guarded write path with focused backend, patch-detail, patch-creator, and patch-minimal specs plus a production build.
- Next bounded task is the requested patch-editor operation mode selector with linked-rack context preview.

## 2026-05-12T12:44:00+02:00

- Added a patch-editor operation mode selector modeled on the rack editor button-group pattern, keeping collection-first editing as the default and rendering linked-rack context as a separate read-only section below the editor.
- Loaded linked-rack preview data from the existing rack detail/racked-modules reads instead of introducing new backend APIs, and kept the preview informational only so it never mutates patch instances or connection state.
- Added focused patch-editor coverage for the new operation-mode options and row-grouped linked-rack preview shaping.
- Validation stayed at focused unit/build coverage because the shared live environment still cannot persist a linked patch until the external schema migration lands, which blocks a stable visible end-to-end assertion for linked-rack mode.
- Next bounded task is privacy-safe viewer handling for unavailable or inaccessible linked racks.

## 16-05-2026 10:11

- Fixed 1U module placeholder aspect ratio bug by removing `[fxFlex]` from the placeholder `<div>`
  inside `module-part-image.component.html` and replacing it with an explicit `[ngStyle]` binding
  for both `width` and `height`.
- `fxFlex` sets `flex-basis` along the parent flex main axis, which is not always horizontal;
  using explicit CSS properties is immune to flex-direction, so the fix is correct across all
  host layouts without requiring any parent-component changes.
- `fixedHeight=true` path kept as-is: the existing `.preview--fixed-height` CSS class already
  enforces `width: 100%; height: 8rem !important;` — no inline override needed.
- Discarded alternatives: (a) forcing `flex-direction: row` on `lib-screen-wrapper` — would be
  a broader change with potential layout side-effects; (b) removing `lib-screen-wrapper` — not
  needed; the wrapper is not the root cause.
