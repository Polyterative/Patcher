<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Structured Inquiry and Offers

## Status

Safe local helper checkpoints complete. Priority: HIGH. Product area: marketplace / buyer-seller workflow.

Latest checkpoint scope: pure TypeScript latest-offer/counter-offer summary only. No schema/RLS/policy/migration/data,
backend methods, UI/routes, notifications, deploy/release/push, or production-branch work.

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
- Private shipping/contact details are never exposed automatically; the owning user must explicitly reveal them and must be able to hide/revoke them later if the transaction goes wrong.

## Dependencies and sequencing

Depends on listing core. Depends on address book for full one-click buyer shipping payload, but can start with a destination
summary if address book lands later.

## MVP layer

- [x] Add a pure local buyer inquiry draft validator/normalizer for future first-contact/offer forms.
- [x] Require nonblank `listingId`, `buyerProfileId`, and trimmed message capped at 1000 characters.
- [x] Reuse marketplace money parsing/currency normalization for optional proposed price; require valid price/currency as a pair.
- [x] Whitelist normalized output and include only optional `buyerDestinationSummary`, not arbitrary private address snapshots.
- [x] Add a pure latest-offer summary helper for proposed/counter/agreed price display.
- [ ] Propose and approve `marketplace_transactions` and `transaction_status_events` schema / RLS.
- [ ] Add buyer inquiry form with proposed price, message, and optional address picker.
- [ ] Add seller accept / decline / counter actions.
- [ ] Snapshot accepted price and address data when the seller accepts, but reveal private shipping details only after explicit user action.
- [ ] Add notification hooks for buyer/seller state changes.

## Structural layer

- [ ] Add counter-offer loop with explicit latest-offer summary.
- [ ] Add one-active-serious-transaction constraint per listing once accepted.
- [ ] Add structured seller info card for payment/shipping instructions without creating free-form chat.
- [ ] Add admin-readable event history for dispute investigation.

## Polish layer

- [ ] Add inline "Send offer" and "Send info" cards in future message thread UI.
- [ ] Add templates for common seller responses.
- [ ] Defer stale inquiry auto-cancel; MVP uses manual status changes only.

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

- `src/app/features/marketplace/marketplace-transaction.utils.ts`
- `src/app/features/marketplace/marketplace-transaction.utils.spec.ts`
- Listing detail route from `marketplace-browse-detail-and-cockpits.md`
- Address picker from `marketplace-shipping-address-book.md`
- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase-add.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/supabase-update.ts`
- `src/backend/database.types.ts`

## Acceptance criteria

- Current safe checkpoint: buyer inquiry drafts return `{ valid: true, inquiry }` or `{ valid: false, errors }`, never throw on malformed input, and exclude unknown/private fields.
- Current safe checkpoint: optional proposed price uses the existing marketplace money util and is accepted only with a valid paired currency.
- Current safe checkpoint: destination data is limited to a non-sensitive summary string until schema/RLS/address snapshot approvals exist.
- A buyer can send a structured inquiry from an active listing.
- A seller can accept, decline, or counter without opening a generic chat.
- Accepted transactions snapshot agreed price and address details, but private shipping details remain hidden until explicitly revealed and can be hidden again.
- Only buyer and seller can read the transaction.
- Every state change creates an event row.

## Validation strategy

- Unit tests for state transition helper and local buyer inquiry draft helper.
- `pnpm test-headless --include="**/marketplace-transaction.utils.spec.ts"` for happy path, optional price, invalid price/currency pair, malformed values, unknown/private field exclusion, and message max length.
- `node scripts/checks/check-docs.cjs` after workflow doc updates.
- `git diff --check` before delivery.
- `pnpm lint` because TypeScript production code was added, if feasible.
- Supabase service tests for buyer/seller permission-shape and cache busting.
- Component tests for inquiry form and seller response actions.
- E2E smoke test for inquiry -> accept happy path once routes exist.

## Safe local helper checkpoint — 2026-07-07

- Added `MarketplaceInquiryDraft` and `validateAndNormalizeMarketplaceInquiryDraft` as local-only transaction utils.
- The helper normalizes only whitelisted primitive/id fields: `listingId`, `buyerProfileId`, `message`, optional proposed price/currency, and optional `buyerDestinationSummary`.
- Proposed price is optional; when either price or currency is provided, both must be valid and parse through the existing marketplace money util.
- Message is trimmed, required, and capped at 1000 characters.
- Arbitrary address snapshots, private notes, live-row timestamps, and other unknown fields are deliberately excluded from normalized output.

Remaining gates: schema/RLS/policy/migration/data changes, backend methods, UI/routes, notifications, deploy/release/push, and production-branch work all require explicit future approval.

## Safe latest-offer summary checkpoint — 2026-07-08

- Added `buildMarketplaceLatestOfferSummary` as a pure local helper for future counter-offer UI and transaction cards.
- The helper chooses agreed price for accepted/paid/shipped/received/closed states, otherwise the latest counter price when present, otherwise the original proposed price.
- Malformed latest counter/agreed price fields return `invalid_price` instead of silently falling back to an older offer.
- Output is a whitelisted descriptor only: availability, normalized minor amount/currency, source, label, optional awaiting actor, and whether the current actor can respond.
- Unknown/private fields such as address snapshots, internal notes, and raw message copy are not echoed.
- No schema/RLS/backend/UI/notification/deploy/release/push work was done.

## Risks and open questions

- Accepted state must not automatically reveal email/phone/shipping details. Add explicit reveal and later hide/revoke controls for private shipping details.
- No automatic stale inquiry timeout in MVP; use manual status changes only.
- Decide whether completed-sale price datapoints require opt-in at this stage.

## Coordinator-loop handoff

Implement after listing core MVP or bundle with it if the user wants a usable marketplace launch slice. Keep realtime chat
out until this structured transaction seed is stable.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Inquiry plan stores first contact as a transaction seed so lifecycle and chat can attach later.
- 2026-07-06T18:02+02:00 — Added safe local transaction state-transition and snapshot-summary helpers with specs; no schema/RLS/remote apply/UI/deploy was done.
- 2026-07-07T13:10+02:00 — Added a safe local buyer-inquiry draft normalization checkpoint; no schema/RLS/backend/UI/notification/deploy/release/push work was done.
- 2026-07-07T13:10+02:00 — Destination data stays as optional `buyerDestinationSummary` only; arbitrary private address snapshot objects are excluded until an approved snapshot contract exists.
- 2026-07-08T12:30+02:00 — Added the safe latest-offer summary helper and focused specs. Reviewer found the first pass could fall back from a malformed counter offer to an older proposal; fixed it so malformed latest offer data surfaces as `invalid_price`.
- 2026-07-08T14:13+02:00 — User decided private shipping/contact data must never be exposed automatically. Add explicit reveal controls for shipping details and allow the owner to hide/revoke visibility later if the transaction goes wrong.
- 2026-07-08T14:13+02:00 — User decided Marketplace MVP should not auto-cancel stale inquiries. Keep status changes manual unless a later workflow explicitly adds automation.
