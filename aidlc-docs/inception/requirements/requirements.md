# Requirements

## Intent Analysis
- **User request**: Continue AI-DLC using documentation-folder context
- **Scope choice**: Active feature in `internaldocs/workflow/CURRENT_FEATURE.md`
- **Feature**: Rack Editor — Granular Local Updates (no-reload animations)
- **Project type**: Brownfield

## Functional Requirements
- Rack CRUD operations must update `rowedRackedModules$` in-place when possible.
- Stable DOM identity must be preserved for unchanged modules during rack updates.
- Full rack metadata updates must not automatically force a full module reload.
- Adding, removing, duplicating, replacing, or blanking rack modules must keep unaffected rows/modules visible without staggered re-entry.
- Adding and removing rows must update local state immediately.
- Refreshes from the backend must merge new module data without discarding unchanged object references.
- Duplicate/sync flows must backfill missing rack module IDs without a full visual reload.

## Non-Functional Requirements
- UI updates must avoid full-reload flash and minimize unnecessary DOM destruction.
- Existing drag/drop behavior must remain intact.
- Future row-move animation work must remain possible.
- Implementation should preserve compatibility with current rack metadata and module loading behavior.
- Tests should cover merge behavior and no-regression paths for rack editor updates.

## Scope Notes
- This work applies to the active rack editor update flow only.
- The feature is focused on local-state preservation and refresh merge behavior, not new rack features.
- Row identity remains index-based for now; row animation is deferred to later polish work.

## Success Criteria
- Unchanged modules keep their DOM nodes across rack mutations.
- Rack updates no longer trigger staggered `[@enter]` animations for untouched modules.
- Backend refreshes preserve existing references where possible.
- Existing rack editor tests continue to pass after the change.
