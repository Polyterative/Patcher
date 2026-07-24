<!-- Section: PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live) -->

# Public Open API — modules & manufacturers (v1), public patches & racks (v2)

## Status

- [~] Active — refinement complete; backend plan review required before implementation.
- Priority: **HIGH**
- Depends on: the existing User Area auth for self-service key management; manual key provisioning can
  support MVP preview validation before that UI ships. Coordinates with
  [`manufacturer-api-widgets-pilot.md`](./manufacturer-api-widgets-pilot.md) (its cacheable widget
  endpoint should become a consumer of this API, not a parallel stack).

## Problem

Making public data programmatically reachable has always been a core project goal
(see `internaldocs/product/ROADMAP.md` "open by default" and the docs-site page `the-project/ai-and-open-data.md`).
Today the only access paths are the Angular app, SSR HTML, and scraping. There is no supported,
versioned, machine-readable contract for modules and manufacturers, no way for third-party apps,
researchers, or AI systems to consume the catalogue responsibly, and no protection layer that would
keep such consumption from burning Supabase/Vercel quotas if it happened anyway.

## Goal

One sentence: ship a public, versioned, **read-only** REST API at `api.patcher.xyz` exposing the
modules and manufacturers catalogue (public patches/racks as a second objective), with mandatory
self-service API keys, monthly quotas, and edge caching aggressive enough that origin (Supabase)
load stays near zero regardless of traffic.

## Proposed architecture (decision matrix inside)

### Gateway technology — recommendation: Cloudflare Worker

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Cloudflare Worker on `api.patcher.xyz`** | Edge cache (Cache API) + KV + rate limiting + WAF/bot management in one place; generous free tier (100k req/day) and cheap paid tier; repo already has a Cloudflare surface (`cloudflare/image-proxy`) and an R2 migration in flight; isolates public traffic from the Vercel app entirely | New deploy target to operate; Workers KV eventual consistency for counters | **Recommended** |
| Vercel Edge/Serverless function under `patcher.xyz/api/*` | Same repo/deploy | Consumes the Vercel quota the plan is meant to protect; couples API availability to app deploys | Rejected |
| Supabase Edge Function | Close to data | Consumes Supabase quota per request; weak edge caching story; per-invocation billing on the resource we protect | Rejected |
| Direct PostgREST (`anon` role) exposure | Zero code | No API keys/quotas, no stable versioned contract, no cache layer, exposes internal schema as public contract | Rejected |

### Data path

- Worker serves **only** from its edge cache when possible; on miss it queries Supabase PostgREST with a
  **dedicated restricted role/key**, never the service-role key, selecting from **dedicated public views**
  (e.g. `api_v1_modules`, `api_v1_manufacturers`) so the public contract is decoupled from physical tables.
- Cache TTL: list endpoints 1–6 h, detail endpoints 6–24 h, `stale-while-revalidate`; catalogue data changes
  slowly, so a whole bot swarm hitting the API results in a handful of origin queries per day.
- Strong `ETag`/`Cache-Control` on responses so well-behaved clients revalidate for free.
- **Bulk dataset export** (v1.x): nightly/weekly JSON(-Lines) dump of the public catalogue to R2, served via
  the Worker. This is the sanctioned path for AI/dataset consumers and diverts "download everything"
  traffic away from both the API and scraping.

### Auth, quotas, and bot protection

- **API keys**: `api_keys` table in Supabase (`id`, `profile_id`, `key_prefix` visible, `key_hash`
  SHA-256, `tier`, `monthly_quota`, `created_at`, `revoked_at`). Raw key shown once at creation
  (`pk_live_<nanoid>` style). Self-service create/revoke in the User Area.
- **Tiers**:
  - `free` (registered key): 5k req/month, 60 req/min burst;
  - `partner` (manual grant): higher, for manufacturers/tools — dovetails with
    Manufacturer Accounts & Verification.
- **Enforcement**: per-minute rate limit via Cloudflare rate-limiting rules / Worker counters; monthly
  quota counted in Workers KV (eventually-consistent is fine for quotas), periodically flushed to
  Supabase for the usage dashboard.
- **Bot protection**: Cloudflare WAF + bot rules in front of the Worker; API responses cached at edge, so
  even abusive traffic doesn't reach origin; quota exhaustion returns `429` with `Retry-After` and
  standard `X-RateLimit-*` headers.
- Read-only by construction: no write endpoint exists in the Worker; keys carry no write capability.

### API shape (v1)

