# TODO — active backlog

> **Thin index of active and backlog tasks.** Per-task detail lives in [**plans/**](./plans/).
>
> **Rules for AI agents using this file:**
>
> 1. **Read the Approvals ledger below first.** It is the single source of truth for what is
>    pre-authorized, what is pending a product-owner answer, and what is permanently denied.
>    Do not re-ask questions already answered there; do not scatter approval questions across
>    plan files — register them here (one line + link to the plan section with full context).
> 2. **Pick one task** by reading its plan file under `plans/`. Open the plan and update the
>    `## Decision log` section as you make non-obvious choices.
> 3. **Keep this index thin.** A task gets at most one line: status + title + link.
>    Backlog detail, layers, and acceptance criteria live in the plan file, not here.
> 4. **On completion**, move the one-line entry into [COMPLETED.md](./COMPLETED.md) with a date,
>    archive the plan file under `plans/done/`, and reset `CURRENT_FEATURE.md`.
> 5. **Do not duplicate strategy** already in `../product/PRINCIPLES.md` or `../product/ROADMAP.md`.

## Legend

- `[ ]` Open
- `[~]` In progress
- `[!]` Blocked — waiting on an Approvals-ledger answer or external dependency; not being worked
- `ON HOLD:` Paused until explicitly resumed

---

## Approvals ledger

> Single place where the product owner grants, queues, and denies approvals.
> Agents: before declaring work blocked, check **Standing approvals**; when a gate is hit, add
> one line to **Pending questions** (with a default recommendation) and pick other safe work.
> The owner answers here; agents move answered lines into Standing approvals or Denials and
> mirror the outcome in the plan's Decision log.

### Standing approvals (pre-authorized — no need to re-ask)

- Docs-only changes, plan updates, and workflow archive moves.
- Frontend-only changes on `develop` behind existing feature flags, validated with targeted specs + `pnpm lint`.
- Cloudflare upload guardrails: module panels use a 512 KB post-crop threshold, 5000 px long-edge limit,
  WebP/JPEG quality 95→90 fallback, and inline "compress anyway" confirmation; rack previews hard-limit at
  1 MB. Existing objects are not recompressed automatically, and Marketplace media uses the approved baseline
  constraints from the linked plan.
- Manufacturer Accounts M1: Docker/local Supabase migration validation and local type generation are approved;
  remote migration/RLS/storage apply remains separately gated.
- Cool reactions: the narrow additive schema/RLS/typegen/backend reconciliation checkpoint is approved while the generated
  production feature flag remains off; no broader policy or production/release changes are authorized.
- Marketplace shipping address book: the first additive `shipping_addresses` migration, owner-only RLS, backend CRUD, and
  type generation are approved for the Patcher Supabase project after preflight/review/advisors.
- Cloudflare/R2 staging: creating `patcher-module-panels` and `patcher-rack-previews` and copying/verifying objects is approved.
  Traffic switching, cleanup, and Supabase object deletion remain separately gated.
- Marketplace address/listing schema/RLS/storage/backend foundation **applied and verified** — listing UI/discovery remains in the linked plans; release/push remains gated.
- Price Hub retention/diagnostics and zero-decimal backfill **approved in principle** — same preflight/typegen/advisor validation required before any mutation.
- Public Open API: reviewed technical plan adopted for MVP implementation
  (`backend-plan-reviewer`: APPROVE WITH CHANGES). The owner-present database,
  Vault, reader credential, direct-endpoint Hyperdrive, Durable Object, Worker
  upload, and authenticated smoke/lifecycle window completed on 2026-07-24.
  The custom domain is live and smoke cleanup is complete. The owner deferred WAF;
  the production app release and later R2 work remain.
- Public Open API backend: authoring and Docker/local validation of the three
  reviewed migrations (roles, views/RLS, identity/RPCs) is approved. No remote
  apply, LOGIN credential, Vault secret, type generation against remote, or
  Cloudflare provisioning is authorized. This historical scope was later superseded
  by the completed owner-present rollout recorded in the plan Decision log.
- Public Open API Structural UI (local, autonomous): owner-approved dedicated
  Public API section inside `/user/account`, after account identity rows and
  before the Danger Zone, implemented by a flag-gated
  `DeveloperApiKeysComponent` + `DeveloperApiKeysDataService` under
  `src/app/features/backbone/user-management/developer-api-keys/`, plus
  `SupabaseService.apiKeys` namespace, `DatabaseStrings` entries for
  `api_keys` / `api_tiers` / `api_key_usage_monthly`, and the
  `developerApiEnabled` feature flag added to `generate-env.js` (default
  **false** in `environment.prod.ts`, **true** in dev). No remote apply,
  no `pnpm updateBackendTypes`, no flag flip in production — those stay
  in the batched operator window.
- Public Open API stable credential slot semantics: exactly one
  `api_keys` row per profile enforced by a full `UNIQUE (profile_id)`
  index; `create_api_key(label)` and `create_partner_api_key(profile_id,
  label)` are atomic UPSERTs that preserve `id`, `api_key_usage_monthly`,
  and (self-service branch) `tier_code` / quota overrides; admin partner
  promotes the same slot; `revoke_api_key` flips `revoked_at`;
  re-activation reuses the same slot; a `rotated_at` column is added; the
  Worker's ≤60 s isolate metadata cache is the rotation acceptance
  window; compromise flow is revoke → wait ≥60 s → create with WAF
  prefix/IP mitigation. This is a documentation-only standing approval;
  remote SQL apply of the follow-up migration stays gated below
  ([plan §"API keys — physical model"](./plans/public-open-api.md#api-keys--physical-model-stable-per-profile-credential-slot)).

### Pending questions (owner: answer inline, agents move resolved lines)

- [ ] Rack module orientation storage: authorize the reviewed `text` → `smallint`
  schema/typegen/backend migration after preflight; no RLS/policy changes are expected
  ([plan](./plans/rack-module-orientation-smallint-storage-migration.md)) (added 2026-07-19).
- [ ] Cloudflare/R2: authorize traffic switch, cleanup, and any Supabase object deletion after the approved copy/verification stage (added 2026-07-08).
- [ ] PostHog analytics review: provide credentials/export access (added 2026-07-08).
- [ ] **Public Open API — infrastructure/schema gates** (reviewed plan adopted;
  remote foundation and smoke tests are complete; each remaining gate requires an explicit
  answer)
  ([plan](./plans/public-open-api.md)) (added 2026-07-24):
  - [x] DNS + Worker route for `api.patcher.xyz` on
    Cloudflare.
  - [x] Hyperdrive binding `HYPERDRIVE` points at the direct Supabase Postgres
    endpoint with TLS and SQL result caching disabled; Hyperdrive owns the
    reader credential. Supavisor is intentionally not chained in front of Hyperdrive.
  - [x] Durable Object namespace `API_KEY_COUNTER`
    (authoritative per-minute + monthly quota; no static Dashboard Rate
    Limiting rule, no Workers Rate Limiting API binding).
  - [x] Verify Supabase Vault is enabled and the
    SECURITY DEFINER function owner can read `vault.decrypted_secrets`, then
    provision Vault secret
    `api_key_pepper` (32 random bytes, base64) and mirror to Cloudflare
    Worker secret `API_KEY_PEPPER`. Pepper rotation invalidates all keys —
    incident procedure.
  - [~] Coarse WAF/IP abuse rules as an outer, non-tier-specific shield:
    deferred by the owner for initial launch; mandatory keys and per-key Durable
    Object quotas remain active.
  - [x] Apply the consolidated migrations remotely after local
    authoring/validation: `api_reader_role.sql`, `api_v1_views.sql`,
    `api_identity.sql` (includes `api_tiers` seed, `api_keys` + RLS,
    `api_key_usage_monthly`, RPCs `create_api_key`, `create_partner_api_key`,
    `revoke_api_key`, `verify_api_key`, `record_api_key_usage`). RLS on
    `api_keys` gives owner + JWT admin SELECT only; mutations only via
    SECURITY DEFINER RPCs.
  - [x] Defer `pg_trgm_search.sql` and trigram GIN indexes to Polish.
    MVP returns `400 unsupported_parameter` for `q`.
  - [ ] (Structural, not MVP-blocking) Private R2 bucket
    `patcher-public-datasets` + Worker R2 binding; streamed through the
    Worker after key check (no presigned URLs). Logpush → durable sink
    likewise Structural.
- [~] **Public Open API — owner-present rollout**: database migrations/types,
  Vault, `api_reader`, direct-endpoint Hyperdrive, Durable Object, Worker
  secret/upload, controlled partner slot rotation/revocation/reactivation,
  usage reporting, and authenticated catalogue/quota/cache smoke tests are
  complete. `api.patcher.xyz` is live, public smoke checks pass, the temporary
  Worker is deleted, and WAF was deferred by the owner. Remaining: app release
  with production `developerApiEnabled`, final live-doc/archive update, and R2 later
  ([plan](./plans/public-open-api.md#batched-manual-operator-window-single-owner-session))
  (added 2026-07-24).

### Denials / permanent constraints

- Production branch, release commands, and pushes: **never autonomous** — user-triggered only.
- Supabase Cron for Price Hub: declined; manual-only.
- Supabase RLS/policy changes: never applied autonomously (see `AGENTS.md` §5).
- Backend-breaking changes to live production clients: require the user present.

---

## Public docs queue

> Follow [DOCUMENTATION_LIFECYCLE.md](./DOCUMENTATION_LIFECYCLE.md). Completion on `develop`
> creates/updates an entry here; public docs work starts only after production publication and
> visibility are confirmed.

### Completed on develop; awaiting production publication

- None.

### Published; docs pending

- None.

### Published but documentation-blocked

- None.

---

### PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live)

- [~] **HIGH: Public Open API — modules & manufacturers v1 is live; production User Area release/final archive next, then bulk JSONL and public patches/racks later** → [`plans/public-open-api.md`](./plans/public-open-api.md)
- [ ] **HIGH: Manufacturer Accounts & Verification (claims, admin review, verified-owner edits; local M1 validation/typegen approved; remote apply gated)** → [`plans/manufacturer-accounts-verification.md`](./plans/manufacturer-accounts-verification.md)
- [ ] **LOW: Manufacturer Updates / Featured Surface (persistence/RLS/backend/moderation approved after verification foundation)** → [`plans/manufacturer-updates-featured-surface.md`](./plans/manufacturer-updates-featured-surface.md)
- [ ] **LOW: Manufacturer Analytics (privacy aggregate helper complete; manufacturer validation/dashboard/backend gated)** → [`plans/manufacturer-analytics.md`](./plans/manufacturer-analytics.md)
- [ ] **LOW: Manufacturer API / Widgets Pilot (safe contract + field stability docs complete; endpoint/embed gated)** → [`plans/manufacturer-api-widgets-pilot.md`](./plans/manufacturer-api-widgets-pilot.md)

### PRODUCT — Tier 2 (requires stable public profiles / community trust layer)

- [ ] **HIGH: Marketplace — Shipping Address Book (private schema/backend and User Area CRUD UI complete; transaction integration remains)** → [`plans/marketplace-shipping-address-book.md`](./plans/marketplace-shipping-address-book.md)
- [ ] **HIGH: Marketplace — Visual Redesign (align browse/detail with app shell + design system; shell toolbar missing, dark custom SCSS to remove)** → [`plans/marketplace-visual-redesign.md`](./plans/marketplace-visual-redesign.md)
- [ ] **HIGH: Marketplace — Browse, Detail, and Cockpits (public browse/detail and public-profile For Sale complete; buyer cockpit waits on transactions)** → [`plans/marketplace-browse-detail-and-cockpits.md`](./plans/marketplace-browse-detail-and-cockpits.md)
- [ ] **HIGH: Marketplace — Listings Core and Media (backend/schema/private media storage, seller editor, and public rendering complete; expiry/transaction hooks remain)** → [`plans/marketplace-listings-core-and-media.md`](./plans/marketplace-listings-core-and-media.md)
- [ ] **HIGH: Marketplace — Structured Inquiry and Offers (latest-offer helper complete; schema/RLS/backend/UI/notifications gated)** → [`plans/marketplace-structured-inquiry-and-offers.md`](./plans/marketplace-structured-inquiry-and-offers.md)
- [ ] **HIGH: Marketplace — Transaction Lifecycle (timeline event helper complete; schema/RLS/backend/UI/notifications/Price Hub gated)** → [`plans/marketplace-transaction-lifecycle.md`](./plans/marketplace-transaction-lifecycle.md)
- [ ] **MEDIUM: Marketplace — Realtime Messaging (thread preview helper complete; schema/RLS/realtime/UI/moderation gated)** → [`plans/marketplace-realtime-messaging.md`](./plans/marketplace-realtime-messaging.md)
- [ ] **MEDIUM: Marketplace — Feedback and Reputation (next marketplace slice approved after address/listings)** → [`plans/marketplace-feedback-and-reputation.md`](./plans/marketplace-feedback-and-reputation.md)

### DATA MODEL (schema / domain gaps to address)

- [ ] **MEDIUM: Rack module orientation — migrate storage from text to smallint (`0` normal, `1` rot180; schema apply gated)** → [`plans/rack-module-orientation-smallint-storage-migration.md`](./plans/rack-module-orientation-smallint-storage-migration.md)
- [ ] **ON HOLD: LOW: Module I/O — bidirectional and passive port support (blocked before backend/model changes pending proposal review + explicit approval)** → [`plans/module-io-bidirectional-passive-port-support.md`](./plans/module-io-bidirectional-passive-port-support.md)

### INFRA (independent; pick any time a product task is blocked)

- [~] **LOW: Backend response explicit-any cleanup (safe fallback baseline reduction)** → [`plans/backend-response-explicit-any-cleanup.md`](./plans/backend-response-explicit-any-cleanup.md)
- [ ] **HIGH: Cloudflare Image Proxy and R2 Media Migration (upload/compression guardrails approved; R2 migration remains operator-gated)** → [`plans/cloudflare-image-proxy-and-r2-media-migration.md`](./plans/cloudflare-image-proxy-and-r2-media-migration.md)
- [ ] **ON HOLD: HIGH: Security — Manual Approval Follow-ups** → [`plans/security-manual-approval-followups.md`](./plans/security-manual-approval-followups.md)
- [ ] **ON HOLD: LOW: FUI-inspired instrument components** → [`plans/fui-inspired-instrument-components.md`](./plans/fui-inspired-instrument-components.md)
- [ ] **ON HOLD: VERY LONG TERM: Bundle weight, lazy boundaries, and SSR prerender coverage** → [`plans/bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md`](./plans/bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md)
- [ ] **ON HOLD: MEDIUM: Module possession trend charts (schema approval follow-up)** → [`plans/module-possession-trend-charts-schema-followup.md`](./plans/module-possession-trend-charts-schema-followup.md)
- [ ] **LOW: Cross-entity Cool reactions (detail placement complete; narrow typegen/backend reconciliation approved; production flag stays off)** → [`plans/module-cool-appreciation-button.md`](./plans/module-cool-appreciation-button.md)
- [ ] **ON HOLD INDEFINITELY: Rack Comparison — balance diff between two racks** → [`plans/rack-comparison-balance-diff-between-two-racks.md`](./plans/rack-comparison-balance-diff-between-two-racks.md)
- [ ] **ON HOLD: MEDIUM: Sentry — Live Issue Audit** → [`plans/sentry-live-issue-audit.md`](./plans/sentry-live-issue-audit.md)
- [ ] **ON HOLD: MEDIUM: Patch SVG previews (blocked: linked migration/typegen drift; do not apply storage/RLS autonomously)** → [`plans/patch-svg-previews.md`](./plans/patch-svg-previews.md)
- [ ] **ON HOLD: SEO — OG Image Generation** → [`plans/on-seo-og-image-generation.md`](./plans/on-seo-og-image-generation.md)
- [ ] **LOWEST: PostHog UI interaction analytics review (needs credentials/export later)** → [`plans/posthog-ui-interaction-analytics-review.md`](./plans/posthog-ui-interaction-analytics-review.md)
