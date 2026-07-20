<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Shipping Address Book

## Status

Private schema/RLS/backend and User Area CRUD UI are complete on `develop`; transaction-flow integration remains. Priority:
HIGH. Product area: marketplace / account settings / transaction privacy.

## User intent

Users should save shipping addresses once and reuse them when buying or selling modules, instead of retyping private
shipping data in every chat.

## Product / roadmap fit

The address book is a prerequisite for structured offers, one-click info sharing, and transaction snapshots. It must be
designed as private account data, not public profile data.

## Current system analysis

- Public profiles exist as `/u/:username` surfaces with privacy states, but addresses are not part of profile data.
- Supabase storage and backend namespaces already follow explicit owner-scoped methods and cache-busting patterns.
- The app has user-area settings surfaces that can host account-level profile controls.

## Future strategy

Use saved addresses only as private templates. When a buyer and seller accept a deal, snapshot the relevant address fields
into the transaction record; never make transactions depend on live address rows that can be edited later.

## Goals

- Add a private address book under user settings.
- Support default address selection.
- Reuse saved address chips inside offer / shipping flows.
- Snapshot address data at acceptance time for transaction history.
- Keep phone/contact data optional and deliberately separate from public listings.

## Non-goals

- No public address display.
- No carrier-rate calculation in MVP.
- No label printing.
- No tax/VAT/customs workflow.
- No generic contact directory.

## Assumptions

- MVP should support international address shapes enough for EU / US / UK without overbuilding carrier integrations.
- Address form should optimize for EU/UK/US-friendly international use: country is required, while region/postal fields remain flexible enough for cross-country variation.
- Phone is out of scope for the MVP address book; add it later only if transaction/shipping needs prove it necessary.
- Account deletion will require PII scrubbing rules for transaction snapshots.

## Dependencies and sequencing

Depends on stable logged-in user profiles and privacy controls. It can be implemented in parallel with listing core because
the listing can initially expose only broad shipping regions, then wire saved addresses into structured offers.

## MVP layer

- [x] Add pure local transaction snapshot helper for validated/saved drafts; no backend, schema, UI, route, or deploy work.
- [x] Propose and approve `shipping_addresses` schema / RLS before migration work.
- [x] Add a User Area marketplace section address-book surface.
- [x] Add inline create/edit/delete form with default-address toggle.
- [x] Add address chip picker primitive for future offer/listing forms.
- [x] Ensure saved address data is never included in public profile or public listing payloads.

## Structural layer

- [ ] Add transaction-time address snapshots during offer acceptance.
- [ ] Add account deletion / profile deletion PII scrub plan for address snapshots.
- [ ] Add country normalization via ISO-3166 alpha-2 list.
- [ ] Defer phone normalization until phone support is explicitly added after MVP.

## Polish layer

- [ ] Show compact destination summary in private deal rows, e.g. `Milan, IT`.
- [ ] Add "use default address" one-click affordance in buyer offer flow.
- [ ] Defer phone/email reveal warning copy until those sensitive fields are explicitly added to transaction sharing.

## Proposed data model

`shipping_addresses`

- `id`
- `profileid`
- `label`
- `recipient_name`
- `line1`
- `line2`
- `city`
- `region`
- `postal_code`
- `country_code`
- `phone` (deferred; not included in the MVP address form/snapshots unless separately approved)
- `is_default`
- `created_at`
- `updated_at`

Transaction snapshots should be JSON objects on marketplace transaction rows, not foreign keys to this table.

## Proposed RLS (requires user approval)

- Owner-only `select`, `insert`, `update`, and `delete` by `profileid = auth.uid()`.
- No direct reads by buyers/sellers other than their own rows.
- Accepted transactions expose only the frozen snapshot to the two transaction participants.

## File / surface map

