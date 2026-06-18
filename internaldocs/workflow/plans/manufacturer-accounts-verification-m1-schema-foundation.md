# Manufacturer Accounts & Verification — M1 Schema Foundation

Backlog entry: [manufacturer-accounts-verification.md](./manufacturer-accounts-verification.md)

## Status

Blocked after local migration drafting. Local type generation requires Docker/local Supabase.

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
- [ ] Start local Supabase/Docker.
- [ ] Run `pnpm updateBackendTypes`.
- [ ] Review generated types for optional DB-default fields.
- [ ] Run `pnpm lint`.
- [ ] Run `pnpm test-headless --include="**/DatabaseStrings.spec.ts"`.
- [ ] Stop and request explicit approval before any remote apply.

## Validation

- `pnpm lint`
- `pnpm test-headless --include="**/DatabaseStrings.spec.ts"`
- Manual SQL/RLS review before remote apply approval

## Stop condition

Do not start M2 until `pnpm updateBackendTypes` succeeds and the generated type diff is reviewed.

## Decision log

- 2026-06-18T11:32+02:00 — Read-only inspection found `manufacturers.adminUser` is existing `text`; local policies compare with `auth.uid()::text`.
- 2026-06-18T11:32+02:00 — Read-only inspection found no existing `manufacturer-logos` bucket; local migration creates it as public.
- 2026-06-18T11:32+02:00 — Type generation blocked because Supabase CLI cannot reach Docker/local Supabase; `src/backend/database.types.ts` remains unchanged.
