<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Listings Core and Media

## Status

Backend schema, RLS, private media storage, typed CRUD/query methods, helper checkpoints, private User Area `My listings`,
and public browse/detail/profile rendering are complete behind the Marketplace feature flag. Expiry, transaction reservation
hooks, and price guidance remain. Priority: HIGH. Product area: marketplace / listings / storage.

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
- A seller can have one active listing per module in MVP; multi-copy active sales are deferred until explicitly approved later.
- Images should be uploaded through app storage, not external-only URLs.
- MVP shipping scope uses structured region/country options plus a short seller notes field, not a fully free-text region blob.

## Dependencies and sequencing

Depends on stable public profile IDs and owner-scoped storage policies. It can run in parallel with address book and browse
UI as long as the listing read model is agreed early.

## MVP layer

- [x] Add pure local listing draft status/condition vocabulary and validation/normalization helper.
- [x] Add co-located specs for draft normalization, invalid fields, JPY parsing, malformed optional fields, output whitelisting, and shipping option de-dupe.
- [x] Add pure local listing media validation/order guardrails for future image uploads.
- [x] Propose and approve `marketplace_listings`, `listing_media`, storage bucket, and RLS.
- [x] Add listing create/edit methods through `SupabaseService`.
- [x] Add inline listing form from `SELLS` module context.
- [x] Add listing media upload/delete/reorder for images.
- [x] Add active listing public read query with explicit columns.
- [x] Add seller-only draft/paused/closed read query.

## Structural layer

- [ ] Add listing expiry / renew flow.
- [ ] Add reserved status hook for accepted transactions.
- [ ] Defer listing anti-abuse heuristics beyond light MVP guardrails unless abuse signals appear.
- [ ] Defer admin/moderation hooks for flagged listings until report/moderation scope is explicitly picked up.

## Polish layer

- [ ] Add "price guidance" from Price Hub on the listing form.
- [x] Add pure duplicate listing warning helper if the seller already has an open listing for the module.
- [x] Wire duplicate listing warning into the listing form UI.
- [x] Add copy that explains collection state is not automatically changed when a listing closes.

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

## Safe local helper checkpoint

Completed first as a no-backend checkpoint:

- `src/app/features/marketplace/marketplace-listing.utils.ts` defines MVP listing statuses and conditions.
- `validateAndNormalizeMarketplaceListingDraft` returns a whitelisted normalized listing object or `{ valid: false, errors }`.
- The helper trims text, enforces max title/description lengths, normalizes currency/country, parses prices through the existing money util, validates http(s) external links, and dedupes shipping options.
- Unknown/private/live-row fields are excluded from normalized output, and malformed optional fields do not throw.
- `getMarketplaceDuplicateListingWarning` inspects whitelisted plain listing rows and returns a private-safe warning only for same-seller `active`, `reserved`, `paused`, or `draft` duplicates.
- Closed sold, closed unsold, and expired listings remain non-blocking for the future form flow.
- `normalizeMarketplaceListingMediaDrafts` keeps future upload media image-only, caps drafts at 8 images, reports size/MIME/URL/order errors, normalizes positions without backend writes, accepts only Patcher image proxy URLs, and dedupes by stable id/url before filename-only fallback drafts.

## Remaining approval gates

Approval status:

- Approved: Supabase schema/RLS/policy/migration work for the address book + listings foundation.
- Approved: Listing media storage bucket/path/upload/delete/reorder behavior.
- Approved: `SupabaseService` listing CRUD/read methods and cache behavior.
- Approved: User Area marketplace entry plus listing CTAs from Marketplace pages.
- Still gated: deploy, release, push, or production-branch work.
- Deploy, release, push, or production-branch work.

## Validation strategy

- `pnpm test-headless --include="**/marketplace-listing.utils.spec.ts"` for the local helper checkpoint.
- Supabase service tests for listing CRUD, explicit column selection, and cache busting.
- Component tests for inline form validation and media ordering.
- Storage tests or integration smoke test for upload/delete path.
- `pnpm lint` and targeted marketplace tests.

## Validation results