- `src/app/features/marketplace/marketplace-address-book.utils.ts`
- `src/app/features/marketplace/marketplace-address-book.utils.spec.ts`
- `src/app/features/routes/user-area/`
- `src/app/features/backbone/login/user-management.service.ts`
- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase-add.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/supabase-update.ts`
- `src/app/features/backend/supabase-delete.ts`
- `src/backend/database.types.ts`

## Acceptance criteria

- A logged-in user can create, edit, delete, and mark a default address.
- No other user can read saved address rows.
- Offer/listing plans can reuse a compact address picker without duplicating form logic.
- Transactions can snapshot addresses without being mutated by later address edits.

## Validation strategy

- Unit tests for address form validation, default-address toggling, transaction snapshot whitelisting/immutability, and private-safe chip picker options.
- Supabase service tests for CRUD methods and cache busting.
- RLS review before migration apply.
- `pnpm lint` and targeted tests once implementation exists.

## Risks and open questions

- MVP address form is EU/UK/US-friendly international: required country, flexible region/postal validation.
- Phone is excluded from MVP to reduce PII exposure.
- Closed transaction address snapshots are retained indefinitely in transaction history unless a later legal/privacy review requires scrubbing.

## Coordinator-loop handoff

Implement after public-profile privacy controls are stable, or in parallel with listing core if schema approval windows are
being bundled. Stop before migration/RLS apply until user approval is explicit.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Address book planned as private account data with transaction snapshots, not public profile fields.
- 2026-07-06T18:02+02:00 — Added safe local address draft validation and default-normalization helpers with specs; no schema/RLS/remote apply/UI/deploy was done.
- 2026-07-07T12:50+02:00 — Added the next safe checkpoint: a pure transaction snapshot helper may copy only trimmed primitive shipping fields plus private summary from a valid draft. It must normalize country via the existing helper, omit blank optional phone/region/line2 values, and exclude live-row fields (`id`, `isDefault`, owner/profile ids, timestamps), saved-address labels, and unknown properties.
- 2026-07-07T12:50+02:00 — Remaining gates stay explicit: no schema/RLS/policy/migration/data changes, backend methods, UI/route exposure, transaction persistence, deploy/release/push, or production branch work until separately approved.
- 2026-07-07T14:07+02:00 — User approved the Marketplace address book + listings foundation first, including additive backend/schema/RLS/storage work for those slices. First address/listing UI entry should live in a User Area marketplace section, with listing CTAs also appearing from Marketplace pages.
- 2026-07-07T21:32+02:00 — Completed the helper-only address chip picker checkpoint: chip options are pure TypeScript, default-first, selected/default aware, invalid rows are disabled, and chip labels expose only saved label plus broad `city, CC` destination (never recipient, street, phone, postal, live-row, or unknown fields). Validation passed with targeted address-book utils specs, docs check, and lint.
- 2026-07-08T14:13+02:00 — User decided Marketplace address book MVP should not include a phone field. Future address forms and transaction snapshots should omit phone unless a later scope explicitly adds it.
- 2026-07-08T14:13+02:00 — User chose indefinite retention for closed-transaction address snapshots in transaction history. Future account-deletion/privacy work should preserve transaction-history snapshots unless a later legal/privacy policy changes this.
- 2026-07-08T14:13+02:00 — User chose an EU/UK/US-friendly international address form for Marketplace MVP: require country, keep region/postal validation flexible, and avoid overfitting to one national address format.
- 2026-07-17 — Product owner green-lit the first applied Marketplace address-book slice: additive `shipping_addresses` schema, owner-only CRUD RLS, backend methods/cache invalidation, type generation, review, and advisors on the Patcher project. User Area UI, transaction persistence, production release, and push remain out of scope for this checkpoint.
- 2026-07-17 — Physical representation (from the applied migration): UUID `shipping_addresses.id`, owner FK `profileid -> profiles.id`, no phone column, authenticated owner-only CRUD RLS using `(select auth.uid())`, owner/default indexes, and a trigger plus partial unique index to safely switch one default address per owner. Post-apply Supabase advisors showed no `shipping_addresses` security findings (one expected INFO for the fresh unused `shipping_addresses_owner_order_idx` index).
- 2026-07-17 — Applied the additive private `shipping_addresses` migration and owner-only RLS, then integrated typed CRUD/backend support in `97f03387`. Added the private User Area address-book CRUD/default UI in `30443234`; collapsed rows expose only label plus `city, CC`, phone remains excluded, and no public route/payload wiring was added. Focused UI/data/helper/layout specs pass. Authenticated screenshot validation is blocked because `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` are not configured; the existing auth state falls back to the public FAQ.
