<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live) -->

#### LOW: Manufacturer Analytics

**Why:** Verified manufacturers need aggregate insight into catalogue performance and audience interest inside Patcher.
**Depends on:** Manufacturer Accounts & Verification.

- [ ] Validate with a small set of boutique manufacturers what they would actually want from analytics before building it
- [x] Define privacy-safe aggregate metrics (views, outbound clicks, collection count, public rack count, public patch count)
- [x] Define minimum thresholds below which metrics are hidden instead of shown
- [ ] Add manufacturer dashboard queries / aggregation layer
- [ ] Add private analytics UI for verified manufacturers
- [x] Document privacy boundaries so no user-level ownership data is exposed

## Safe local helper checkpoint

Implementable without backend/schema/UI exposure:

- Define whitelisted manufacturer analytics metric ids and public labels.
- Normalize aggregate counts into display rows only when a metric has a finite nonnegative count.
- Hide metrics below a minimum privacy threshold instead of exposing low counts.
- Emit generic hidden-state copy that does not reveal whether one or two users interacted.
- Exclude raw viewer/user ids, emails, profile ids, rack ids, patch ids, event payloads, and time-series traces.

Implemented helper:

- `src/app/features/manufacturer-detail/manufacturer-analytics.utils.ts`
- `src/app/features/manufacturer-detail/manufacturer-analytics.utils.spec.ts`

The helper floors decimal counts before threshold checks so fractional aggregate artifacts cannot leak as display values.

## Validation strategy

- `pnpm test-headless --include="**/manufacturer-analytics.utils.spec.ts"`
- `node scripts/checks/check-docs.cjs`
- `git diff --check`
- `pnpm lint`

## Validation results

- 2026-07-08T12:56+02:00 — `pnpm test-headless --include="**/manufacturer-analytics.utils.spec.ts"` passed.

## Approval queue

- Product validation with boutique manufacturers is still needed before dashboard UI priority/metric ranking is final.
- Any dashboard query, schema/RLS/policy, remote aggregation, or verified-owner UI surface remains gated behind Manufacturer Accounts & Verification and explicit implementation approval.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-07-06T18:02+02:00 — Added safe local privacy-threshold aggregate analytics display helpers with specs; no schema/RLS/remote apply/UI/deploy was done.
- 2026-07-08T12:56+02:00 — Completed the local analytics helper checkpoint as a pure whitelist/threshold formatter. Unknown metrics, malformed counts, private ids/payloads, and below-threshold exact counts are excluded from output; dashboard/backend work remains gated.