- Base: `https://api.patcher.xyz/v1/`; JSON only; CORS `*` for reads; API key required on every data
  endpoint; OpenAPI 3.1 document published and used to generate docs.
- Endpoints (MVP): `GET /v1/modules`, `GET /v1/modules/{id}`, `GET /v1/manufacturers`,
  `GET /v1/manufacturers/{id}`, `GET /v1/standards`, `GET /v1/tags`.
- Conventions: cursor pagination (`?cursor=&limit=`, max 100); filters (`?manufacturer_id=`, `?hp=`,
  `?tag=`, `?standard=`, `?q=` name search); sparse fields (`?fields=`); optional expansions
  (`?include=ins,outs,tags,panels`) mapping to `module_ins`/`module_outs`/`module_tags`/`module_panels`.
- Field whitelist reuses the reviewed approach from
  `src/app/features/manufacturer-detail/manufacturer-widget-contract.utils.ts` (fail-closed: private or
  non-explicitly-public data is impossible to serialize). Canonical Patcher URLs included per entity
  for the attribution ask in `ai-and-open-data.md`.
- Panel image URLs are excluded from v1. Pricing and `module_store_listings` are deferred until after
  the core catalogue and bulk export are stable.
- v2 (second objective): `GET /v1/patches/{public_id}`, `GET /v1/racks/{public_id}` and public-only list
  endpoints, reusing the opaque `public_id` + SECURITY DEFINER RPC pattern (`ARCHITECTURE.md`); private
  items are never listed and never resolvable without their token.

## Non-goals

- No write API of any kind.
- No exposure of user-level data: collections, analytics, addresses, transactions, emails, admin ids,
  tokens, private profiles, private racks/patches.
- No GraphQL (revisit only on demonstrated demand).
- No paid billing integration in v1 (tier model must not preclude it later).
- No schema/RLS/policy/Edge Function/DNS changes without the explicit approval gates below.

## Assumptions (explicit)

- Cloudflare manages DNS for `patcher.xyz`, so `api.` can bind directly to a Worker.
- Module and manufacturer catalogue data is public-by-design in its entirety once whitelisted per field.
- Catalogue data is published under CC BY 4.0 with a clear Patcher attribution requirement.
- The widgets-pilot endpoint (structural layer of that plan) should be re-based onto this API once live.

## MVP layer (key-required read-only API, origin-protected)

- [ ] Create `api/` Worker workspace (mirroring `cloudflare/image-proxy` conventions): router, error
  envelope, `X-RateLimit-*`/`Retry-After` handling, JSON logging.
- [ ] Define `api_v1_modules` / `api_v1_manufacturers` (+ `standards`, `tags`) SQL views with explicit
  field whitelists (schema change — backend-plan-reviewer + owner approval gate).
- [ ] Create restricted Postgres role/key for the Worker (approval gate; never service-role).
- [ ] Add the minimal `api_keys` persistence/RLS contract needed for `free` and `partner` keys, with
  manual provisioning for preview validation (backend-plan-reviewer + owner approval gates).
- [ ] Implement the six MVP endpoints with cursor pagination, filters, includes; edge cache + SWR + ETag.
- [ ] Require a valid API key on every data endpoint; enforce 5k requests/month and 60 requests/minute
  for `free`, with configurable higher limits for manually granted `partner` keys.
- [ ] OpenAPI 3.1 spec committed in-repo; CI check that spec and router stay in sync.
- [ ] Publish minimal developer docs page (endpoints, limits, attribution policy) linked from
  `Patcher-docs` `the-project/ai-and-open-data.md` and `llms.txt`.

## Structural layer (self-service keys, usage, bulk export)

- [ ] User Area "Developer" panel: create/revoke key, show prefix, copy-once raw key, usage this month.
- [ ] Replace manual preview provisioning with self-service key creation/revocation and complete
  owner-only RLS/typegen/backend wiring.
- [ ] Periodically flush KV usage counters to Supabase for the User Area usage display.
- [ ] Bulk dataset export job (modules+manufacturers JSONL to R2) + key-required
  `GET /v1/datasets` index and downloads.

## Polish layer (second objective + DX)

- [ ] Public patches/racks endpoints via `public_id` pattern after bulk export (v2 contract review first).
- [ ] Field stability & deprecation policy published (extend the one in
  `manufacturer-api-widgets-pilot.md` to the whole API); API changelog page.
