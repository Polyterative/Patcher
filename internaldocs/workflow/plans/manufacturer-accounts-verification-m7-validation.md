# Manufacturer Accounts & Verification — M7 Validation and Review

Backlog entry: [manufacturer-accounts-verification.md](./manufacturer-accounts-verification.md)

## Status

Waiting on M3, M4, M5, and M6.

## Objective

Verify the full MVP claim -> review -> owner-edit path before completion/archive.

## Dependencies

- M3 admin review queue complete.
- M4 claim CTA complete.
- M5 owner edit complete.
- M6 availability tags complete.

## Execution checklist

- [ ] Run lint.
- [ ] Run targeted manufacturer/admin/backend specs.
- [ ] Run docs checks.
- [ ] Run review persona on the cumulative diff.
- [ ] Capture runtime screenshots for visible states using `patcher-ui-debug`.
- [ ] Update active/backlog plan status.
- [ ] Archive only after user confirms the feature is accepted.

## Validation commands

- `pnpm lint`
- `pnpm test-headless --include="**/manufacturer*.spec.ts"`
- `pnpm test-headless --include="**/admin-manufacturer-claims*.spec.ts"`
- `pnpm test-headless --include="**/supabase-service/integration-manufacturers.spec.ts"`
- `node scripts/checks/check-docs.cjs`

## Runtime states to inspect

- Manufacturer detail not-authenticated claim CTA.
- Manufacturer detail can-claim form.
- Manufacturer detail pending claim state.
- Manufacturer detail owner state.
- Admin queue with pending claim.
- Owner edit mode with logo preview.
- Module availability read-only chips.
- Module availability owner editor.

## Decision log

- 2026-06-18T11:45+02:00 — Validation is a dedicated final chunk and must not be collapsed into implementation chunks.
