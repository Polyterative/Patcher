<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Realtime Messaging

## Status

Backlog intake. Priority: MEDIUM. Product area: marketplace / realtime / moderation.

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

Add realtime as a Wave 2 layer after structured transactions exist. Conversations are anchored to transactions so every
message has a listing, buyer, seller, status, and moderation context.

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

- [ ] Propose and approve `conversations` and `messages` schema / RLS before migration work.
- [ ] Create one conversation per transaction.
- [ ] Add transaction thread route/pane with realtime updates.
- [ ] Add message composer with rate limits.
- [ ] Add report-conversation action.

## Structural layer

- [ ] Add unread counts and `/my/messages` inbox.
- [ ] Add structured cards: buyer offer, seller info, address summary, status transition notices.
- [ ] Add moderation flags for repeated URLs, payment handles, crypto-wallet patterns, and off-platform contact spam.
- [ ] Add soft-delete / admin hide behavior.

## Polish layer

- [ ] Add mobile full-screen thread experience with bottom composer.
- [ ] Add desktop split-view from buyer/seller cockpits.
- [ ] Add notification digest settings.

## Proposed data model

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

- Unit tests for thread data service and message mapping.
- Supabase service tests for conversation/message methods.
- RLS policy review before migration apply.
- E2E realtime smoke test with two authenticated sessions when test infra supports it.

## Risks and open questions

- Moderation budget may require delaying free-form chat or limiting early messages to structured templates.
- Need rate-limit mechanism outside pure client code.
- Need retention/deletion policy for messages under account deletion and disputes.

## Coordinator-loop handoff

Do not implement before transaction-scoped inquiry exists. Involve bug-hunter/security review personas for RLS and realtime
subscription leakage risk.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Messaging scoped to transactions only to avoid generic DMs and keep moderation anchored.
