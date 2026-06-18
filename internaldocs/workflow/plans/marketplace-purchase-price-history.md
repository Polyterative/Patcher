<!-- Section: PRODUCT — Tier 0 (ship in any order; no external dependencies) -->

# Marketplace — Purchase Price History

## Status

Planning approved — no-schema money-helper foundation implemented; detailed strategic planning for schema/RLS/currency/edit policy is approved. Implementation remains gated: do not draft/apply migrations, policies, backend methods, or schema changes until the detailed plan is shown to and approved by the product owner. Priority: HIGH. Product area: marketplace / price hub foundation.
This can ship before public profiles because it is private collection metadata with immediate solo-tool value.

## User intent

When a user adds a module to their collection, let them optionally record what they paid so Patcher can become a useful
personal cost tracker now and a market price reference over time.

## Product / roadmap fit

This is the lowest-risk market-layer primitive: it strengthens the solo collection workflow while preparing the Price Hub
and completed-sale data loop. It must respect the product principle that collections track membership, not quantity; price
history is a separate acquisition ledger, not another property on the collection row.

## Current system analysis

- `user_modules.kind` already distinguishes `HAS`, `WANTS`, and `SELLS`.
- The current module possession UI already lets users mark modules owned / wanted / for sale.
- Existing backend access must stay behind `SupabaseService`; new tables must be registered in `DatabaseStrings.ts`.
- Existing module collection logic treats ownership as boolean membership; no quantity or multi-copy concept should leak
  into this feature.

## Future strategy

Store user-acquisition events as append-only-ish rows so the same data can later answer:

- "What did I pay for this module?"
- "How has my collection value changed?"
- "How does my cost compare with current market asking prices?"
- "Can completed marketplace transactions produce anonymised price datapoints?"

## Goals

- Add an optional price-paid capture when a module transitions to `HAS`.
- Let users add / edit / remove their own acquisition rows from a private collection detail surface.
- Store amount as integer minor units plus ISO currency code; never store money as floats.
- Preserve module membership semantics: acquisition rows do not imply current ownership.
- Keep all rows owner-only until a later explicit aggregation path exists.

## Non-goals

- No public price reports in this task.
- No current collection valuation dashboard in MVP.
- No support for "I own three copies" or per-copy inventory.
- No automatic listing or sale status changes.

## Assumptions

- A user may want to record acquisition cost for a module they later sell or remove from the collection.
- The first capture point is optional and inline; empty input should not create an acquisition row.
- Historical rows can feed aggregate price insights later only after privacy and attribution decisions are made.

## Dependencies and sequencing

This work can run independently of the rest of the marketplace program. It should land before listing / transaction work
because it proves the money-value type, currency handling, UI copy, and owner-only RLS shape in a lower-risk context.

## MVP layer

- [x] No-schema foundation: add import-safe helpers for normalizing currency, parsing user-entered prices into integer minor
      units, and formatting integer minor-unit values for display.
- [~] Draft detailed strategic plan for `user_module_acquisitions` schema, owner-only RLS, MVP currency policy, and acquisition edit/delete policy; show it for product-owner approval before any migration/policy draft or implementation.
- [ ] Add optional price-paid fields to the add-to-collection / possession transition flow.
- [ ] Create owner-only backend methods for acquisition rows.
- [ ] Show latest acquisition price in the user's module collection detail context.
- [x] Validate currency and integer minor-unit conversion with unit tests.

## Structural layer

- [ ] Add acquisition history list / edit surface for the current user.
- [ ] Support source labels: new, used, gift, trade, marketplace, unknown.
- [ ] Add import-safe helpers for normalizing currency and display formatting.
- [ ] Prepare a private aggregate query for "total known acquisition spend" without exposing it publicly.

## Polish layer

- [ ] Add "your cost vs current asking price" copy once Price Hub data exists.
- [ ] Add gentle explanation that private price data may later contribute to aggregate market insight only if explicitly
      enabled.
- [ ] Add empty states for users who own modules but have not recorded prices.

## Planning-only approval

Product owner approved the detailed strategic planning phase on 2026-06-18T21:00+02:00 for:

