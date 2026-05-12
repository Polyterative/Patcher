# Agent Backlog

## Completed this iteration

- [x] Define the linked-rack state contract, degraded-state rules, and acceptance scenarios for the active patch-builder feature.
- [x] Add nullable `patches.linked_rack_id` schema support plus patch model/backend read-write coverage.
- [x] Surface linked-rack status plus choose/change/clear controls for existing patch detail/editor owner flows.

## Ready next

- [ ] Add linked-rack selection to patch creation so new patches can start linked or unlinked.
- [ ] Add privacy-safe viewer handling for unavailable or inaccessible linked racks.
- [ ] Add rack-origin patch creation entry points that preselect the linked rack without changing collection-first editing.

## Deferred / external

- [ ] E2E dedicated-account rotation remains an external credentials task and is not part of the current linked-rack slice.
