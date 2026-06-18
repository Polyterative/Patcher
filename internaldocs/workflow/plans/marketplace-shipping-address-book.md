<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Shipping Address Book

## Status

Backlog intake. Priority: HIGH. Product area: marketplace / account settings / transaction privacy.

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
- Phone is optional and should be hidden unless explicitly included in accepted transaction info.
- Account deletion will require PII scrubbing rules for transaction snapshots.

## Dependencies and sequencing

Depends on stable logged-in user profiles and privacy controls. It can be implemented in parallel with listing core because
the listing can initially expose only broad shipping regions, then wire saved addresses into structured offers.

## MVP layer

- [ ] Propose and approve `shipping_addresses` schema / RLS before migration work.
- [ ] Add `/my/settings/addresses` or equivalent user-area address-book surface.
- [ ] Add inline create/edit/delete form with default-address toggle.
- [ ] Add address chip picker primitive for future offer/listing forms.
- [ ] Ensure saved address data is never included in public profile or public listing payloads.

## Structural layer

- [ ] Add transaction-time address snapshots during offer acceptance.
- [ ] Add account deletion / profile deletion PII scrub plan for address snapshots.
- [ ] Add country normalization via ISO-3166 alpha-2 list.
- [ ] Add phone normalization only if phone is included in MVP.

## Polish layer

- [ ] Show compact destination summary in private deal rows, e.g. `Milan, IT`.
- [ ] Add "use default address" one-click affordance in buyer offer flow.
- [ ] Add copy warning for sensitive fields when the user chooses to reveal phone/email.

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
- `phone`
- `is_default`
- `created_at`
- `updated_at`

Transaction snapshots should be JSON objects on marketplace transaction rows, not foreign keys to this table.

## Proposed RLS (requires user approval)

- Owner-only `select`, `insert`, `update`, and `delete` by `profileid = auth.uid()`.
- No direct reads by buyers/sellers other than their own rows.
- Accepted transactions expose only the frozen snapshot to the two transaction participants.

## File / surface map

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

- Unit tests for address form validation and default-address toggling.
- Supabase service tests for CRUD methods and cache busting.
- RLS review before migration apply.
- `pnpm lint` and targeted tests once implementation exists.

## Risks and open questions

- Launch geography determines how strict the address schema should be.
- Phone may be unnecessary for MVP and increases PII exposure.
- Need explicit PII retention window for closed transactions; 90 days is a reasonable starting proposal.

## Coordinator-loop handoff

Implement after public-profile privacy controls are stable, or in parallel with listing core if schema approval windows are
being bundled. Stop before migration/RLS apply until user approval is explicit.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Address book planned as private account data with transaction snapshots, not public profile fields.
