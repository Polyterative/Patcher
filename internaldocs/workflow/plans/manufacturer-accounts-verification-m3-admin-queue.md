# Manufacturer Accounts & Verification — M3 Admin Review Queue

Backlog entry: [manufacturer-accounts-verification.md](./manufacturer-accounts-verification.md)

## Status

Waiting on M2 backend access.

## Objective

Add a minimal in-app admin queue for reviewing manufacturer claims under the existing admin-only area and `admin` app_metadata guard.

## Dependencies

- M2 read/update methods for pending claims and admin status transitions.

## Files

- `src/app/features/backend/admin-panel-root/admin-manufacturer-claims/admin-manufacturer-claims.component.ts`
- `src/app/features/backend/admin-panel-root/admin-manufacturer-claims/admin-manufacturer-claims.component.html`
- `src/app/features/backend/admin-panel-root/admin-manufacturer-claims/admin-manufacturer-claims.component.scss`
- `src/app/features/backend/admin-panel-root/admin-manufacturer-claims/admin-manufacturer-claims.component.spec.ts`
- `src/app/features/backend/admin-panel-root/admin-manufacturer-claims/admin-manufacturer-claims-data.service.ts`
- `src/app/features/backend/admin-panel-root/admin-manufacturer-claims/admin-manufacturer-claims-data.service.spec.ts`
- `src/app/features/backend/admin-panel-root/admin-manufacturer-claims/admin-manufacturer-claims-data.types.ts`
- `src/app/features/backend/admin-panel-root/admin-panel-root.component.html`
- `src/app/features/backend/backend.module.ts`

## Execution checklist

- [ ] Mirror the data-service structure used by `AdminFlagsComponent`.
- [ ] Load pending/recent claim rows from `backend.get.pendingManufacturerClaims()`.
- [ ] Add status filtering and pending count streams.
- [ ] Add approve/reject/needs-more-info actions with optional admin note.
- [ ] Render manufacturer name/link, claimant identity, proof note, status, age, and admin note.
- [ ] Embed the component below existing admin flags in `AdminPanelRootComponent`.
- [ ] Keep all access behind the existing admin route/guard.

## Validation

- `pnpm lint`
- `pnpm test-headless --include="**/admin-manufacturer-claims*.spec.ts"`

## Decision log

- 2026-06-18T11:07+02:00 — User selected a minimal in-app admin review queue rather than manual database-only approval.
- 2026-06-18T11:07+02:00 — Queue uses the existing admin-only area and existing `admin` app_metadata role.
