<!-- Section: PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live) -->

# Public Open API — modules & manufacturers (v1), public patches & racks (v2)

## Status

- [ ] Backlog — researched intake plan; no implementation started.
- Priority: **HIGH**
- Depends on: nothing hard for the MVP layer (anonymous read-only). API-key self-service depends on the
  existing User Area auth. Coordinates with
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
modules and manufacturers catalogue (public patches/racks as a second objective), with self-service
API keys, monthly quotas, and edge caching aggressive enough that origin (Supabase) load stays near
zero regardless of traffic.

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
- **Tiers** (numbers to confirm — see Open questions):
  - `anonymous` (no key): very low IP-based rate limit (e.g. 60 req/h) so `curl` try-outs work;
  - `free` (registered key): e.g. 10k req/month, 60 req/min burst;
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

- Base: `https://api.patcher.xyz/v1/`; JSON only; CORS `*` for reads; OpenAPI 3.1 document published and
  used to generate docs.
- Endpoints (MVP): `GET /v1/modules`, `GET /v1/modules/{id}`, `GET /v1/manufacturers`,
  `GET /v1/manufacturers/{id}`, `GET /v1/standards`, `GET /v1/tags`.
- Conventions: cursor pagination (`?cursor=&limit=`, max 100); filters (`?manufacturer_id=`, `?hp=`,
  `?tag=`, `?standard=`, `?q=` name search); sparse fields (`?fields=`); optional expansions
  (`?include=ins,outs,tags,panels`) mapping to `module_ins`/`module_outs`/`module_tags`/`module_panels`.
- Field whitelist reuses the reviewed approach from
  `src/app/features/manufacturer-detail/manufacturer-widget-contract.utils.ts` (fail-closed: private or
  non-explicitly-public data is impossible to serialize). Canonical Patcher URLs included per entity
  for the attribution ask in `ai-and-open-data.md`.
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

- Cloudflare manages (or can manage) DNS for `patcher.xyz` so `api.` can bind to a Worker — to confirm.
- Module and manufacturer catalogue data is public-by-design in its entirety once whitelisted per field.
- Quota numbers are product decisions, not engineering ones; placeholders above ship only after owner
  confirmation.
- The widgets-pilot endpoint (structural layer of that plan) should be re-based onto this API once live.

## MVP layer (anonymous read-only API, origin-protected)

- [ ] Create `api/` Worker workspace (mirroring `cloudflare/image-proxy` conventions): router, error
  envelope, `X-RateLimit-*`/`Retry-After` handling, JSON logging.
- [ ] Define `api_v1_modules` / `api_v1_manufacturers` (+ `standards`, `tags`) SQL views with explicit
  field whitelists (schema change — backend-plan-reviewer + owner approval gate).
- [ ] Create restricted Postgres role/key for the Worker (approval gate; never service-role).
- [ ] Implement the six MVP endpoints with cursor pagination, filters, includes; edge cache + SWR + ETag.
- [ ] Anonymous IP rate limiting via Cloudflare rules.
- [ ] OpenAPI 3.1 spec committed in-repo; CI check that spec and router stay in sync.
- [ ] Publish minimal developer docs page (endpoints, limits, attribution policy) linked from
  `Patcher-docs` `the-project/ai-and-open-data.md` and `llms.txt`.

## Structural layer (keys, quotas, usage)

- [ ] `api_keys` migration + RLS (owner-only) + typegen (backend-plan-reviewer + approval gates).
- [ ] User Area "Developer" panel: create/revoke key, show prefix, copy-once raw key, usage this month.
- [ ] Worker key validation (hash lookup, KV-cached), tier resolution, monthly quota counters in KV,
  periodic usage flush to Supabase.
- [ ] Tier limits config + `429` behavior + docs.
- [ ] Bulk dataset export job (modules+manufacturers JSONL to R2) + `GET /v1/datasets` index.

## Polish layer (second objective + DX)

- [ ] Public patches/racks endpoints via `public_id` pattern (v2 contract review first).
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
- [ ] Anonymous, free, and partner tiers enforce their limits; exceeding returns `429` + `Retry-After`.
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
- **Approval needed:** quota/tier numbers and licensing/attribution wording before public launch.
- Standing constraint: RLS/policy changes never applied autonomously (`AGENTS.md` §5).

## Open questions for the product owner (refinement round)

1. **DNS/Worker binding** — is `patcher.xyz` DNS on Cloudflare today, and is `api.patcher.xyz` the
   desired hostname (vs `patcher.xyz/api/v1`)?
2. **Anonymous tier** — allow limited keyless access (recommended for DX, e.g. 60 req/h/IP) or require
   a key for everything?
3. **Quota numbers** — confirm free-tier monthly quota and burst rate (proposal: 10k req/month,
   60 req/min).
4. **Panel images** — should the API return direct image URLs (Cloudflare image-proxy/R2), and do we
   allow hotlinking or require clients to copy assets?
5. **Pricing data** — are `module_store_listings` / price snapshots in scope for v1, later, or never
   (affiliate/ToS considerations)?
6. **Data licence** — what licence do we declare on the catalogue (e.g. CC BY 4.0 with attribution,
   ODbL, custom terms)? This gates the bulk export.
7. **Bulk export access** — free anonymous download, or key-required (still free) so we can measure and
   contact consumers?
8. **Key registration surface** — User Area panel only (Patcher account required — recommended), or a
   separate lightweight developer-portal signup?
9. **Future monetization** — should tier design reserve a paid tier now (naming, quotas, key prefixes),
   even though billing is out of scope?
10. **v2 priority** — after modules/manufacturers ship, do public patches/racks outrank the bulk
    dataset export, or vice versa?

## Decision log

- 2026-07-24T10:45+02:00 — Intake created from owner request (public open API for modules/manufacturers,
  patches/racks secondary; token+monthly-quota model; bot protection; must not consume backend quotas).
  Recommended gateway: Cloudflare Worker with edge caching + KV-backed keys/quotas; PostgREST via
  restricted role over dedicated `api_v1_*` views; bulk R2 dataset export as the sanctioned AI path.
  Vercel/Supabase-function gateways rejected because they spend the quotas the API must protect.
- 2026-07-24T10:45+02:00 — Coordination decision: `manufacturer-api-widgets-pilot` structural endpoint
  should be served by this API once live instead of a parallel one-off route; its field whitelist and
  stability policy are reused as the v1 contract baseline.
