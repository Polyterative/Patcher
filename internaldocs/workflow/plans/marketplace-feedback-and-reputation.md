<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Marketplace — Feedback and Reputation

## Status

Backlog intake. Priority: MEDIUM. Product area: marketplace / trust / public profiles.

## User intent

The marketplace needs feedback management and a reputation system that uses transaction outcomes plus trustworthy account
activity signals such as account age and constructive contribution history.

## Product / roadmap fit

This extends the existing trust-tier philosophy without turning Patcher into a status game. Reputation should help buyers
judge risk, not create leaderboards or creator loops.

## Current system analysis

- Product principles allow trust tiers for UGC and reject leaderboards, streaks, and profile-ranking mechanics.
- Public profiles can display contributor stats and will be the natural identity surface for seller trust.
- Transaction lifecycle is needed before feedback is meaningful.

## Future strategy

Use bounded trust signals instead of a single public score. Display context where users need it: listing cards, listing
detail, seller profile, and transaction prompts. Do not build a public reputation dashboard.

## Goals

- Add feedback only for completed transactions.
- Use positive / neutral / negative sentiment, not 1-5 star ratings.
- Aggregate trust signals from completed sales, purchases, disputes, account age, and approved contributions.
- Prevent easy retaliation and sockpuppet inflation.
- Show seller trust inline on marketplace surfaces.

## Non-goals

- No public leaderboard.
- No follow/friend graph.
- No open-ended profile wall comments.
- No feedback before transaction volume exists.
- No opaque numeric "seller score" in MVP.

## Assumptions

- Feedback should launch after enough transactions exist to make it useful.
- Buyer and seller should both be able to leave feedback.
- Feedback text needs moderation hooks.

## Dependencies and sequencing

Depends on closed transactions from `marketplace-transaction-lifecycle.md`. It can be designed in parallel but should not
ship with marketplace MVP unless moderation and anti-abuse rules are also ready.

## MVP layer

- [ ] Propose and approve `transaction_feedback` schema / RLS before migration work.
- [ ] Add post-close feedback prompt in buyer/seller cockpit rows.
- [ ] Add sentiment-only feedback with optional short note.
- [ ] Add feedback visibility rule: show after both submit or after feedback window expires.
- [ ] Add seller trust summary on listing detail.

## Structural layer

- [ ] Add `profile_trust_signals` view or query aggregation.
- [ ] Add contribution signals: account age, approved module submissions, approved price reports, completed sales/purchases.
- [ ] Add anti-abuse caps for repeated same-pair feedback.
- [ ] Add dispute-aware reputation display.
- [ ] Add moderation queue integration for feedback text.

## Polish layer

- [ ] Add public profile feedback tab with bounded transaction feedback.
- [ ] Add "new seller" neutral trust band that calibrates risk without shaming.
- [ ] Add explanatory methodology copy for trust chips.

## Proposed data model

`transaction_feedback`

- `id`
- `transaction_id`
- `giver_profileid`
- `receiver_profileid`
- `sentiment`
- `body`
- `created_at`

`profile_trust_signals` should be a view/query, not a manually maintained reputation table, at least for the first pass.

## Proposed RLS (requires user approval)

- Feedback insert only by transaction participant after transaction is closed.
- Feedback read follows visibility window / two-sided release rule.
- Feedback body moderation may require admin-only read/update paths.
- Aggregate trust signals public-safe only; no private transaction detail leakage.

## Anti-abuse rules

- Feedback window: 30 days after close.
- Two-sided release: hidden until both parties submit or the window expires.
- Same giver/receiver pair capped over a rolling period to limit self-boosting.
- New accounts show a neutral "new seller" band instead of a negative mark.
- Disputes are represented as bounded flags, not a punitive score.
- Username/reputation portability needs a rule once a user completes their first transaction.

## File / surface map

- Buyer/seller cockpits from `marketplace-browse-detail-and-cockpits.md`
- Public profile route
- Listing card/detail trust chips
- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase-add.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/backend/database.types.ts`

## Acceptance criteria

- Feedback can only be created for closed transactions.
- Feedback cannot be used for generic profile comments.
- Listing surfaces show concise trust context without a public score leaderboard.
- Aggregate trust signals do not expose private transaction details.

## Validation strategy

- Unit tests for feedback eligibility and visibility windows.
- Supabase service tests for feedback creation/query paths.
- Component tests for listing trust chips and feedback prompts.
- Abuse-case tests for same-pair caps and non-participant access where possible.

## Risks and open questions

- Decide feedback body length and moderation policy.
- Decide whether feedback is visible to anonymous visitors or authenticated users only.
- Decide username change lock or reputation continuity rule after first completed transaction.
- Decide which contribution stats are public-safe in v1.

## Coordinator-loop handoff

Do not implement before transaction lifecycle has closed-sale data. Involve advisor/reviewer personas for anti-abuse and
privacy review before schema approval.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Reputation planned as bounded trust context, not stars, scores, or social-status loops.
