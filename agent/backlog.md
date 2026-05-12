# Agent Backlog

## Completed this iteration

- [x] Define the linked-rack state contract, degraded-state rules, and acceptance scenarios for the active patch-builder feature.
- [x] Add nullable `patches.linked_rack_id` schema support plus patch model/backend read-write coverage.
- [x] Surface linked-rack status plus choose/change/clear controls for existing patch detail/editor owner flows.
- [x] Fix the public patches browser regression by keeping the shared listing query rollout-safe and restoring smoke coverage for loaded results.
- [x] Add optional linked-rack selection to patch creation while keeping unlinked patch creation and existing unlinked patches working unchanged.
- [x] Guard linked-rack create/edit writes so the missing live `linked_rack_id` column degrades to explicit unavailable messaging instead of a raw `PGRST204`.
- [x] Add a patch-editor operation mode selector with read-only linked-rack context below the editor.

## Ready next

- [ ] Add privacy-safe viewer handling for unavailable or inaccessible linked racks.
- [ ] Add rack-origin patch creation entry points that preselect the linked rack without changing collection-first editing.

## Deferred / external

- [ ] Apply the existing `patches.linked_rack_id` migration to the live Supabase environment before selected linked-rack persistence can be used in production.
- [ ] Propose modules from the linked rack below the patch editor as a later enhancement without changing collection-first editing.
- [ ] E2E dedicated-account rotation remains an external credentials task and is not part of the current linked-rack slice.
