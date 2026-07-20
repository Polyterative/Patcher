<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live) -->

# Manufacturer API / Widgets Pilot

## Status

- [x] Safe first checkpoint implemented: pure read-only serialization helper and co-located specs added; no endpoint/API/UI/backend exposure.
- Priority: **LOW**
- Depends on: **Manufacturer Accounts & Verification** for verified-owner identity and any authenticated owner controls.

## Problem

Manufacturers could eventually use Patcher as lightweight catalogue infrastructure, but an unrestricted API or broad widget
surface would create moderation, auth, and data-quality commitments before verified ownership is stable.

## Goals

- Pick the smallest credible B2B wedge before backend/API work.
- Define which manufacturer-owned fields are safe for programmatic access.
- Separate public embeddable data from verified-owner authenticated write access.
- Keep public widgets read-only and cacheable.
- Avoid exposing user-level collection, analytics, address, or transaction data.

## Non-goals

- No write API in the next checkpoint.
- No API keys, OAuth, or token storage until Manufacturer Accounts & Verification lands.
- No schema, RLS, policy, Edge Function deploy, Cron, or remote Supabase changes without explicit approval.
- No third-party script embed that executes untrusted code on Patcher pages.

## Assumptions

- The safest first deliverable is a read-only embeddable module-card contract, not an authenticated manufacturer API.
- Manufacturer-owned profile/module fields should become API-visible only after verified-owner edit provenance exists.
- Public fields can reuse existing public manufacturer/module detail data, but must be intentionally whitelisted.

## MVP layer

- [x] Define the read-only widget contract: manufacturer id/name/logo filename-or-URL/canonical URL and module id/public id/name/panel image filename-or-URL/HP/short description/standard/tags/canonical Patcher URL.
- [x] Add a pure TypeScript whitelist/serialization helper with tests; no route or network endpoint yet.
- [x] Document cache and invalidation expectations for a future endpoint.
- [x] Record an approval gate before any public endpoint or embed snippet is exposed.

## Structural layer

- [ ] Add a cacheable public read-only JSON endpoint for the reviewed one manufacturer/module card contract.
- [ ] Add rate-limit / cache headers around any future endpoint.
- [ ] Add authenticated owner API-key design only after manufacturer claims and owner controls are live.

## Polish layer

- [ ] Provide one compact embed preview for manufacturers.
- [ ] Add copy that positions widgets as official catalogue snippets, not ads.
- [x] Add docs for field stability and deprecation policy.

## File / surface map

- Future pure helper: `src/app/features/manufacturer-detail/manufacturer-widget-contract.utils.ts`
- Future specs: `src/app/features/manufacturer-detail/manufacturer-widget-contract.utils.spec.ts`
- Future endpoint or SSR route: not approved in the staged checkpoint.
- Manufacturer Accounts dependency: `internaldocs/workflow/plans/manufacturer-accounts-verification.md`

## Acceptance criteria

- [x] The next checkpoint can produce a tested, read-only serialization contract without backend, schema, or UI exposure.
- [x] The contract contains only public manufacturer/module fields.
- [x] User-level ownership, analytics, addresses, transactions, store URLs, admin ids, emails, tokens, and private profile fields are impossible to serialize.
- [x] Private or not-explicitly-public modules return `null` from the single-card helper.
- [x] Authenticated API/key work remains blocked behind Manufacturer Accounts & Verification.

## Validation strategy

- `pnpm test-headless --include="**/manufacturer-widget-contract.utils.spec.ts"` for field whitelisting, URL generation inputs, public-flag requirements, and private-field exclusion.
- `node scripts/checks/check-docs.cjs`.
- `git diff --check`.
- `pnpm lint` because TypeScript helpers were added.

## Approval queue

- **Approval recorded 2026-07-07T12:43+02:00:** User requested the read-only embeddable module-card serialization contract as the safe first checkpoint, with no endpoint/API key/write access.
- **Approval needed next:** Review the serialized contract before exposing the cacheable public read-only JSON endpoint, embed snippet, API key/auth design, schema/RLS/policy change, Edge Function deploy, or Cron.

## Field stability and deprecation policy

Applies to the existing pure serialization contract only; it does not expose a public endpoint yet.

- **Stable-by-default fields:** existing serialized field names and meanings should remain additive/back-compatible once an endpoint is approved.
- **Additive changes:** new optional fields may be added after review if they are public, whitelisted, and safe for cacheable anonymous reads.
- **Breaking changes:** removing a field, changing a field meaning, narrowing visibility, or changing canonical URL shape requires an explicit versioned-contract plan before endpoint exposure.
- **Deprecation window:** future exposed fields should be marked deprecated in docs for at least one release cycle before removal unless they leak private data or create a security issue.
- **Privacy override:** private fields, user-level collection/analytics/address/transaction data, admin ids, emails, tokens, and raw provenance payloads are never compatibility commitments; if accidentally serialized, remove them immediately and treat it as a privacy bug.
- **Cache contract:** future endpoints should document cache TTL and invalidation around manufacturer/module updates before launch; cache policy is not implied by the local helper.
- **Owner controls:** authenticated API keys, write APIs, and verified-owner controls remain blocked behind Manufacturer Accounts & Verification and are not covered by the read-only widget contract.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-07-06T18:02+02:00 — Staged as the next safe loop candidate. The recommended first wedge is a pure read-only widget contract helper, not an authenticated API, because Manufacturer Accounts & Verification remains blocked before owner identity/typegen work.
- 2026-07-07T12:43+02:00 — Implemented the safe first checkpoint as `manufacturer-widget-contract.utils.ts`: pure TypeScript, framework-free, no endpoint/UI/backend, explicit whitelist output, and canonical Patcher URLs for manufacturer/module detail pages.
- 2026-07-07T12:45+02:00 — Private-module policy: the single-card helper returns `null` unless module visibility is explicitly public and returns `null` for private/draft/hidden/archived visibility. Future endpoints must preserve this fail-closed behavior and add cache headers/invalidation only after approval.
- 2026-07-08T12:58+02:00 — Added the field stability/deprecation policy promised by the polish layer. The policy is docs-only, additive, and keeps endpoint/embed/API-key/schema/RLS work gated behind explicit approval.
- 2026-07-08T14:30+02:00 — User chose the next Manufacturer API/Widgets exposure target after contract review: a cacheable public read-only JSON endpoint for one manufacturer/module card contract. Authenticated API keys/write APIs remain blocked behind Manufacturer Accounts & Verification.
