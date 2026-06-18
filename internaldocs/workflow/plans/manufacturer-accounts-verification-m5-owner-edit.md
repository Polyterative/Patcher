# Manufacturer Accounts & Verification — M5 Verified-Owner Profile and Logo Edit

Backlog entry: [manufacturer-accounts-verification.md](./manufacturer-accounts-verification.md)

## Status

Waiting on M4 owner state and M2 write/storage methods.

## Objective

Allow the verified owner to edit official manufacturer profile fields and upload a logo inline on the manufacturer detail page.

## Dependencies

- M2 profile update and logo storage methods.
- M4 `viewerIsOwner$` and edit-mode trigger.

## Files

- `src/app/features/manufacturer-detail/manufacturer-detail-edit/manufacturer-detail-edit.component.ts`
- `src/app/features/manufacturer-detail/manufacturer-detail-edit/manufacturer-detail-edit.component.html`
- `src/app/features/manufacturer-detail/manufacturer-detail-edit/manufacturer-detail-edit.component.scss`
- `src/app/features/manufacturer-detail/manufacturer-detail-edit/manufacturer-detail-edit.component.spec.ts`
- `src/app/features/manufacturer-detail/manufacturer-detail-data.service.ts`
- `src/app/features/manufacturer-detail/manufacturer-detail.component.ts`
- `src/app/features/manufacturer-detail/manufacturer-detail.component.html`
- `src/app/features/manufacturer-detail/manufacturer.module.ts`

## Execution checklist

- [ ] Add inline edit mode on manufacturer detail; no separate route.
- [ ] Add reactive form fields for name, website URL, tagline, description, and social links.
- [ ] Add logo upload through app storage.
- [ ] Reject logo files larger than 2 MB client-side.
- [ ] Save optional logo upload before `manufacturerProfileAsOwner(...)`.
- [ ] Refresh manufacturer detail after save.
- [ ] Cancel edit mode without mutating values.

## Validation

- `pnpm lint`
- `pnpm test-headless --include="**/manufacturer-detail-edit*.spec.ts"`
- Runtime screenshot check before considering visible UI done.

## Decision log

- 2026-06-18T11:07+02:00 — Verified owners may edit official manufacturer/profile/catalogue content broadly.
- 2026-06-18T11:07+02:00 — Manufacturer logos use app storage uploads.
- 2026-06-18T11:07+02:00 — No audit/history/rollback layer is required for MVP owner edits.
