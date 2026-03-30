# Supabase Migrations

This folder is the repo's schema history ledger.

Each `.sql` file is a database change saved in chronological order with a timestamp prefix:

```text
YYYYMMDDHHMMSS_description.sql
```

In this repo, the migration files are versioned, but the Angular app does not read them directly. The app only sees the final database schema after the SQL has been applied to the Supabase project.

## How This Interacts With The Backend

The runtime path is:

```text
SQL migration in this folder
-> applied to the Supabase database
-> live schema changes
-> regenerate src/backend/database.types.ts
-> update backend/app code if the new schema is used
```

The main touchpoints are:

- `src/backend/database.types.ts`
  Generated TypeScript types for the live Supabase schema. This is what gives the frontend/backend code typed access to tables and columns.
- `src/app/features/backend/DatabaseStrings.ts`
  Manual registry of table/view names and query join strings used by the app.
- `src/app/features/backend/supabase.service.ts` and related `supabase-*.ts` files
  The actual queries and writes that call Supabase.

Example: adding a new column in SQL does nothing in the app by itself. The app will only use that column after:

1. the migration has been applied to the database,
2. `src/backend/database.types.ts` has been regenerated,
3. the relevant query/update code has been changed to read or write the new field.

## Current Repo Reality

This repository currently commits:

- migration SQL files in `supabase/migrations/`
- a type-generation script in `package.json`:

```bash
yarn updateBackendTypes
```

This repository does not currently commit:

- a full local Supabase project config
- a repo-standard script for creating migrations
- a repo-standard script for applying migrations

That means this folder is the durable history of schema changes, but applying those changes still happens outside the Angular codebase.

## Writing A New Migration

Use a new timestamped `.sql` file whenever you need to change schema or backfill/fix data in a repeatable way.

Good candidates:

- add or remove a column
- add constraints
- create a new table or view
- create or update RLS policies
- backfill data required before adding a constraint

Keep migrations forward-only and explicit. If the change depends on existing bad data being cleaned first, include that cleanup in the same migration before the constraint/index change.

## What To Do If A Migration Is Already Applied

Treat applied migrations as immutable history.

Safe rule:

- If a migration has already been applied to any shared environment, do not edit that file.
- Write a new migration that moves the schema from its current state to the next state.

Only edit an existing migration when all of the following are true:

- it has not been applied anywhere important yet,
- nobody else depends on that history,
- you are correcting very fresh local work before it becomes shared history.

Why this matters:

- editing old migration files can make repo history disagree with the real database state
- teammates can end up with different schemas from the same folder contents
- generated types and backend code become harder to trust

In practice for this repo, if you are unsure whether a migration is already applied, assume it is and create a new migration.

## Recommended Change Checklist

When making a schema change:

1. Add a new SQL file in this folder.
2. Apply that SQL to the target Supabase database using your normal operational workflow.
3. Regenerate types:

```bash
yarn updateBackendTypes
```

4. If the app uses the new schema, update:
   - `src/app/features/backend/DatabaseStrings.ts` for new tables/views/select joins
   - `src/app/features/backend/supabase.service.ts` or related namespace files for queries/writes
   - any feature models/data services/components that consume the field
5. Run the relevant tests.

## Practical Rules For This Repo

- Do not make schema changes by hand without also capturing them as a migration file.
- Do not assume a DB change is complete until `database.types.ts` is in sync.
- Do not add app code for a new table/column without checking whether `DatabaseStrings.ts` needs to know about it.
- Prefer a new migration over rewriting old migration history.
