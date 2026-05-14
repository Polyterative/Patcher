# Current Task

**Active task:** Unit Test Coverage — High-Yield Data Services

**Source:** `internaldocs/workflow/TODO.md` — POLICY: Unit Test Coverage

**Goal:** Add focused unit tests for the three highest-yield uncovered data services — `rack-detail-data.service.ts`, `module-detail-data.service.ts`, and `user-area-data.service.ts` — to push statement/line coverage toward the 75% target and protect already-implemented logic from regressions.

**Acceptance criteria:** see `agent/acceptance-checklist.md`

**Affected files:**
- `src/app/components/rack-parts/rack-detail-data.service.ts` (1007 lines) — new spec for uncovered methods
- `src/app/components/module-parts/module-detail-data.service.ts` — new/extended spec
- `src/app/features/routes/user-area/user-area-data.service.ts` (419 lines) — extend existing spec

**Out of scope:**
- Backend changes of any kind
- Changing production code; only add/extend test files
- Full coverage to 100% — targeted gaps only

**Risk:** Low; test-only change
