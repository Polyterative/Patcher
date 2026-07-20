<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Transaction Lifecycle

## Status

Safe timeline descriptor helper checkpoint completed. Priority: HIGH. Product area: marketplace / operations / price hub feedback loop.

## User intent

Listings need management beyond "active/sold": proposed price, final selling price, shipped, received, closed, cancelled,
and eventually disputed states.

## Product / roadmap fit

Transaction lifecycle turns the marketplace from a listing board into a managed sale workflow. It also creates the cleanest
source of completed-sale price data for the Price Hub.

## Current system analysis

- Structured inquiry plan seeds transactions and event history.
- Safe local helper checkpoint now defines role/action transition behavior and future buyer/seller next-action chip descriptors without persistence, UI, notifications, or Price Hub writes.
- Listing core can reserve or close listings but should not own the whole sale state machine.
- Product principles reject social-status loops and privacy leakage; lifecycle data must be participant-only except for
  anonymised aggregate outputs.

## Future strategy

Make lifecycle transitions explicit, auditable, and user-attested. Because Patcher will not process payments in this scope,
states like `paid` are claims by participants, not system-verified financial facts.

## Goals

- Add full transaction state machine after structured inquiry MVP.
- Track every state transition in append-only events.
- Drive buyer/seller cockpit statuses and notifications from transaction state.
- Defer completed-sale Price Hub datapoints beyond MVP; transaction prices remain private workflow data for now.
- Make disputes user-visible as participant responsibility only; Patcher does not become an admin/arbiter in the transaction.

## Non-goals

- No escrow or Stripe Connect.
- No automatic trust scoring in this task.
- No carrier integration or tracking API validation.
- No automatic mutation of `user_modules` on close.

## Assumptions

- Payment remains off-platform and two-step attested: buyer marks paid, then seller confirms payment received before shipping can proceed.
- The buyer should confirm received state.
- No automatic cancel/close workflow in MVP; transaction status changes remain manual unless a later workflow explicitly adds automation.
- Private shipping/contact details are never revealed automatically by a status transition; a participant must explicitly reveal them and must be able to hide/revoke them later.

## Dependencies and sequencing

Depends on structured inquiry transactions. Can run before realtime messaging; in fact, lifecycle should be stable before
free-form chat to keep marketplace operations structured.

## MVP layer

- [x] Define and test local transition map: proposed -> negotiating -> accepted -> paid -> shipped -> received -> closed.
- [ ] Update future persisted/backend transition guards so seller shipping requires seller payment-received confirmation after buyer marks paid.
- [x] Add local terminal states: cancelled_by_buyer, cancelled_by_seller, cancelled_mutual, disputed.
- [ ] Add transition actions in buyer/seller cockpits.
- [x] Add local tracking/shipping note requirement for shipped state.
- [x] Add local event-history timeline descriptors for future transaction detail rendering.
- [ ] Render persisted event history in transaction detail after schema/backend/UI approval.

## Structural layer

- [ ] Add notification hooks for each meaningful transition.
- [ ] Defer stale proposed inquiry auto-cancel workflow; MVP uses manual status changes only.
- [ ] Defer shipped auto-close workflow; MVP uses manual status changes only.
- [ ] Defer Price Hub emission for closed completed sales beyond MVP.
- [ ] Do not add admin dispute participation; feedback/profile reputation systems handle trust signals later.

## Polish layer

- [ ] Add timeline visualization in transaction detail.
- [ ] Add "remove from collection?" post-sale prompt that requires user confirmation.
- [ ] Add seller/buyer next-action chips in cockpit rows.

## State model

Recommended state sequence:

```text
proposed
  -> negotiating
  -> accepted
  -> paid (buyer-attested)
  -> payment_confirmed (seller-attested)
  -> shipped
  -> received
  -> closed

cancelled_by_buyer | cancelled_by_seller | cancelled_mutual | disputed
```

