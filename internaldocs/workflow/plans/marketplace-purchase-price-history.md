<!-- Section: PRODUCT — Tier 0 (ship in any order; no external dependencies) -->

# Marketplace — Purchase Price History

## Status

Detailed strategic plan drafted — no-schema money-helper foundation implemented. Product-owner data-model and MVP currency policy directions recorded: use planner Option A, support only EUR/USD for user acquisition entries, and default to EUR for the Europe-first MVP. Implementation remains gated: do not draft/apply migrations, policies, backend methods, or schema changes in this recorder. Priority: HIGH. Product area: marketplace / price hub foundation.
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
- Existing module collection logic treats ownership as a single current relationship toggle; no quantity, copy count,
  or per-instance registration concept should leak into this MVP.

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
- Preserve module membership semantics: acquisition rows do not imply current ownership and are not module instances.
- Keep all rows owner-only until a later explicit aggregation path exists.

## Non-goals

- No public price reports in this task.
- No current collection valuation dashboard in MVP.
- No support for "I own three copies" or per-copy inventory.
- No per-instance registration in UI or DB for MVP.
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
- [x] Draft detailed strategic plan for `user_module_acquisitions` schema, owner-only RLS, MVP currency policy, and acquisition edit/delete policy; show it for product-owner approval before any migration/policy draft or implementation.
- [ ] Add optional price/date/source fields to the add-to-collection / possession transition flow without changing `user_modules` into quantity or instance ownership.
- [ ] Create owner-only backend methods for acquisition rows.
- [ ] Show latest acquisition price in the user's module collection detail context.
- [x] Validate currency and integer minor-unit conversion with unit tests.

## Structural layer

- [ ] Add acquisition history list / edit surface for the current user.
- [ ] Support source labels: new, used, gift, trade, marketplace, unknown, as ledger metadata rather than instance metadata.
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

This approval is **planning-only**. The product owner later chose the MVP data-model direction (Option A): keep ownership in `user_modules` as a single current relationship toggle, and record purchase price/date/source as an optional additive acquisition ledger/list underneath the module. Do not implement, draft, or apply migrations/RLS/backend/schema changes in this recorder.

## Approved MVP data-model direction

Use planner recommendation **Option A** now: keep `user_modules` as the single current ownership / wants / sells relationship, and add purchase history as an optional additive ledger/list underneath each module. The ledger captures acquisition facts without turning modules into registered instances.

MVP constraints:

- No `quantity` field.
- No copy count semantics.
- No per-instance registration in UI.
- No per-instance registration table or instance id in DB.
- Future instance support, if needed, can be introduced later by linking or migrating ledger rows into a dedicated instance model after a separate product/data-model approval.

`user_module_acquisitions`

- `id` — generated primary key.
- `profileid` — owner profile id. Required; all access policies are anchored here.
- `moduleid` — referenced module id. Required; acquisition rows describe module purchases, not collection membership rows or registered instances.
- `acquired_at` — optional calendar date or timestamp for when the module was acquired. Product-owner MVP decision: default to today when creating an acquisition entry, and keep the field editable/backdatable by the user.
- `price_amount_minor` — optional non-negative integer amount in the currency's minor unit. Empty price is allowed only when the row records non-price metadata such as source/note.
- `currency` — optional normalized ISO 4217 code when `price_amount_minor` is present.
- `source` — constrained source label: `unknown`, `new`, `used`, `gift`, `trade`, `marketplace`, `other`.
- `note` — optional private text, short enough for collection context rather than a journal.
- `created_at`
- `updated_at`

Do not put `price_paid` directly on `user_modules`; that would collapse history into one mutable number and block future
completed-sale / re-acquisition workflows. Do not add `quantity`, `instanceid`, or per-copy ownership fields for MVP.

### Schema strategy to approve before implementation

- Add the table as a new private ledger; do not add columns to `user_modules`.
- Keep `user_modules` ownership as a single current relationship toggle.
- Keep acquisition rows independent from current ownership so users can preserve history after selling/removing a module.
- Use one row per acquisition event in a module-level ledger/list. Multiple rows for the same `(profileid, moduleid)` are allowed for history, but those rows are not registered module instances and must not imply quantity.
- Enforce non-negative `price_amount_minor` when present.
- Enforce `currency` presence when `price_amount_minor` is present, and keep `currency` empty when no price is stored.
- Keep source labels constrained by the database so UI typos cannot create new categories.
- Index owner/module lookups for the expected MVP reads:
  - all acquisition rows for a signed-in user,
  - acquisition rows for one module in the signed-in user's collection context,
  - latest acquisition row per user/module for compact display.
- Do not add public aggregate tables or materialized views in this implementation slice.

## Proposed RLS (requires user approval)

- Owner-only `select`, `insert`, `update`, and `delete` by `profileid = auth.uid()`.
- No public reads.
- No aggregation into public Price Hub without a separate approved plan.

### RLS strategy to approve before implementation

- Enable RLS immediately when the table is created.
- Authenticated users can only read rows where `profileid` matches their authenticated user/profile id.
- Authenticated users can only insert rows for themselves; client-supplied `profileid` must match the authenticated user/profile id.
- Authenticated users can only update/delete their own rows.
- No anonymous access.
- No admin bypass policy is needed for MVP product UI. Any future support/admin inspection must be a separately approved security plan.
- Do not expose these rows through public profile, module detail, or price-hub queries in this slice.

## MVP currency policy