- 2026-07-07T13:01+02:00 — `pnpm test-headless --include="**/marketplace-listing.utils.spec.ts"` passed.
- 2026-07-07T13:01+02:00 — `node scripts/checks/check-docs.cjs` passed.
- 2026-07-07T13:01+02:00 — `git diff --check` passed.
- 2026-07-07T13:02+02:00 — `pnpm lint` passed.
- 2026-07-07T21:39+02:00 — `pnpm test-headless --include="**/marketplace-listing.utils.spec.ts"` passed for duplicate warning helper coverage.
- 2026-07-07T21:40+02:00 — `node scripts/checks/check-docs.cjs` passed.
- 2026-07-07T21:40+02:00 — `git diff --check` passed.
- 2026-07-07T21:40+02:00 — `pnpm lint` passed.
- 2026-07-08T12:49+02:00 — `pnpm test-headless --include="**/marketplace-listing.utils.spec.ts"` passed for media guardrail helper coverage.
- 2026-07-08T14:13+02:00 — User decided active marketplace listings do not require at least one image in the MVP. Future listing form validation should allow text-only active listings while keeping image uploads optional/recommended.
- 2026-07-08T14:13+02:00 — User chose structured region/country shipping options with a short free-text notes field for Marketplace listing MVP shipping scope.
- 2026-07-08T14:13+02:00 — User chose light Marketplace listing MVP anti-abuse only: validation, duplicate warning, seller ownership checks, and report hooks later. Do not add moderation/admin infrastructure in the first listing slice by default.
- 2026-07-08T14:13+02:00 — User confirmed Marketplace MVP should enforce one active listing per seller/module. Multi-copy active listings are out of scope unless explicitly approved later.
- 2026-07-17 — Focused migration checks, 89 targeted Angular specs, application TypeScript no-emit, repository lint/docs checks, and `git diff --check` passed for the backend foundation.
- 2026-07-17 — Remote security advisors report no Marketplace findings after policy reconciliation. Performance advisors report only expected unused-index notices for the new empty listing tables.
- 2026-07-17 — `pnpm updateBackendTypes` could not run because the local Docker daemon was unavailable at `/var/run/docker.sock`; Supabase MCP type generation was used as the remote fallback and reconciled manually.
- 2026-07-17T16:40+02:00 — `pnpm test-headless --include="**/user-listings*.spec.ts" --include="**/user-area-root*.spec.ts" --include="**/user-modules*.spec.ts" --include="**/marketplace-listing.utils.spec.ts" --include="**/marketplace-listings.spec.ts"` passed (101 specs) for the private listing editor, user-area layout/root/module regressions, listing helpers, and backend compatibility.
- 2026-07-17T16:35+02:00 — `pnpm exec tsc -p src/tsconfig.app.json --noEmit`, `node scripts/checks/check-docs.cjs`, `git diff --check`, and `pnpm lint` passed after listing UI/docs updates.

## Risks and open questions

- Active listings may be text-only in the MVP; images are recommended but not required to publish.
- MVP shipping scope uses structured region/country options plus a short seller notes field.
- MVP anti-abuse scope is light guardrails only: validation, duplicate warning, seller ownership checks, and report hooks later.
- Decide whether external contact links are allowed before accepted transaction state.

## Coordinator-loop handoff

Start after schema/RLS approval. Keep transaction/status logic out unless `marketplace-structured-inquiry-and-offers.md`
is intentionally bundled into the same implementation cycle.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Listing plan uses canonical module links and separate media rows to preserve moderation/order flexibility.
- 2026-07-07T13:00+02:00 — Added a pure local helper checkpoint for listing draft validation/normalization. It reuses the existing money util for currency parsing, returns normalized whitelisted output or field errors, and keeps schema/RLS/storage/backend/UI work behind approval gates.
- 2026-07-07T14:07+02:00 — User approved the Marketplace address book + listings foundation first, including additive schema/RLS/storage/backend work. First UI entry should live in a User Area marketplace section, with listing CTAs also appearing from Marketplace pages.
- 2026-07-07T21:39+02:00 — Added a helper-only duplicate listing warning contract that treats `active`, `reserved`, `paused`, and `draft` same-seller listings as blocking, while keeping closed/expired listings non-blocking and excluding seller private fields from output.
- 2026-07-08T12:49+02:00 — Added a helper-only media guardrail contract. Media drafts accept only image MIME types and Patcher image-proxy URLs, cap at 8 ordered images, keep storage writes/schema/UI gated, and avoid filename-only dedupe when stable id/url identity is present.
- 2026-07-17 — Applied the additive listings/media foundation to the authorized Patcher Supabase project after read-only preflight and independent SQL/security approval. Public reads require `active` or `reserved` listing state plus an existing public seller profile; module visibility is deliberately not an authorization boundary.
- 2026-07-17 — Concurrent Marketplace migrations created overlapping policies during the apply window. Applied a reviewed Marketplace-only reconciliation that consolidated role-specific SELECT policies, moved policy helpers to the non-exposed `private` schema, and removed the superseded listing index without changing the pre-existing modules UPDATE policy.
- 2026-07-17 — Generated remote database types were reconciled narrowly: listing tables and the public reorder RPC were added while local-only Manufacturer Accounts M1, Cool reactions, shipping-address definitions, and database-default insert optionality were preserved.
- 2026-07-17 — Final diff review found missing SELLS checks on media creation/update/reorder and a reorder race. A fresh independent security review approved the Marketplace-only hardening migration; it now coordinates inserts/reorders through the listing advisory lock, row-locks current media against deletes, and preserves owner-only cleanup deletion after SELLS removal.
- 2026-07-17 — Reconciled the four exact migrations from the independently completed stale-base worker into local history using their live migration versions, without replaying them remotely. Read-only trigger inspection found its legacy SECURITY DEFINER direct `storage.objects` delete still active; a separately reviewed cleanup removed only that trigger/function so media deletion remains Storage-API-first.
- 2026-07-17T16:27+02:00 — Added the approved private User Area `My listings` section before the address book. It loads only current-user SELLS modules and seller-owned listings, keeps create/edit/lifecycle/media actions inline with global action locking, allows text-only active listings, preserves saved drafts across media partial failures, and maps shipping notes to the dedicated `shipping_notes` listing field.
- 2026-07-17T16:35+02:00 — Reviewer findings were fixed before checkpoint: partial media retries now retain only failed files, failed media-row creation cleans up its uploaded storage object, and delete/reorder refresh failures preserve an optimistic post-mutation media state.
- 2026-07-17T17:40+02:00 — Added a public-safe seller-profile listing read for profile `For sale` sections. It reuses explicit active/reserved listing columns and existing listing cache busting, filters by `seller_profileid` server-side, and does not expose address or transaction payloads.
