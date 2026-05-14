# Current Task

## Title
Unit test coverage — rack-detail-data.service.ts

## Source
internaldocs/workflow/TODO.md — POLICY: Unit Test Coverage
Highest-yield uncovered file: `rack-detail-data.service.ts` (1007 lines, zero spec)

## Goal
Add a dedicated spec for `RackDetailDataService` covering initial state, rack data loading,
racked-module hydration, privacy/editable/row toggles, ownership tracking, module removal,
form name auto-sync, derived analysis streams, and the `bumpUpVersionInNameOfOfRack` branch logic.
DOM-heavy flows (image capture, rack deletion dialog, duplication dialog) are explicitly out of scope.

## Acceptance criteria
(See agent/acceptance-checklist.md)

## Affected files
- src/app/components/rack-parts/rack-detail-data.service.spec.ts (new)

## Out of scope
- `downloadRackImageToUserComputer$` — requires DOM ElementRef + domToJpeg
- `updateRackImagePreview$` — requires DOM ElementRef + storage upload
- `deleteRack$` / `duplicateRack$` / `requestCreatePatchFromRack$` — dialog-heavy; separate task
- `rackOrderChange$` drag-drop — CDK drag-drop interaction; separate task

## Risk notes
Heavy service; stub only the consumed backend namespaces. Use fakeAsync/tick for debounce.
