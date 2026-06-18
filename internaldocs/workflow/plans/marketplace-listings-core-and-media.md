<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Listings Core and Media

## Status

Backlog intake. Priority: HIGH. Product area: marketplace / listings / storage.

## User intent

When a user declares a module for sale, they need a real listing surface with price, text, condition, images/media,
shipping scope, and contact preferences.

## Product / roadmap fit

Listings are the central marketplace entity. They should build on canonical module data and `SELLS` possession state while
remaining distinct from collection membership and transaction lifecycle.

## Current system analysis

- `user_modules.kind = SELLS` already represents sale intent.
- Module detail and user-area module lists already expose for-sale language.
- Supabase storage namespace exists for module panels, rack images, and collection covers.
- Roadmap now treats listing media and structured market data as part of the Tier 2 market layer.

## Future strategy

Make listings structured enough to power market search, price guidance, and trust review. Avoid free-text module names,
JSON-only media blobs, and hidden side effects on collection state.

## Goals

- Create `marketplace_listings` linked to canonical modules and seller profiles.
- Create separate ordered listing media records.
- Add inline listing creation/edit form from the for-sale module context.
- Support draft, active, paused, reserved, closed, and expired listing states.
- Keep listing publish/close state separate from `user_modules.kind`.

## Non-goals

- No payment processing.
- No transaction lifecycle beyond listing reservation hooks.
- No hosted audio/video upload in MVP; use images and optional safe embed URLs only if approved.
- No trade/swap listings in MVP.
- No moderation queue implementation unless listing heuristics are explicitly included in the same cycle.

## Assumptions

- A listing must reference one canonical module.
- A seller can have one active listing per module in MVP unless multi-copy sales are explicitly approved later.
- Images should be uploaded through app storage, not external-only URLs.

## Dependencies and sequencing

Depends on stable public profile IDs and owner-scoped storage policies. It can run in parallel with address book and browse
UI as long as the listing read model is agreed early.

## MVP layer

- [ ] Propose and approve `marketplace_listings`, `listing_media`, storage bucket, and RLS.
- [ ] Add listing create/edit methods through `SupabaseService`.
- [ ] Add inline listing form from `SELLS` module context.
- [ ] Add listing media upload/delete/reorder for images.
- [ ] Add active listing public read query with explicit columns.
- [ ] Add seller-only draft/paused/closed read query.

## Structural layer

- [ ] Add listing expiry / renew flow.
- [ ] Add reserved status hook for accepted transactions.
- [ ] Add listing anti-abuse heuristics: velocity caps and suspicious off-platform payment/contact patterns.
- [ ] Add admin/moderation hooks for flagged listings.

## Polish layer

- [ ] Add "price guidance" from Price Hub on the listing form.
- [ ] Add duplicate listing warning if the seller already has an active listing for the module.
- [ ] Add copy that explains collection state is not automatically changed when a listing closes.

## Proposed data model

`marketplace_listings`

- `id`
- `public_id`
- `seller_profileid`
- `moduleid`
- `title_override`
- `description`
- `condition`
- `asking_price_amount_minor`
- `asking_price_currency`
- `open_to_offers`
- `ships_from_country`
- `shipping_options`
- `external_link`
- `status`
- `created_at`
- `updated_at`
- `expires_at`

`listing_media`

- `id`
- `listing_id`
- `kind`
- `url`
- `position`
- `created_at`

Recommended listing statuses: `draft`, `active`, `paused`, `reserved`, `closed_sold`, `closed_unsold`, `expired`.

## Proposed RLS (requires user approval)

- Public `select` only for `marketplace_listings.status in ('active', 'reserved')`.
- Seller-only `select`, `insert`, `update`, and close/delete actions for all seller listing rows.
- Listing media public read only when parent listing is public; seller-only write/delete.
- Storage path scoped by seller/listing; strip EXIF before upload.

## File / surface map

- `src/app/components/module-parts/module-detail-data.service.ts`
- `src/app/features/routes/user-area/user-modules/`
- Future marketplace listing editor under `src/app/features/routes/marketplace/`
- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase-add.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/supabase-update.ts`
- `src/app/features/backend/supabase-storage.ts`
- `src/backend/database.types.ts`

## Acceptance criteria

- A seller can create a draft listing from a module they own / have marked for sale.
- A seller can publish, pause, edit, and close their own listing.
- Active listings are publicly readable without private seller address or private transaction data.
- Listing images render in browse/detail surfaces and can be managed by the owner.

## Validation strategy

- Supabase service tests for listing CRUD, explicit column selection, and cache busting.
- Component tests for inline form validation and media ordering.
- Storage tests or integration smoke test for upload/delete path.
- `pnpm lint` and targeted marketplace tests.

## Risks and open questions

- Decide whether active listings require at least one image.
- Decide single-region launch shipping enum vs flexible region text.
- Decide how much anti-abuse filtering ships with MVP.
- Decide whether external contact links are allowed before accepted transaction state.

## Coordinator-loop handoff

Start after schema/RLS approval. Keep transaction/status logic out unless `marketplace-structured-inquiry-and-offers.md`
is intentionally bundled into the same implementation cycle.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Listing plan uses canonical module links and separate media rows to preserve moderation/order flexibility.
