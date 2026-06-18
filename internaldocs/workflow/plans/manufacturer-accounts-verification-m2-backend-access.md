# Manufacturer Accounts & Verification — M2 Backend Access Layer

Backlog entry: [manufacturer-accounts-verification.md](./manufacturer-accounts-verification.md)

## Status

Waiting on M1 type generation.

## Objective

Expose typed Supabase access for claims, ownership checks, owner profile edits, logo upload, and module availability tags.

## Dependencies

- M1 migrations drafted.
- Local Supabase available.
- `pnpm updateBackendTypes` completed and generated types reviewed.

## Files

- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase.cache.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/supabase-add.ts`
- `src/app/features/backend/supabase-update.ts`
- `src/app/features/backend/supabase-delete.ts`
- `src/app/features/backend/supabase-storage.ts`
- `src/app/features/backend/__tests__/supabase-service/integration-manufacturers.spec.ts`
- `src/app/features/backend/DatabaseStrings.spec.ts`

## Execution checklist

- [ ] Register `manufacturer_claims` and `module_availability_tags` in `DatabaseStrings.ts`.
- [ ] Add cache keys for manufacturer claims, ownership, pending admin claims, and module availability tags.
- [ ] Add read methods:
  - `manufacturerClaimByManufacturerForCurrentUser(manufacturerId)`
  - `manufacturerOwnershipForCurrentUser(manufacturerId)`
  - `pendingManufacturerClaims()`
  - `moduleAvailabilityTags(moduleId)`
- [ ] Add create methods:
  - `manufacturerClaim({manufacturer_id, proof_note})`
  - `moduleAvailabilityTag({module_id, tag})`
- [ ] Add update methods:
  - `manufacturerProfileAsOwner(...)`
  - `manufacturerClaimStatusAsAdmin(...)`
- [ ] Add delete methods:
  - `moduleAvailabilityTag({module_id, tag})`
  - `manufacturerClaim(id)`
- [ ] Add storage methods:
  - `uploadManufacturerLogo(file, filename)`
  - `deleteManufacturerLogo(filename)`
- [ ] Use explicit column lists for every query.
- [ ] Bust every affected cache key after writes.
- [ ] Add/update backend integration specs.

## Validation

- `pnpm lint`
- `pnpm test-headless --include="**/DatabaseStrings.spec.ts"`
- `pnpm test-headless --include="**/supabase-service/integration-manufacturers.spec.ts"`

## Decision log

- 2026-06-18T11:45+02:00 — M2 must not begin until M1 generates local backend types; downstream Angular code should not guess database shapes.
