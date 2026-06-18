<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Transaction Lifecycle

## Status

Backlog intake. Priority: HIGH. Product area: marketplace / operations / price hub feedback loop.

## User intent

Listings need management beyond "active/sold": proposed price, final selling price, shipped, received, closed, cancelled,
and eventually disputed states.

## Product / roadmap fit

Transaction lifecycle turns the marketplace from a listing board into a managed sale workflow. It also creates the cleanest
source of completed-sale price data for the Price Hub.

## Current system analysis

- Structured inquiry plan seeds transactions and event history.
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
- Feed anonymised completed-sale price datapoints into the Price Hub when permitted.
- Add dispute/admin hooks without building a full support suite in MVP.

## Non-goals

- No escrow or Stripe Connect.
- No automatic trust scoring in this task.
- No carrier integration or tracking API validation.
- No automatic mutation of `user_modules` on close.

## Assumptions

- Payment remains off-platform and seller/buyer-attested.
- The buyer should confirm received state.
- Auto-close from shipped must be conservative and notify the buyer first.

## Dependencies and sequencing

Depends on structured inquiry transactions. Can run before realtime messaging; in fact, lifecycle should be stable before
free-form chat to keep marketplace operations structured.

## MVP layer

- [ ] Define and test transition map: proposed -> negotiating -> accepted -> paid -> shipped -> received -> closed.
- [ ] Add terminal states: cancelled_by_buyer, cancelled_by_seller, cancelled_mutual, disputed.
- [ ] Add transition actions in buyer/seller cockpits.
- [ ] Add tracking/shipping note requirement for shipped state.
- [ ] Add event history render in transaction detail.

## Structural layer

- [ ] Add notification hooks for each meaningful transition.
- [ ] Add stale proposed inquiry auto-cancel workflow.
- [ ] Add conservative shipped auto-close workflow with buyer warnings.
- [ ] Add Price Hub emission for closed completed sales.
- [ ] Add admin filter for disputed transactions.

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
  -> paid
  -> shipped
  -> received
  -> closed

cancelled_by_buyer | cancelled_by_seller | cancelled_mutual | disputed
```

Every transition must create a `transaction_status_events` row. No app-only state changes.

## Proposed RLS (requires user approval)

- Participant-only read for transaction lifecycle data.
- Transition writes should be constrained by actor role and current status, ideally with an RPC or database-side guard.
- Admin-only dispute review access if an admin queue exists.
- Public aggregate Price Hub rows must be anonymised and decoupled from transaction IDs.

## File / surface map

- Buyer/seller cockpits from `marketplace-browse-detail-and-cockpits.md`
- Transaction schema from `marketplace-structured-inquiry-and-offers.md`
- Future notification infrastructure
- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/supabase-update.ts`
- `src/backend/database.types.ts`

## Acceptance criteria

- Buyer and seller see role-appropriate next actions for each state.
- Invalid transitions are blocked consistently.
- Event history reflects every transition.
- A closed completed sale can produce an anonymised price datapoint only through an approved path.
- Closing a sale does not silently remove the module from the seller's collection.

## Validation strategy

- Exhaustive unit tests for transition map and actor permissions.
- Supabase service tests for transition calls.
- E2E happy path: accepted -> paid -> shipped -> received -> closed.
- E2E cancellation/dispute smoke tests once admin surface exists.

## Risks and open questions

- Decide whether `paid` is seller-attested, buyer-attested, or both.
- Decide auto-cancel and auto-close timeouts.
- Decide Price Hub opt-in/opt-out model for completed-sale datapoints.
- Decide dispute moderation budget before public launch.

## Coordinator-loop handoff

Pick after structured inquiry exists. If implementation touches RLS or RPC guards, stop for user approval before applying
schema/policy migrations.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Transaction lifecycle planned as participant-attested because in-app payments/escrow remain out of scope.
