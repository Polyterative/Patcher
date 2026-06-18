# Module Possession Trend Charts — Schema Approval Follow-up

## Problem

Static module possession counts are now public-safe, but trend charts require historical aggregate data that does not exist yet.

## Goals

- Decide whether daily aggregate snapshots are the right historical data model.
- Get explicit human approval before any Supabase schema, migration, scheduled function, RLS, or generated-type work.
- After approval, render a lightweight collapsed trend surface on module detail pages.

## Assumptions

- Option B from the completed static-count plan remains preferred: daily aggregate snapshots avoid per-user event history.
- Agents may inspect and draft proposals, but must not apply migrations/RLS/policies without explicit approval.

## MVP / Structural / Polish layers

### MVP

- [ ] Confirm product owner wants trend charts now.
- [ ] Draft the proposed `module_possession_snapshots` schema and scheduled snapshot strategy.
- [ ] Request explicit approval before applying any database changes.

### Structural

- [ ] After approval, read the schema-change preflight in `internaldocs/patterns/BACKEND_METHODS.md`.
- [ ] Apply approved migration/RLS/scheduled-function changes.
- [ ] Run `pnpm updateBackendTypes`.
- [ ] Add `SupabaseService` read methods and cache keys for trend snapshots.

### Polish

- [ ] Add a collapsed trend chart/toggle on module details.
- [ ] Hide weak-signal or sparse chart data rather than showing fake precision.
- [ ] Validate responsive visual treatment with the UI debug screenshot workflow.

## File-level checklist

- [ ] `internaldocs/patterns/BACKEND_METHODS.md` — read schema-change preflight before SQL.
- [ ] Supabase migration/RLS/scheduled function — approval required before changes.
- [ ] `src/backend/database.types.ts` — refresh only after approved schema work.
- [ ] `src/app/features/backend/DatabaseStrings.ts` / `supabase-queries.ts` — add approved read path.
- [ ] Module detail UI/specs — render approved trend surface.

## Acceptance criteria

- No autonomous schema/RLS/migration work happens before explicit human approval.
- Approved trend data is aggregate-only and does not expose per-user history.
- Trend charts are hidden or collapsed by default and do not overwhelm module details.

## Validation strategy

- Approved schema work: `pnpm updateBackendTypes`.
- Targeted module detail/backend tests.
- `node scripts/checks/check-docs.cjs`.
- `pnpm lint`.

## Decision log

- 2026-06-18T10:40+02:00 — Split from the completed static-count loop because historical trend snapshots require explicit schema/migration approval.
