# Current Task

## Title
Unit Test Coverage — module-detail-data.service & rack-detail-data.service

## Source
`internaldocs/workflow/TODO.md` → INFRA → POLICY: Unit Test Coverage

## Goal
Expand spec coverage for `module-detail-data.service.ts` (328L, existing spec) and
`rack-detail-data.service.ts` (1008L, several existing specs). Add meaningful tests
using the TestBed + mocking pattern established in existing specs.

## On hold
Initial Render Flash investigation — paused by user request. Flash may have been resolved
already; will revisit on explicit request.

## Acceptance criteria (see acceptance-checklist.md)
- [ ] Review existing module-detail spec and identify gaps
- [ ] Add missing tests to module-detail-data.service.spec.ts
- [ ] Review existing rack-detail specs for meaningful gaps
- [ ] Add targeted tests to rack-detail specs
- [ ] `pnpm test-headless` green
- [ ] `pnpm build` green
