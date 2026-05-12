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
