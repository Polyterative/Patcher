# Manufacturer Accounts & Verification — M1 Schema Foundation

Backlog entry: [manufacturer-accounts-verification.md](./manufacturer-accounts-verification.md)

## Status

Local validation/typegen checkpoint completed. Remote apply remains a separate explicit approval gate.

## Objective

Create the local database/storage foundation needed by all later chunks, then stop before any remote apply.

## Deliverables

- Local migration adding verification/profile fields to `public.manufacturers`.
- Local migration adding `public.manufacturer_claims`, claim status constraints, indexes, RLS, and review/approval triggers.
- Local migration adding `public.module_availability_tags`, availability tag constraints, indexes, and RLS.
- Local migration adding owner update policies/guards for `manufacturers` and `modules`.
- Local migration creating/configuring `manufacturer-logos` storage bucket and owner/admin write policies.
- Regenerated `src/backend/database.types.ts` once local Supabase is available.

## Files

- `supabase/migrations/20260618112800_add_manufacturer_verification_fields.sql`
- `supabase/migrations/20260618112900_add_manufacturer_claims.sql`
- `supabase/migrations/20260618113000_add_module_availability_tags.sql`
- `supabase/migrations/20260618113100_manufacturer_owner_update_policies.sql`
- `supabase/migrations/20260618113200_manufacturer_logo_storage_policies.sql`
- `src/backend/database.types.ts` after local type generation succeeds

## Execution checklist

- [x] Inspect existing schema, RLS, admin-role, and storage patterns.
- [x] Draft local migrations without remote mutation.
- [x] Preserve existing `manufacturers.adminUser` as the single-owner field.
- [x] Account for existing `adminUser` being `text` by comparing ownership with `auth.uid()::text`.
- [x] Create the missing `manufacturer-logos` bucket locally as public.
- [x] Start local Supabase/Docker.
- [x] Generate local candidate types from disposable local Supabase and merge the M1-safe additions into `src/backend/database.types.ts`.
- [x] Review generated types for optional DB-default fields.
- [x] Run `pnpm lint`.
- [x] Run `pnpm test-headless --include="**/DatabaseStrings.spec.ts"`.
- [ ] Stop and request explicit approval before any remote apply.

## Validation

- Disposable local Supabase application/smoke test of the five M1 migrations against the required pre-existing tables.
- Local Supabase schema lint: `supabase db lint --local --schema public --fail-on error`.
- Local type generation candidate: `pnpm exec supabase gen types typescript --local --schema public`.
- Generated-type compile check: `pnpm exec tsc --noEmit -p src/tsconfig.app.json`.
- `pnpm lint`
- `pnpm test-headless --include="**/DatabaseStrings.spec.ts"`
- Manual SQL/RLS review before remote apply approval.

## Stop condition

Do not start M2 until `pnpm updateBackendTypes` succeeds and the generated type diff is reviewed.

## Decision log

- 2026-06-18T11:32+02:00 — Read-only inspection found `manufacturers.adminUser` is existing `text`; local policies compare with `auth.uid()::text`.
- 2026-06-18T11:32+02:00 — Read-only inspection found no existing `manufacturer-logos` bucket; local migration creates it as public.
- 2026-06-18T11:32+02:00 — Type generation blocked because Supabase CLI cannot reach Docker/local Supabase; `src/backend/database.types.ts` remains unchanged.
- 2026-07-07T14:33+02:00 — Retried `pnpm updateBackendTypes`; script runs `npx supabase gen types typescript --project-id "$SUPABASE_PROJECT_ID" --schema public`, which does not mutate remote schema, but failed because `SUPABASE_PROJECT_ID` is unset: `Must specify one of --local, --linked, --project-id, or --db-url`. `src/backend/database.types.ts` was restored unchanged.
- 2026-07-07T14:39+02:00 — Hardened `pnpm updateBackendTypes` so it writes to a temp file, preserves `src/backend/database.types.ts` on failure, and falls back to `supabase gen types --local` when `SUPABASE_PROJECT_ID` is unset. Retest now fails at the real local prerequisite: Docker daemon is not running; existing generated types remain unchanged.
- 2026-07-17 — Product owner approved starting Docker/local Supabase, validating the drafted M1 migrations locally, running local type generation, and reviewing the generated diff. Stop before any remote apply.
- 2026-07-17T11:26+02:00 — Local-only M1 validation completed in a disposable Supabase stack. The repo still has no baseline schema migration, so full `supabase db reset --local` fails before M1 on missing historical tables; M1 was validated against a minimal local baseline containing the required existing `profiles`, `manufacturers`, and `modules` tables. Local candidate typegen confirmed DB-default Insert/Update fields are optional, and only the M1-safe type additions were merged into `src/backend/database.types.ts`.
