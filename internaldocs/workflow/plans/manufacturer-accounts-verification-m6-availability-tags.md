# Manufacturer Accounts & Verification — M6 Module Availability Tags

Backlog entry: [manufacturer-accounts-verification.md](./manufacturer-accounts-verification.md)

## Status

Waiting on M2 availability methods and M5 owner context.

## Objective

Show authoritative manufacturer-set module availability tags publicly and allow the verified owner to edit them inline.

## Dependencies

- M2 availability read/add/delete methods.
- M5 owner-edit/owner-state wiring.

## Files

- `src/app/models/module-availability.ts`
- `src/app/components/module-parts/module-availability-chips/module-availability-chips.component.ts`
- `src/app/components/module-parts/module-availability-chips/module-availability-chips.component.html`
- `src/app/components/module-parts/module-availability-chips/module-availability-chips.component.scss`
- `src/app/components/module-parts/module-availability-chips/module-availability-chips.component.spec.ts`
- `src/app/components/module-parts/module-availability-editor/module-availability-editor.component.ts`
- `src/app/components/module-parts/module-availability-editor/module-availability-editor.component.html`
- `src/app/components/module-parts/module-availability-editor/module-availability-editor.component.scss`
- `src/app/components/module-parts/module-availability-editor/module-availability-editor.component.spec.ts`
- `src/app/components/module-parts/module-minimal/module-minimal.component.ts`
- `src/app/features/manufacturer-detail/manufacturer-detail-data.service.ts`

## Execution checklist

- [ ] Define the fixed availability tag tuple and label/tone/icon metadata.
- [ ] Render read-only chips for public module rows when enabled by view config.
- [ ] Render owner-only chip editor when `viewerIsOwner$` is true.
- [ ] Add/remove tags through Subjects wired to backend methods.
- [ ] Refresh availability state without reloading the full module list.
- [ ] Keep community `module_tags` separate from authoritative availability tags.

## Initial tag set

- `available_new`
- `available_resellers`
- `kit_diy`
- `prototype`
- `limited_stock`
- `discontinued`
- `contact_manufacturer`

## Validation

- `pnpm lint`
- `pnpm test-headless --include="**/module-availability*.spec.ts"`
- Runtime screenshot check for read-only and owner-edit states.

## Decision log

- 2026-06-18T11:07+02:00 — Availability is modeled as multiple tags per module because states can overlap.
- 2026-06-18T11:07+02:00 — Module-level purchase/reseller links are out of MVP; official links stay on the manufacturer page.