Every persisted transition must create a `transaction_status_events` row. No app-only persisted state changes. The current checkpoint is local-only helper logic and does not write events yet.

## Safe local helper checkpoint

Implemented in `src/app/features/marketplace/marketplace-transaction.utils.ts` with co-located tests only.

- Defines the lifecycle status/action vocabulary locally, including paid/shipped/received/closed and terminal cancellation/dispute states.
- Adds `transitionMarketplaceTransactionStatus(currentStatus, actorRole, action, context)` returning `{ ok: true, nextStatus }` or `{ ok: false, code, message }`; malformed inputs do not throw.
- Keeps legacy `getMarketplaceTransactionNextStatus` / `canMarketplaceTransactionTransition` wrappers around the role-aware helper where possible.
- Requires a nonblank `shippingNote` or `trackingNote` before `seller_mark_shipped` can move a paid transaction to shipped.
- Treats `closed`, cancellation statuses, and `disputed` as terminal until an approved backend/admin flow exists.

## Safe next-action chip helper checkpoint

Implemented in `src/app/features/marketplace/marketplace-transaction.utils.ts` with co-located tests only.

- [x] Add `getMarketplaceTransactionNextActionChips(currentStatus, actorRole, context)` for future buyer/seller cockpit rows.
- [x] Derive descriptors from the existing role-aware transition helper rather than duplicating transition outcomes.
- [x] Return only whitelisted descriptor fields: stable `action`, `label`, `tone`, immediate `nextStatus`, and blocked `disabled` / `reason` when applicable.
- [x] Keep seller `seller_mark_shipped` visible but disabled until a nonblank shipping or tracking note exists.
- [x] Return an empty deterministic list for invalid actor/status inputs and terminal states.
- [x] Avoid private transaction, address, shipping, tracking, or internal-note data in descriptor output.

## Safe timeline descriptor helper checkpoint — 2026-07-08

Implemented in `src/app/features/marketplace/marketplace-transaction.utils.ts` with co-located tests only.

- [x] Add `buildMarketplaceTransactionTimelineItem(input)` for future event-history rows.
- [x] Add `buildMarketplaceTransactionTimeline(inputs)` for deterministic local mapping.
- [x] Return only whitelisted descriptor fields: status, label, tone, terminal, optional actor role, and optional timestamp.
- [x] Mark cancellation/dispute states as terminal danger events; normal progression remains primary/neutral.
- [x] Reject malformed status/actor/action values with unavailable descriptors instead of throwing.
- [x] Avoid private note, shipping, tracking, address, raw error, or unknown-field data in descriptor output.

## Approval gates remaining

- Schema, RLS, policies, migrations, data backfills, RPCs, and backend methods require explicit approval before implementation.
- UI/routes/cockpit actions and notification hooks require data-model and UX placement approval.
- Price Hub writes from completed sales are out of MVP scope.
- Deployment, release, push, and production-branch work remain out of scope for this checkpoint.

## Proposed RLS (requires user approval)

- Participant-only read for transaction lifecycle data.
- Transition writes should be constrained by actor role and current status, ideally with an RPC or database-side guard.
- No admin dispute review access in MVP; Patcher is a platform and does not arbitrate user contracts.
- Future public aggregate Price Hub rows, if later approved, must be anonymised and decoupled from transaction IDs.

## File / surface map

