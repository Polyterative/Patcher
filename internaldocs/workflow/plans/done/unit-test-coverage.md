<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### POLICY: Unit Test Coverage

**Status:** ARCHIVED — historical snapshot; the completed coverage batches are summarized in `../COMPLETED.md`.

Target: statements and lines ≥ 75% (baseline 03-02: ~57%).
Not a blocking task — coverage rises naturally as new features ship with tests.

**2025-07-16 bulk pass completed (~1200+ tests added, ~145+ spec files created):**
All components, pipes, utils, services, constants, and helper files that can be tested with
direct instantiation (no Supabase/D3/canvas) now have spec coverage.

Remaining uncovered high-value files (complex dependencies):
- `user-management.service.ts` (599L, Supabase Auth-heavy)
- `graph.component.ts` (498L, D3/canvas)
- `patch-graph.component.ts` (297L, SupabaseService-dependent)

Previously listed as "remaining" but now fully covered by direct-instantiation specs:
- `rack-detail-data.service.ts` — 5 spec files, 40+ tests (helpers, reactive, media-duplicate, main)
- `module-detail-data.service.ts` — 1 spec file, 24 tests
- `user-area-data.service.ts` — 1 spec file, 24 tests

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
