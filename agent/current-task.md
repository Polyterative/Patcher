# Current Task

## Title
Unit spec for ManufacturerDetailComponent

## Source
AGENTS.md §1 step 4 — high-value cleanup: missing test.
Component at `src/app/features/manufacturer-detail/manufacturer-detail.component.ts` (151 lines, no spec).

## Goal
Cover the business logic in `ManufacturerDetailComponent` that is not exercised by the existing
`manufacturer-detail-data.service.spec.ts`: the `stats$` derived observable, the `logoUrl()` helper,
route id parsing, and SEO title update, so the component's own logic is regression-protected.

## Acceptance criteria
(See agent/acceptance-checklist.md)

## Affected files
- src/app/features/manufacturer-detail/manufacturer-detail.component.spec.ts (new)

## Out of scope
- Template rendering / DOM interactions
- JSON-LD DOM injection detail (cleanup tested via ngOnDestroy)
- ManufacturerDetailDataService internals (already covered by its own spec)

## Risk notes
Component uses SubManager; direct instantiation requires calling ngOnDestroy() after each test.
DOM helper imports (clearJsonLdScript, upsertJsonLdScript) operate on document — fine in Karma.
