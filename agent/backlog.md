# Agent Backlog

## Completed this iteration

- [x] Define the linked-rack state contract, degraded-state rules, and acceptance scenarios for the active patch-builder feature.
- [x] Add nullable `patches.linked_rack_id` schema support plus patch model/backend read-write coverage.

## Ready next

- [ ] Surface linked-rack choose/change/clear flows in patch create/edit/detail surfaces.
- [ ] Add privacy-safe viewer handling for unavailable or inaccessible linked racks.
- [ ] Add rack-origin patch creation entry points that preselect the linked rack without changing collection-first editing.

## Deferred / external

- [ ] E2E dedicated-account rotation remains an external credentials task and is not part of the current linked-rack slice.