- `user_module_acquisitions` schema strategy.
- Owner-only RLS strategy.
- MVP currency policy.
- Acquisition edit/delete policy.

This approval is **planning-only**. Do not implement, draft, or apply migrations/RLS/backend/schema changes until the detailed plan is shown and explicitly approved.

## Proposed data model

`user_module_acquisitions`

- `id`
- `profileid`
- `moduleid`
- `acquired_at`
- `price_amount_minor`
- `currency`
- `source`
- `note`
- `created_at`
- `updated_at`

Do not put `price_paid` directly on `user_modules`; that would collapse history into one mutable number and block future
completed-sale / re-acquisition workflows.

## Proposed RLS (requires user approval)

- Owner-only `select`, `insert`, `update`, and `delete` by `profileid = auth.uid()`.
- No public reads.
- No aggregation into public Price Hub without a separate approved plan.

## File / surface map

- `src/app/components/module-parts/module-possession-dialog/`
- `src/app/components/module-parts/module-detail-data.service.ts`
- `src/app/features/routes/user-area/user-modules/`
- `src/app/features/backend/DatabaseStrings.ts`
- `src/app/features/backend/supabase-add.ts`
- `src/app/features/backend/supabase-get.ts`
- `src/app/features/backend/supabase-update.ts`
- `src/backend/database.types.ts`

## Acceptance criteria

- A user can add a module to owned collection without entering a price.
- A user can optionally enter price + currency during or immediately after that transition.
- Only the owner can read or edit the acquisition data.
- The collection still behaves as membership-only for racks, patches, and collection-aware features.

## Validation strategy

- Unit tests for money parsing / formatting helpers.
- Supabase service tests for new owner-only methods and cache busting.
- Targeted component tests for optional input and no-row-created empty state.
- `pnpm lint` and targeted `pnpm test-headless --include="**/*marketplace*.spec.ts"` once implementation exists.

## Risks and open questions

- Decide the supported currency set for MVP.
- Decide whether older acquisition rows are editable forever or locked after a short correction window.
- Decide if private acquisition rows ever contribute to public aggregates; default should be no.

## Approval queue

- **Planning phase approved 2026-06-18T21:00+02:00.** Prepare the detailed schema/RLS/currency/edit-policy plan, but do not draft/apply migrations, policies, backend methods, or schema changes until the plan is shown and approved.
- **Implementation approval still required.** The exact SQL, policies, backend methods, cache busting, and generated type updates remain blocked until separate product-owner approval.
- **Confirm MVP currency policy.** Default recommendation: accept ISO 4217 currency codes, normalize to uppercase, and start
  with common currencies (`EUR`, `USD`, `GBP`, `CHF`, `JPY`, `CAD`, `AUD`) in UI suggestions while the helper remains
  generic.
- **Confirm acquisition edit policy.** Default recommendation: allow owner edits/deletes indefinitely for MVP because rows are
  private self-tracking data, then revisit locking only if rows feed public aggregate market data.

## Coordinator-loop handoff

Start here before any other marketplace item if the user wants early market-value progress without public-profile or PII
dependencies. Stop before any migration/RLS work until the user approves the proposed schema and policies.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Intake split purchase-price history from public marketplace because it delivers solo value and avoids profile/chat/address dependencies.
- 2026-06-18T20:28+02:00 — Selected a no-schema money-helper foundation slice while schema/RLS work remains gated; this unblocks parsing/formatting tests without touching backend state or real user data.
- 2026-06-18T20:30+02:00 — Completed the import-safe money-helper foundation with targeted tests for normalization, decimal parsing, separator handling, JPY zero-decimal behavior, and display fallbacks.
- 2026-06-18T20:34+02:00 — Parked the remaining MVP steps on explicit schema/RLS approval; no backend methods, migrations, policies, or real data mutations were attempted.
- 2026-06-18T21:00+02:00 — Product owner approved the planning-only phase for detailed schema/RLS/currency/edit-policy strategy; implementation remains blocked until the plan is shown and separately approved, and no migrations/policies should be drafted or applied yet.
