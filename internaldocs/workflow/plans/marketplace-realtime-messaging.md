<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Realtime Messaging

## Status

Safe local helper checkpoints complete. Priority: MEDIUM. Product area: marketplace / realtime / moderation.

Latest checkpoint scope: pure TypeScript transaction thread preview/unread helpers only. No schema, RLS, policy, migration, data,
backend methods, realtime subscriptions, UI/routes, notifications, moderation workflow, deploy, release, push, or production-branch work.

## User intent

The marketplace should eventually feel realtime, with buyers and sellers able to coordinate around a sale without moving
all details into external chat.

## Product / roadmap fit

Realtime messaging is valuable, but it is riskier than structured inquiry because it creates moderation, abuse, and PII
surface area. It should be scoped to marketplace transactions, not profile-to-profile DMs.

## Current system analysis

- Product principles explicitly avoid turning Patcher into a generic social network.
- Comments exist as content-scoped community interaction, which is the right precedent.
- Supabase Realtime can power transaction-scoped channels once RLS is correct.

## Future strategy

Add realtime as a Wave 2 layer after structured transactions exist. Start with structured templates/cards rather than
free-form chat; conversations are anchored to transactions so every message has a listing, buyer, seller, status, and
moderation context.

## Goals

- Add transaction-scoped conversations.
- Add realtime message list/composer for buyer and seller.
- Support structured offer/info cards inside threads.
- Add unread counts and thread inbox.
- Add reporting and moderation hooks from day one.

## Non-goals

- No standalone DMs.
- No group chats.
- No typing indicators/read receipts in MVP.
- No file attachments in MVP.
- No payment-link automation.

## Assumptions

- Messaging becomes useful only after transactions exist.
- Free-form messages should not replace structured status transitions.
- Suspicious links/contact/payment handles should be flagged for moderation but not silently hidden without clear policy.

## Dependencies and sequencing

Depends on `marketplace-structured-inquiry-and-offers.md` and ideally `marketplace-transaction-lifecycle.md`. It can be
designed in parallel but should not ship before transaction-scoped RLS is proven.

## MVP layer

- [x] Add local message kind and draft validation helpers before persistence.
- [x] Require transaction ID and sender profile ID for every draft.
- [x] Require nonblank text body with a 2000-character limit; keep structured/status body optional.
- [x] Avoid structured payload serialization by returning only `hasStructuredPayload` and rejecting payloads on text messages.
- [x] Return repeated URL, off-platform payment, and external contact flags separately without blocking or hiding content.
- [x] Add local thread preview/unread helper before inbox persistence or routes.
- [ ] Propose and approve `conversations` and `messages` schema / RLS before migration work.
- [ ] Create one conversation per transaction.
- [ ] Add transaction thread route/pane with realtime updates for structured templates/cards first.
- [ ] Add message composer without explicit rate limits in MVP; revisit limits only if abuse appears.
- [ ] Add report-conversation action.
- [ ] Add retention behavior: keep message/card bodies for 1 year after transaction close, then scrub bodies while preserving status events.

## Structural layer

- [ ] Add unread counts and `/my/messages` inbox.
- [ ] Add structured cards: buyer offer, seller info, address summary, status transition notices.
- [ ] Persist and review moderation flags for repeated URLs, payment handles, crypto-wallet patterns, and off-platform contact spam only after moderation storage/admin approval.
- [ ] Add soft-delete / admin hide behavior.

## Polish layer

- [ ] Add mobile full-screen thread experience with bottom composer.
- [ ] Add desktop split-view from buyer/seller cockpits.
- [ ] Add notification digest settings.

## Proposed data model

Schema remains gated. The fields below are still proposal-only and require explicit approval before migrations, backend methods, or
realtime subscriptions.

`conversations`

- `id`
- `transaction_id`
- `created_at`

`messages`

- `id`
- `conversation_id`
- `sender_profileid`
- `body`
- `kind`
- `structured_payload`
- `created_at`
- `edited_at`
- `deleted_at`

## Proposed RLS (requires user approval)

- Conversation/message read only if `auth.uid()` is the buyer or seller on the parent transaction.
- Insert only by transaction participant.
- Realtime subscription must rely on the same participant read policy.
- Admin/moderator read requires explicit approval and a documented admin surface.

## Safe local helper checkpoint

Implemented files:

- `src/app/features/marketplace/marketplace-messaging.utils.ts`
- `src/app/features/marketplace/marketplace-messaging.utils.spec.ts`

Helper behavior:

- Defines supported kinds: `text`, `structured_offer`, `structured_info`, `status_notice`.
- Accepts `MarketplaceMessageDraft` with `transactionId`, `senderProfileId`, `body`, `kind`, and `structuredPayload`.
- Returns structured errors without throwing for missing/malformed values.
- Normalizes only whitelisted fields: `transactionId`, `senderProfileId`, `kind`, optional trimmed `body`, and
  `hasStructuredPayload`.
