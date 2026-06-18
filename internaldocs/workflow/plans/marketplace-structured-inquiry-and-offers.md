<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Structured Inquiry and Offers

## Status

Backlog intake. Priority: HIGH. Product area: marketplace / buyer-seller workflow.

## User intent

Users should be able to click a button that sends the important sale information as structured data: proposed price,
message, shipping destination/address choice, seller response, and next steps.

## Product / roadmap fit

This replaces a loose email-only inquiry with a structured transaction seed. It keeps v1 lighter than full realtime chat
while avoiding a future migration from unstructured messages to transaction lifecycle records.

## Current system analysis

- Roadmap now allows structured inquiry records while keeping generic chat/payment out of v1.
- Address book is planned as private reusable templates.
- Listing entities will expose active public listings and seller-only management.

## Future strategy

Make every serious buyer contact create or update a `marketplace_transaction` row. The first message can be structured
without a full chat thread. Later realtime messaging and status lifecycle can attach to the same transaction.

## Goals

- Add structured inquiry / offer creation from listing detail.
- Support seller actions: accept, decline, counter.
- Lock agreed price and selected address snapshots at accept time.
- Reveal sensitive contact/shipping details only after acceptance.
- Seed transaction status events from the first inquiry.

## Non-goals

- No generic chat thread in MVP.
- No payment processing.
- No file attachments.
- No feedback/reputation creation.
- No automatic collection mutation after accepted/sold state.

## Assumptions

- Buyers may inquire with a message and optional proposed price.
- Buyers can choose a saved shipping address, but sellers should initially see only broad destination summary until accept.
- Sellers can use structured response actions rather than composing every detail manually.

## Dependencies and sequencing

Depends on listing core. Depends on address book for full one-click buyer shipping payload, but can start with a destination
summary if address book lands later.

## MVP layer

- [ ] Propose and approve `marketplace_transactions` and `transaction_status_events` schema / RLS.
- [ ] Add buyer inquiry form with proposed price, message, and optional address picker.
- [ ] Add seller accept / decline / counter actions.
- [ ] Snapshot accepted price and address data when the seller accepts.
- [ ] Add notification hooks for buyer/seller state changes.

## Structural layer

- [ ] Add counter-offer loop with explicit latest-offer summary.
- [ ] Add one-active-serious-transaction constraint per listing once accepted.
- [ ] Add structured seller info card for payment/shipping instructions without creating free-form chat.
- [ ] Add admin-readable event history for dispute investigation.

## Polish layer

- [ ] Add inline "Send offer" and "Send info" cards in future message thread UI.
- [ ] Add templates for common seller responses.
- [ ] Add stale inquiry auto-cancel warning after agreed interval.

## Proposed data model

`marketplace_transactions`

- `id`
- `listing_id`
- `seller_profileid`
- `buyer_profileid`
- `proposed_price_amount_minor`
- `proposed_price_currency`
- `agreed_price_amount_minor`
- `agreed_price_currency`
- `buyer_shipping_address_snapshot`
- `seller_shipping_origin_snapshot`
- `status`
- `created_at`
- `updated_at`
- `closed_at`

`transaction_status_events`

- `id`
- `transaction_id`
- `from_status`
- `to_status`
- `actor_profileid`
- `note`
- `created_at`

Initial transaction statuses: `proposed`, `negotiating`, `accepted`, `cancelled_by_buyer`, `cancelled_by_seller`,
`cancelled_mutual`.

## Proposed RLS (requires user approval)

- Buyer/seller-only read for transaction rows.
- Buyer can create inquiry for active listing if not seller.
- Seller can accept/decline/counter for own listing.
- Both participants can read transaction events; writes happen only through controlled backend methods / RPC if state
  validation requires it.

## File / surface map

- Listing detail route from `marketplace-browse-detail-and-cockpits.md`
- Address picker from `marketplace-shipping-address-book.md`
- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase-add.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/supabase-update.ts`
- `src/backend/database.types.ts`

## Acceptance criteria

- A buyer can send a structured inquiry from an active listing.
- A seller can accept, decline, or counter without opening a generic chat.
- Accepted transactions snapshot agreed price and address details.
- Only buyer and seller can read the transaction.
- Every state change creates an event row.

## Validation strategy

- Unit tests for state transition helper.
- Supabase service tests for buyer/seller permission-shape and cache busting.
- Component tests for inquiry form and seller response actions.
- E2E smoke test for inquiry -> accept happy path once routes exist.

## Risks and open questions

- Decide whether accepted state reveals email/phone or only in-app structured instructions.
- Decide stale inquiry timeout.
- Decide whether completed-sale price datapoints require opt-in at this stage.

## Coordinator-loop handoff

Implement after listing core MVP or bundle with it if the user wants a usable marketplace launch slice. Keep realtime chat
out until this structured transaction seed is stable.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Inquiry plan stores first contact as a transaction seed so lifecycle and chat can attach later.
