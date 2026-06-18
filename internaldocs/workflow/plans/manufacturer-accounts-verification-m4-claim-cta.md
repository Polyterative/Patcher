# Manufacturer Accounts & Verification — M4 Manufacturer Claim CTA

Backlog entry: [manufacturer-accounts-verification.md](./manufacturer-accounts-verification.md)

## Status

Waiting on M2 backend access.

## Objective

Render the manufacturer-detail claim CTA and viewer-specific claim state machine.

## Dependencies

- M2 claim create/delete/read methods.
- M2 ownership check method.

## Files

- `src/app/features/manufacturer-detail/manufacturer-claim/manufacturer-claim.component.ts`
- `src/app/features/manufacturer-detail/manufacturer-claim/manufacturer-claim.component.html`
- `src/app/features/manufacturer-detail/manufacturer-claim/manufacturer-claim.component.scss`
- `src/app/features/manufacturer-detail/manufacturer-claim/manufacturer-claim.component.spec.ts`
- `src/app/features/manufacturer-detail/manufacturer-claim/manufacturer-claim-data.service.ts`
- `src/app/features/manufacturer-detail/manufacturer-claim/manufacturer-claim-data.service.spec.ts`
- `src/app/features/manufacturer-detail/manufacturer-detail.component.ts`
- `src/app/features/manufacturer-detail/manufacturer-detail.component.html`
- `src/app/features/manufacturer-detail/manufacturer-detail-data.service.ts`
- `src/app/features/manufacturer-detail/manufacturer.module.ts`

## Execution checklist

- [ ] Create a component-scoped data service with `manufacturerId$`, `viewerClaim$`, `viewerIsOwner$`, and `ctaState$`.
- [ ] Support CTA states: not authenticated, can claim, pending, needs more info, rejected, owner.
- [ ] Submit claims with manufacturer ID and proof note only.
- [ ] Support pending claim withdrawal.
- [ ] Render the CTA inline under the manufacturer hero, not in a dialog or separate route.
- [ ] Expose owner state for later edit-mode gating.
- [ ] Keep subscriptions reactive with `SubManager`/`takeUntil` or template `async`.

## Validation

- `pnpm lint`
- `pnpm test-headless --include="**/manufacturer-claim*.spec.ts"`

## Decision log

- 2026-06-18T11:07+02:00 — Claim proof is a required note only; no email/domain/document requirement in MVP.
- 2026-06-18T11:07+02:00 — Claim statuses are `pending`, `approved`, `rejected`, and `needs_more_info`.
