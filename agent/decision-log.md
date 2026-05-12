# Decision Log

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
