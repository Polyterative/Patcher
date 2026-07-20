<!-- Auto-split from TODO.md by scripts/dev/split-todo.cjs. -->
<!-- Section: PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live) -->

# Manufacturer Updates / Featured Surface

## Status

Safe local helper checkpoint in progress. Priority: LOW. Product area: manufacturer detail pages / verified-owner tooling.

Current checkpoint has pure TypeScript helper and co-located specs for future manufacturer update draft validation and featured
module ID normalization. User has approved persistence/RLS/backend work with a moderation path after the Manufacturer Accounts &
Verification foundation is in place. Deploy, release, push, and production-branch work remain gated on explicit approval.

## User intent

Verified manufacturers need a compact way to highlight new releases, updated modules, featured products, and important notices
without turning Patcher into a blog platform.

## Product / roadmap fit

This depends on Manufacturer Accounts & Verification. It should add official context to manufacturer detail pages while preserving
Patcher's compact reference-first character and avoiding open-ended marketing feeds.

## Safe local helper checkpoint

- [x] Define `ManufacturerUpdateDraft` with `manufacturerId`, `title`, `body`, optional `linkedModuleId`, optional `expiresAt`, and optional `featuredModuleIds`.
- [x] Add local validation/normalization for draft-shaped unknown values without throwing.
- [x] Require nonblank manufacturer, title, and body fields.
- [x] Enforce title length at 120 characters and body length at 1000 characters.
- [x] Trim optional linked module IDs and omit blanks.
- [x] Accept optional expiry only when parseable and future relative to the provided clock.
- [x] Add `normalizeFeaturedModuleIds` to trim IDs, ignore malformed non-string values, dedupe case-insensitively, and cap at six IDs.
- [x] Return only `{ valid: true, update }` or `{ valid: false, errors }`.
- [x] Whitelist normalized output and exclude unknown/private draft fields.
- [x] Record approval for persistence/RLS/backend work with moderation path after Manufacturer Accounts & Verification.

## Goals

- Add manufacturer-owned update entries with title, body, timestamp, and optional linked module.
- Add featured module controls for verified manufacturers.
- Show a compact "what's new" / "featured" section on manufacturer detail pages.
- Define hard constraints up front: posting limits, entry length, expiry/archive model, and reporting flow.
- Define moderation / visibility rules for official update entries.

## Non-goals

- No generic blog platform or long-form CMS.
- No unverified manufacturer authoring.
- No schema/RLS/policy/migration/backend/UI work in the current helper checkpoint.
- No production rollout, deploy, release, or push from this checkpoint.

## Dependencies and sequencing

Depends on `manufacturer-accounts-verification.md` for verified-owner identity, authorization, and admin review rules. The local helper
can be refined now, but persistence and UI must wait for verification, RLS, moderation, and placement approvals.

## MVP layer

- [ ] Propose and approve manufacturer update and featured module schema/RLS before migration work.
- [ ] Add verified-owner authoring controls after UX placement approval.
- [ ] Add compact manufacturer detail page update/featured section.
- [ ] Add expiry/archive behavior and empty states.

## Structural layer

- [ ] Add backend/data methods only after schema/RLS approval.
- [ ] Add moderation/reporting flow for official update entries.
- [ ] Add posting limits and owner audit trails.
- [ ] Add featured module ordering constraints.

## Polish layer

- [ ] Add concise copy explaining official manufacturer updates.
- [ ] Add archived/expired update affordances.
- [ ] Add accessibility and responsive polish for the compact detail-page section.

## Proposed local validation constraints

- `manufacturerId`, `title`, and `body` must be strings that trim to nonblank values.
- `title` maximum: 120 characters.
- `body` maximum: 1000 characters.
- `linkedModuleId` is optional, trimmed, and omitted when blank or malformed.
- `expiresAt` is optional, but must parse to a future timestamp relative to the caller-provided `now` when present.
- `featuredModuleIds` are optional, strings only, trimmed, case-insensitively deduped, and capped at six.
- Unknown/private fields are never copied to normalized output.

## Future approval gates

- Verified-owner write policy and admin override rules.
- RLS read/write policy and moderation visibility.
- Posting rate limits, title/body length finalization, expiry/archive semantics, and reporting flow.
- Manufacturer detail page placement, density, and responsive behavior.

## File / surface map

- Local helper checkpoint: `src/app/features/manufacturer-detail/manufacturer-updates.utils.ts`
- Local helper specs: `src/app/features/manufacturer-detail/manufacturer-updates.utils.spec.ts`
- Future manufacturer detail UI: `src/app/features/manufacturer-detail/`
- Future backend registration: `src/app/features/backend/DatabaseStrings.ts`
- Future generated types: `src/backend/database.types.ts`

## Acceptance criteria

- Manufacturer update drafts normalize only safe whitelisted fields.
- Malformed draft values return structured errors and never throw.
- Featured module IDs are deterministic, deduped, and capped before any future UI/backend work.
- No schema/RLS/policy/migration/data/backend/UI/routes/deploy/release/push work occurs in this checkpoint.

## Validation strategy

- Unit tests for valid update normalization, required/length validation, expiry validation, no-throw malformed inputs, unknown field exclusion, and featured module dedupe/cap.
- `node scripts/checks/check-docs.cjs` after workflow doc updates.
- `git diff --check` before delivery.
- `pnpm lint` because TypeScript production code changed, if feasible.

Latest safe helper checkpoint validation (2026-07-07T13:44+02:00):

- `pnpm test-headless --include="**/manufacturer-updates.utils.spec.ts"` passed.
- `node scripts/checks/check-docs.cjs` passed.
- `git diff --check` passed.
- `pnpm lint` passed.

## Risks and open questions

- MVP allows max 3 active updates per manufacturer; expiry is optional; expired updates are hidden from public manufacturer detail but kept in owner history.
- Decide moderation/reporting flow for official manufacturer posts.
- Decide featured module ordering and whether owners can feature discontinued modules.

## Coordinator-loop handoff

Current helper checkpoint may be tested and refined locally. Backend persistence may proceed after the verified-owner foundation lands;
first visible UI placement is manufacturer profile pages. Deploy, release, push, and production-branch work remain unapproved.

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->
- 2026-07-07T13:41+02:00 — Expanded this plan from a thin checklist into a gated helper checkpoint with validation constraints, approval gates, and remaining schema/RLS/UI/moderation work clearly blocked.
- 2026-07-07T13:41+02:00 — Selected six featured module IDs as the local cap so a future detail-page surface remains compact while still supporting a small showcase.
- 2026-07-07T13:41+02:00 — Expiry validation is local-only and future-relative to a provided clock for deterministic tests; archive semantics were still undecided at this checkpoint.
- 2026-07-07T14:07+02:00 — User approved additive persistence/RLS/backend work for manufacturer-authored updates and featured content, with a moderation path. First visible placement should be manufacturer profile pages, with optional homepage/discovery modules later.
- 2026-07-08T14:30+02:00 — User chose Manufacturer Updates MVP limits: max 3 active updates per manufacturer, optional expiry, and expired updates hidden from public detail pages while retained in owner history.