- [ ] TypeScript client / typed SDK generated from OpenAPI (optional, on demand).
- [ ] Re-base manufacturer widget endpoint onto `/v1/` and retire any parallel path.
- [ ] Abuse review pass: WAF rules, per-key anomaly alerting (Sentry), key revocation runbook.

## File / surface map

- New Worker: `cloudflare/public-api/` (or sibling top-level `api-worker/`; decide at implementation).
- Views + role migration: `supabase/migrations/…_api_v1_views.sql`, `…_api_keys.sql`.
- User Area panel: `src/app/components/user-parts/…` + co-located `*-data.service.ts` (layering R1–R4).
- Backend access for the panel: `SupabaseService` namespaces + `DatabaseStrings.ts` registration.
- OpenAPI spec: `cloudflare/public-api/openapi.yaml`.
- Docs: developer page in `Patcher-docs` repo + `llms.txt` pointer.

## Acceptance criteria

- [ ] All v1 endpoints answer from edge cache with ≥95% hit ratio under synthetic load; origin query
  rate stays bounded regardless of request volume.
- [ ] No non-whitelisted field can be serialized (view-level guarantee + contract tests).
- [ ] Every data endpoint and bulk download rejects missing/invalid keys; free and partner tiers enforce
  their limits; exceeding returns `429` + `Retry-After`.
- [ ] A revoked key stops working within one cache-TTL window (≤5 min).
- [ ] OpenAPI spec validates and matches deployed routes in CI.
- [ ] Private/user-level data unreachable by construction (restricted role + views only).

## Validation strategy

- Worker unit tests (vitest/miniflare) for routing, pagination, key validation, quota math.
- Contract tests asserting response shape == OpenAPI spec.
- `EXPLAIN` review of view queries; verify restricted role cannot select from base private tables.
- Synthetic load test against a preview deployment measuring origin hit count.
- `pnpm lint`, targeted specs for User Area panel, `node scripts/checks/check-docs.cjs`.

## Approval queue

- **Approval needed:** DNS/route binding for `api.patcher.xyz` on Cloudflare.
- **Approval needed:** `api_v1_*` views + restricted role migration (backend-plan-reviewer first).
- **Approval needed:** `api_keys` schema + RLS + typegen (backend-plan-reviewer first).
- **Approval needed:** final licensing/attribution wording before public launch (licence selected:
  CC BY 4.0).
- Standing constraint: RLS/policy changes never applied autonomously (`AGENTS.md` §5).

## Resolved refinement decisions

1. `patcher.xyz` uses Cloudflare nameservers; bind the Worker at `api.patcher.xyz`.
2. API keys are mandatory for every data endpoint; there is no anonymous tier.
3. The free tier allows 5k requests/month and 60 requests/minute.
4. Panel image URLs are excluded from v1.
5. Pricing and store listings are deferred until after v1.
6. Catalogue data uses CC BY 4.0 with attribution.
7. Bulk exports remain free but require an API key.
8. API keys are created in the existing User Area; no separate developer portal.
9. Only `free` and `partner` tiers are modelled; no reserved paid tier.
10. Bulk JSONL export precedes public patch/rack endpoints.

## Decision log

- 2026-07-24T10:45+02:00 — Intake created from owner request (public open API for modules/manufacturers,
  patches/racks secondary; token+monthly-quota model; bot protection; must not consume backend quotas).
  Recommended gateway: Cloudflare Worker with edge caching + KV-backed keys/quotas; PostgREST via
  restricted role over dedicated `api_v1_*` views; bulk R2 dataset export as the sanctioned AI path.
  Vercel/Supabase-function gateways rejected because they spend the quotas the API must protect.
- 2026-07-24T10:45+02:00 — Coordination decision: `manufacturer-api-widgets-pilot` structural endpoint
  should be served by this API once live instead of a parallel one-off route; its field whitelist and
  stability policy are reused as the v1 contract baseline.
- 2026-07-24T11:15+02:00 — Product refinement completed. Public DNS is confirmed on Cloudflare and the
  hostname is `api.patcher.xyz`. All data endpoints require keys; tiers are `free` (5k/month,
  60/minute) and manually granted `partner`, with no anonymous or reserved paid tier. Panel images are
  excluded from v1; prices/store listings follow later. Data licence is CC BY 4.0. User Area owns key
  registration. Key-required JSONL bulk export is prioritized before public patch/rack endpoints.
  Because keyless access was rejected, minimal key persistence, validation, and quota enforcement move
  into MVP; self-service management and usage display remain Structural.
