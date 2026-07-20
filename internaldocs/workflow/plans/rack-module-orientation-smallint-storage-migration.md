# Rack module orientation — smallint storage migration

## Status

Open. Documentation and design decision recorded 2026-07-19. Schema application,
type generation, and backend changes require explicit product-owner approval and the
standard schema-change preflight. No RLS or policy change is expected.

## Problem

The completed 3U flip feature stores placement orientation in
`rack_modules.orientation` as checked text: `normal` or `rot180`. The semantic model is
correct, but text is not the right physical representation for a small finite state.
It consumes more storage and wire payload than necessary and encourages database
strings to leak into application logic.

## Decision

Store orientation as `smallint`:

| Database value | Application meaning |
|---|---|
| `0` | `normal` |
| `1` | `rot180` |
| `2+` | Reserved for reviewed future 1U/orientation states |

Keep `RackModuleOrientation` semantic names in TypeScript. Translate numbers to names
only in the Supabase read/write boundary so UI and domain code remain readable.

Do not use a boolean: it is compact but cannot represent the already anticipated 1U
orientation variants. Do not use a PostgreSQL enum: it is less flexible to extend and
still couples schema migrations to semantic labels.

## Migration outline

1. Read `patterns/BACKEND_METHODS.md` schema-change preflight and inspect the live
   column, constraint, policies, table size, and dependent views/functions.
2. Drop the text default and `rack_modules_orientation_check` constraint.
3. Convert the column with an explicit `USING CASE` mapping:
   `normal -> 0`, `rot180 -> 1`; reject unexpected values rather than silently
   coercing them.
4. Set `smallint NOT NULL DEFAULT 0` and add a numeric check constraint covering only
   currently supported values (`0`, `1`).
5. Regenerate `src/backend/database.types.ts`.
6. Update Supabase read/insert/targeted-update mappings to translate numeric storage
   to the semantic TypeScript union. Existing layout batch updates must continue to
   omit orientation.
7. Add compatibility tests for `0`, `1`, null/malformed defensive reads, new-placement
   defaults, targeted writes, and preservation during layout operations.
8. Run targeted specs, `pnpm lint`, docs check, `git diff --check`, then Supabase
   security/performance advisors after an approved apply.

The type conversion may rewrite `rack_modules` and briefly lock the table. Schedule the
remote apply deliberately after checking table size and active traffic. `ALTER COLUMN
TYPE ... USING` must not use a row-by-row application backfill and must not change RLS,
policies, grants, or placement ownership semantics.

## Acceptance criteria

- Existing `normal` and `rot180` rows become `0` and `1` without changing placement
  ids, rack ownership, timestamps, layout, or visible orientation.
- New placements default to `0`.
- The application continues to expose only semantic orientation names outside the
  backend boundary.
- Flip, undo, public rendering, patch rendering, duplication, move/remix, and rollback
  behavior remain unchanged.
- Old generic rack-module batch writes cannot overwrite orientation.
- Generated types, focused tests, lint, docs, diff check, and post-apply advisors pass.

## Decision log

- 2026-07-19 — Product owner rejected text as the physical storage representation.
  Chose `smallint` over boolean to retain a compact extension path for future 1U
  orientation states, while keeping semantic string names inside the application.