- Rejects non-null `structuredPayload` for `text` messages.
- Does not copy arbitrary structured payload objects; structured/status messages expose only `hasStructuredPayload`.
- Flags repeated URLs, off-platform payment handles/crypto-ish wallets, and external contact hints separately. Flags do not block
  otherwise valid messages and do not hide content.

## Safe thread preview helper checkpoint — 2026-07-08

- Added `buildMarketplaceMessageThreadPreview` as a pure local helper for future transaction inbox and unread rows.
- Requires a nonblank transaction id before a preview is available.
- Produces only whitelisted preview fields: transaction id, participant label, generic/trimmed last-message preview, message kind,
  optional timestamp, normalized unread count/label, and moderation flags.
- Text previews cheaply redact email addresses and phone-like contact strings before clipping to 120 characters.
- Structured/status messages use generic labels (`Structured offer`, `Shared info`, `Status update`) and never echo arbitrary payloads.
- Unread counts are normalized to nonnegative integers and capped to `99+` for display.
- No schema/RLS/realtime/backend/UI/moderation storage/notification/deploy/release/push work was done.

## Remaining approval gates

- **Schema/RLS/policy/migration/data:** blocked until conversations/messages design, participant policies, retention, and admin access are approved.
- **Realtime:** blocked until RLS leakage review proves subscriptions cannot expose other transactions.
- **Backend/data services:** blocked until schema/RLS approval and explicit backend method scope.
- **UI/routes/inbox:** blocked until UX placement approval for transaction thread, cockpits, and `/my/messages`.
- **Moderation/reporting:** blocked until flag storage, reporting artifacts, admin visibility, hide/delete policy, and rate limits are approved.
- **Notifications/deploy/release/push/production branch:** blocked until explicit user approval.

## File / surface map

- Future `/my/messages` route
- Buyer/seller cockpits from `marketplace-browse-detail-and-cockpits.md`
- Transaction schema from `marketplace-structured-inquiry-and-offers.md`
- Supabase Realtime integration in a marketplace data service
- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase-add.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/backend/database.types.ts`

## Acceptance criteria

- Buyer and seller can exchange messages only inside their transaction.
- Messages appear in realtime for both participants.
- Structured info cards remain visually distinct from plain text.
- Invalid users cannot read or subscribe to another transaction's thread.
- Reporting a conversation creates a moderation artifact.

## Validation strategy

- Unit tests for local message draft validation and suspicious-content flag helpers.
- Unit tests for thread data service and message mapping.
- Supabase service tests for conversation/message methods.
- RLS policy review before migration apply.
- E2E realtime smoke test with two authenticated sessions when test infra supports it.

## Validation results

- 2026-07-07T13:26+02:00 — `pnpm test-headless --include="**/marketplace-messaging.utils.spec.ts"` passed.
- 2026-07-07T13:27+02:00 — `node scripts/checks/check-docs.cjs` passed.
- 2026-07-07T13:27+02:00 — `git diff --check` passed.
- 2026-07-07T13:27+02:00 — `pnpm lint` passed.

## Risks and open questions

- MVP messaging starts with structured templates/cards; free-form chat is deferred until moderation/rate-limit policy is ready.
- No explicit message rate limit in MVP; revisit only if abuse appears.
- Keep message/card bodies for 1 year after transaction close, then scrub bodies while preserving status events.

## Coordinator-loop handoff

Only the safe local helper checkpoint may proceed without further approval. Do not implement schema/RLS/backend/realtime/UI/moderation
work before transaction-scoped inquiry exists and explicit approvals are captured. Involve bug-hunter/security review personas for RLS
and realtime subscription leakage risk.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Messaging scoped to transactions only to avoid generic DMs and keep moderation anchored.
- 2026-07-07T13:25+02:00 — Added safe local helper checkpoint for transaction-scoped message draft validation before conversations/messages schema or realtime work.
- 2026-07-07T13:25+02:00 — Chose `hasStructuredPayload` instead of serializing arbitrary payload objects; text messages reject non-null payloads.
- 2026-07-07T13:25+02:00 — Local repeated URL, off-platform payment, and external contact detections return moderation flags only and do not block otherwise valid messages.
- 2026-07-08T12:36+02:00 — Added the safe thread preview/unread helper and focused specs. Kept outputs private-safe and generic for structured/status messages so inbox preparation does not expose payload objects or require UI/schema decisions.
- 2026-07-08T14:30+02:00 — User chose structured Marketplace messaging templates/cards first. Defer free-form transaction chat until later moderation and rate-limit policy is ready.
- 2026-07-08T14:30+02:00 — User chose Marketplace message retention: keep message/card bodies for 1 year after transaction close, then scrub bodies while preserving transaction status events.
- 2026-07-08T14:30+02:00 — User chose no explicit Marketplace messaging rate limit for MVP. Do not add rate-limit backend/policy by default; revisit if abuse appears.