- Store money as integer minor units plus uppercase ISO 4217 currency code.
- Reuse the committed import-safe money helpers for parsing, normalization, and display.
- MVP user acquisition entries support only `EUR` and `USD`.
- Default currency is `EUR` because the initial acquisition target is Europe.
- Do not perform currency conversion, exchange-rate lookup, or collection valuation in MVP.

## Acquisition edit/delete policy

- Allow owner edits and deletes indefinitely in MVP because rows are private self-tracking data.
- Treat edit/delete as normal correction tools, not an audit-locked marketplace transaction ledger.
- If rows later feed anonymized public aggregates or completed-sale market data, introduce a separate immutable/locked transaction table or an opt-in aggregation pipeline rather than retroactively changing this private ledger's contract.
- Keep `updated_at` current on edits; do not use migration backfills that rewrite user-visible timestamps unnecessarily.

## MVP UI/API slice after approval

1. Register the table in `DatabaseStrings.ts`.
2. Add SupabaseService methods for owner-scoped list/add/update/delete acquisition rows with explicit column lists.
3. Add cache keys for acquisition lists and bust them after writes.
4. Add optional price/source inputs only where they support the current possession flow; empty price must not block adding a module to owned collection.
5. Show the latest private acquisition value in signed-in user collection/module contexts only.
6. Add a small acquisition history surface after the first flow is stable.

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
- A user can optionally enter price + currency, acquisition date, and source during or immediately after that transition; `acquired_at` defaults to today on creation and remains editable/backdatable.
- Only the owner can read or edit the acquisition data.
- The collection still behaves as single-relationship membership-only for racks, patches, and collection-aware features; no quantity or per-instance UI/DB behavior is introduced.

## Validation strategy

- Unit tests for money parsing / formatting helpers.
- Supabase service tests for new owner-only methods and cache busting.
- Targeted component tests for optional input and no-row-created empty state.
- `pnpm lint` and targeted `pnpm test-headless --include="**/*marketplace*.spec.ts"` once implementation exists.

## Risks and open questions

- Decide whether older acquisition rows are editable forever or locked after a short correction window.
- Decide if private acquisition rows ever contribute to public aggregates; default should be no.

## Approval queue

- **Planning phase approved 2026-06-18T21:00+02:00.** Prepare the detailed schema/RLS/currency/edit-policy plan, but do not draft/apply migrations, policies, backend methods, or schema changes until the plan is shown and approved.
- **Data-model direction approved 2026-06-18T21:24+02:00.** Use Option A for MVP: single current `user_modules` relationship plus optional additive acquisition ledger/list underneath the module; no `quantity` and no per-instance registration in UI or DB.
- **Acquisition date default approved 2026-06-18T21:25+02:00.** `acquired_at` defaults to today when creating an acquisition entry, and remains editable/backdatable by the user.
- **Currency policy approved 2026-06-18T21:25+02:00.** MVP user acquisition entries support only `EUR` and `USD`; default to `EUR` because the initial target is Europe.
- **Implementation approval still required.** The exact SQL, policies, backend methods, cache busting, and generated type updates remain blocked until separate product-owner approval.
- **Confirm acquisition edit policy.** Default recommendation: allow owner edits/deletes indefinitely for MVP because rows are
  private self-tracking data, then revisit locking only if rows feed public aggregate market data.

## Coordinator-loop handoff

Start here before any other marketplace item if the user wants early market-value progress without public-profile or PII
dependencies. Stop before any migration/RLS work until the user separately approves the exact schema and policies. Preserve the approved Option A boundary: ledger rows are purchase history, not instances.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-06-18T11:26+02:00 — Intake split purchase-price history from public marketplace because it delivers solo value and avoids profile/chat/address dependencies.
- 2026-06-18T20:28+02:00 — Selected a no-schema money-helper foundation slice while schema/RLS work remains gated; this unblocks parsing/formatting tests without touching backend state or real user data.
- 2026-06-18T20:30+02:00 — Completed the import-safe money-helper foundation with targeted tests for normalization, decimal parsing, separator handling, JPY zero-decimal behavior, and display fallbacks.
- 2026-06-18T20:34+02:00 — Parked the remaining MVP steps on explicit schema/RLS approval; no backend methods, migrations, policies, or real data mutations were attempted.
- 2026-06-18T21:00+02:00 — Product owner approved the planning-only phase for detailed schema/RLS/currency/edit-policy strategy; implementation remains blocked until the plan is shown and separately approved, and no migrations/policies should be drafted or applied yet.
- 2026-06-18T21:02+02:00 — Drafted the detailed strategic plan: separate private acquisition ledger, owner-only RLS, integer-minor-unit ISO currency policy, indefinite private edit/delete, and a post-approval UI/API sequence. No SQL, migrations, policies, backend methods, schema changes, or data mutations were attempted.
- 2026-06-18T21:24+02:00 — Product owner approved planner recommendation Option A for the MVP data model: keep `user_modules` ownership as a single boolean/current relationship toggle; record purchase price/date/source as an optional additive acquisition ledger/list underneath the module; add no `quantity` field and no per-instance registration in UI or DB for MVP, while leaving a path to a dedicated instance model later. No code, migrations, RLS, backend methods, schema changes, or data mutations were attempted.
- 2026-06-18T21:25+02:00 — Product owner approved the MVP currency policy: support only `EUR` and `USD` for user acquisition entries, and default currency to `EUR` because the initial target is Europe. No code, migrations, RLS, backend methods, schema changes, or data mutations were attempted.
- 2026-06-18T21:25+02:00 — Product owner decided `acquired_at` defaults to today when creating an acquisition entry, and remains editable/backdatable by the user. This records product behavior only; no code, migrations, RLS, backend methods, schema changes, or data mutations were attempted.