- Buyer/seller cockpits from `marketplace-browse-detail-and-cockpits.md`
- Transaction schema from `marketplace-structured-inquiry-and-offers.md`
- Future notification infrastructure
- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/supabase-update.ts`
- `src/backend/database.types.ts`

## Acceptance criteria

- Local helper returns role-appropriate next statuses or structured errors for each state/action pair.
- Buyer and seller see role-appropriate next actions for each state once UI is approved.
- Invalid transitions are blocked consistently.
- Event history reflects every transition.
- A closed completed sale does not produce a Price Hub datapoint in MVP.
- Closing a sale does not silently remove the module from the seller's collection.
- Shipping/contact detail visibility is controlled by explicit reveal and hide/revoke actions, not inferred from transaction status alone.

## Validation strategy

- [x] Exhaustive-ish unit tests for local transition map and actor permissions.
- Supabase service tests for transition calls.
- E2E happy path: accepted -> paid -> shipped -> received -> closed.
- E2E cancellation/dispute smoke tests once user-facing dispute states exist.

## Validation results

- 2026-07-07T13:17+02:00 — `pnpm test-headless --include="**/marketplace-transaction.utils.spec.ts"` passed.
- 2026-07-07T13:18+02:00 — `node scripts/checks/check-docs.cjs` passed.
- 2026-07-07T13:18+02:00 — `git diff --check` passed.
- 2026-07-07T13:18+02:00 — `pnpm lint` passed.
- 2026-07-07T21:36+02:00 — `pnpm test-headless --include="**/marketplace-transaction.utils.spec.ts"` passed for next-action chip helper coverage.
- 2026-07-07T21:36+02:00 — `node scripts/checks/check-docs.cjs` passed.
- 2026-07-07T21:36+02:00 — `pnpm lint` passed.
- 2026-07-08T12:41+02:00 — `pnpm test-headless --include="**/marketplace-transaction.utils.spec.ts"` passed for timeline descriptor and latest-offer helper coverage.

## Risks and open questions

- Model both payment attestations: buyer marks paid, then seller confirms payment received before shipping.
- No automatic cancel/close timeouts in MVP; use manual status changes only.
- Completed Marketplace sale prices do not feed Price Hub in MVP.
- No admin dispute moderation in Marketplace MVP; make user responsibility/platform limits clear.

## Coordinator-loop handoff

Safe local helper checkpoint can proceed without backend approval. If future implementation touches RLS, RPC guards, schema, policies, backend methods, UI, notifications, or Price Hub writes, stop for explicit user approval before applying changes.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Transaction lifecycle planned as participant-attested because in-app payments/escrow remain out of scope.
- 2026-07-07T13:15+02:00 — Safe local helper checkpoint started for lifecycle transitions only; schema/RLS/backend/UI/notifications/Price Hub remain gated.
- 2026-07-07T13:15+02:00 — `buyer_mark_paid` is buyer-attested locally because Patcher does not verify off-platform payment in this scope.
- 2026-07-07T13:15+02:00 — `disputed` remains terminal locally until an approved admin/dispute workflow exists.
- 2026-07-07T21:36+02:00 — Next-action chip helper descriptors reuse the transition helper and expose a generic shipping-note block reason instead of carrying note, tracking, address, or internal transaction data.
- 2026-07-08T12:41+02:00 — Added safe local timeline descriptors for future transaction detail event history. This prepares display contracts only; persisted event rows, transaction detail UI, notifications, and Price Hub writes remain gated.
- 2026-07-08T14:13+02:00 — User decided transaction status must not automatically reveal private shipping/contact details. Future lifecycle work needs explicit reveal and hide/revoke actions for shipping details.
- 2026-07-08T14:13+02:00 — User chose two-step payment attestation for Marketplace transactions: buyer marks paid, then seller confirms payment received before shipping is allowed.
- 2026-07-08T14:13+02:00 — User decided Marketplace MVP should not auto-cancel stale inquiries or auto-close shipped transactions. Keep lifecycle status changes manual by default.
- 2026-07-08T14:13+02:00 — User decided completed Marketplace sale prices should not feed Price Hub in MVP. Do not add Price Hub write paths or consent UI for completed sale datapoints in the first lifecycle implementation.
- 2026-07-08T14:13+02:00 — User clarified Patcher will not arbitrate Marketplace transactions and admin will never be part of the transaction. Future dispute UX should state that contracts are between users, with feedback/profile reputation handling trust signals later.
