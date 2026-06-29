# Module I/O — Bidirectional and Passive Port Support

## Problem

The current I/O model treats every port as either an **input** or an **output**.
This is insufficient for real-world Eurorack modules where ports can be:

- **Bidirectional** — e.g. CV I/O jacks that act as input or output depending on
  context (patch cables plugged in either direction), clock I/O, or expander
  communication buses.
- **Passive / utility** — e.g. mults (passive multiples), attenuators, and utility
  panels that have no fixed signal direction.

Right now these ports are either omitted from data or mis-classified, causing
inaccurate patch-connection suggestions and analytics.

## Goal

Extend the port / I/O data model and UI to support separate
`bidirectional` and `passive` port directions without breaking existing
input/output logic.

## Status

- [~] Product-owner direction decision recorded and local-only additive schema
  proposal drafted.
- Blocked before backend/model implementation: proposal review and explicit
  approval are required before backend type generation, RLS/GRANT work, remote
  Supabase application, or behavior changes.

## Current system analysis

- Module ports are currently stored in separate `module_ins` and
  `module_outs` tables, not in a single table with a `direction` column.
- Angular models expose the same split as `DbModule.ins` and `DbModule.outs`.
- The module editor persists the two lists through
  `backend.update.moduleINsOUTs(moduleId, ins, outs)`, backed by helper
  insert/update paths for `module_ins` and `module_outs`.
- Patch connections store endpoints as generic CV ids (`a`, `b`) plus module
  instance ids, so connection validation/display needs an explicit plan for
  ports that can be used on either side.
- Typegen is already a known linked-project risk in nearby work; any generated
  type change must be reviewed as a local candidate and reverted if it regresses
  unrelated schema.

## Scope

- [ ] **Data model** — introduce separate `bidirectional` and `passive`
  direction semantics while preserving existing input/output records.
- [ ] **Admin / module-editor** — expose the new value(s) in the port editing UI.
- [ ] **Patch editor** — allow connections where either end is bidirectional/passive.
- [ ] **Analytics & tag hints** — treat bidirectional ports neutrally (don't skew
  input or output counts).
- [ ] **Display** — render a distinct icon or label for bidirectional/passive ports
  on the module detail page.

## Out of scope (first pass)

- Automatic inference of port direction from module tags or description text.
- Breaking changes to existing input/output port records.

## Open questions

1. Resolved: use separate `bidirectional` and `passive` direction values.
2. Schema location: introduce a unified port table/view vs add direction metadata
   to the existing split `module_ins` / `module_outs` tables.
3. Whether passive ports can be patch endpoints in both positions or should be
   modeled as non-directional connection nodes with stricter validation.
4. How legacy split-table reads should expose bidirectional ports without
   duplicating rows in existing input/output counts.
5. Whether to extend current tables with nullable direction metadata or add a
   `port_flags`
   JSONB column for future extensibility.

## Proposed first checkpoint

Because the app currently has split input/output tables, the safest first
checkpoint is a schema/design spike with no UI behavior change:

1. Read backend schema-change preflight before writing SQL.
2. Draft a local-only additive migration proposal after explicit approval.
3. Prefer an additive compatibility shape that keeps existing `module_ins` and
   `module_outs` rows valid and does not rewrite historical rows.
4. Add generated/manual type plan only after the migration shape is reviewed.
5. Add unit tests around any normalization helpers before module editor or patch
   editor UI work begins.

## Approval queue

- **Approval requested 2026-06-25T16:21+02:00:** May the next checkpoint draft a
  local-only, additive schema migration proposal for separate bidirectional and
  passive module port directions, with no remote Supabase apply and no
  production-breaking rewrite of existing `module_ins` / `module_outs` data?
  Default if not approved: keep this task planning/docs-only.
- **Approval recorded 2026-06-25T16:22+02:00:** User approved drafting the
  local-only additive schema proposal. This does not approve remote Supabase
  application, RLS/GRANT changes, backend type generation, or behavior changes.

## Decision log

- 2026-06-25T16:21+02:00 — User chose separate `bidirectional` and `passive`
  direction values. This resolves the first semantics fork and rules out the
  single-bidirectional-value and `is_passive`-flag-only models for the initial
  plan.
- 2026-06-25T16:21+02:00 — Read the current implementation surface before
  proposing work. The app persists ports through split `module_ins` /
  `module_outs` tables and `backend.update.moduleINsOUTs`, so implementation
  must be explicitly backward-compatible with that shape rather than assuming an
  existing unified `direction` column.
- 2026-06-25T16:22+02:00 — Drafted local migration
  `20260625162200_add_module_port_directions.sql`. It adds defaulted
  `direction` text columns to `module_ins` and `module_outs` with check
  constraints: input rows allow `input` / `bidirectional` / `passive`; output
  rows allow `output` / `bidirectional` / `passive`. The proposal avoids UPDATE
  backfills, keeps existing rows valid, and does not touch RLS, grants, or
  remote Supabase.
