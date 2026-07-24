<!-- Section: PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live) -->

# Public Open API — modules & manufacturers (v1), public patches & racks (v2)

## Status

- [~] Reviewed plan adopted by the product owner. MVP implementation may begin;
  schema/RLS, role credentials, DNS, Hyperdrive, Durable Objects, Vault, WAF,
  and remote applies remain separately gated in the TODO Approvals ledger.
- Priority: **HIGH**
- Depends on: existing User Area auth for self-service key management; manual `partner`
  provisioning uses a separate admin RPC executable only from `service_role`/postgres.
  Coordinates with [`manufacturer-api-widgets-pilot.md`](./manufacturer-api-widgets-pilot.md).

## Problem

Public catalogue data is only reachable through the Angular app, SSR HTML, or scraping.
There is no versioned, machine-readable contract for modules and manufacturers, and no
protection layer that keeps third-party consumption from spending the Supabase and
Vercel quotas that the app itself depends on.

## Goal

Ship a public, versioned, **read-only** REST API at `api.patcher.xyz` exposing modules
and manufacturers (public patches/racks as v2), with mandatory self-service API keys,
atomic per-minute and monthly quotas, and edge caching aggressive enough that origin
load stays near zero — without ever burning Supabase Edge Function invocation quota,
which is the very quota the API exists to protect.

## Proposed architecture

### Gateway — Cloudflare Worker at `api.patcher.xyz`

| Option | Verdict |
|---|---|
| **Cloudflare Worker** with Cache API + Durable Objects + Hyperdrive binding | **Chosen.** Isolates public traffic from Vercel/Supabase; DNS is on Cloudflare; repo already ships `cloudflare/image-proxy/`. |
| Vercel Edge/Serverless under `patcher.xyz/api/*` | Rejected — consumes Vercel quota. |
| **Supabase Edge Function** | Rejected — every unique cache miss burns one Edge invocation, i.e. the exact quota the API exists to protect. |
| Direct PostgREST (`anon` role) | Rejected — no keys/quotas/versioned contract. |

Worker directory: **`cloudflare/public-api/`** (sibling of `cloudflare/image-proxy/`).

### Worker → Postgres transport

- Worker reads Supabase via a **Cloudflare Hyperdrive binding** (`HYPERDRIVE_READER`)
  pointed at the Supavisor **transaction-mode** pooler. Hyperdrive owns the credential;
  password rotation is a binding re-issue, no redeploy.
- Driver: `postgres` (postgres.js v3) over the Hyperdrive URL. Rejected: raw TCP
  (unsupported in Workers), postgres.js over plain WebSockets (not a sanctioned Worker
  transport — Hyperdrive is).
- **Transaction-pooler constraints — enforced by design:** no `LISTEN`/`NOTIFY`; no
  `SET ROLE`; no session-level `SET`; no session-scoped prepared statements. All
  Worker queries come from a **named parameterized catalog** in `src/queries/`;
  dynamic identifiers are checked against the whitelist before use.
- Worker never holds `service_role` or the project JWT signing secret.

### Read privilege — `api_view_owner` (NOLOGIN) owns views; `api_reader` reads

Two roles:

- `api_view_owner` (`NOLOGIN`) — owns every `api_v1_*` view. Postgres has no
  per-view `security_definer` toggle; ownership + `security_barrier=on` is the
  mechanism. Supabase's advisor flags this as `security_definer_view`; the
  finding is **accepted** with the justification recorded in `COMMENT ON VIEW`
  (see Decision log). `security_invoker=on` is **rejected** and is not claimed
  anywhere in this plan.
- `api_reader` (login-capable; credential lives only in Hyperdrive) — the only
  role the Worker uses. Gets `SELECT` on each `api_v1_*` view and `EXECUTE` on
  `verify_api_key(bytea)` and `record_api_key_usage(uuid, date, int)`. **No**
  base-table grants, no `USAGE` beyond `schema public`, no writes.

`api_view_owner` gets column-level `SELECT` only for these view outputs and
predicate/join columns:

- `modules`: `id`, `name`, `description`, `hp`, `standard`, `"manufacturerId"`,
  `depth`, `"depthMax"`, `"isDIY"`, `"manualURL"`, `"powerNeg12"`,
  `"powerPos12"`, `"powerPos5"`, `switches`, `weight`, plus hidden predicate
  columns `"public"`, `"isApproved"`, `submitter`.
- `manufacturers`: `id`, `name`, `description`, `tagline`, `"websiteURL"`,
  `social_links`, `logo`.
- `standards`: `id`, `name`; `tags`: `id`, `name`, `type`.
- `module_ins` / `module_outs`: `id`, `moduleid`, `name`, `"isAudio"`,
  `"isDCC"`, `"isVOCT"`, `min`, `max`, plus hidden predicate column
  `"isApproved"`.
- `module_tags`: `id`, `moduleid`, `tagid`.
- `module_panels`: `id`, `moduleid`, `color`, `description`, plus hidden
  predicate column `"isApproved"`; `filename` is deliberately not granted.

`modules` and `manufacturers` already have RLS enabled; additive
`FOR SELECT TO api_view_owner` policies are explicitly `PERMISSIVE` (the
Postgres default) and enforce the publishable predicates
below. The six ancillary tables remain non-RLS tables to preserve existing
app reads; they receive only the column grants above and are filtered through
their views. RLS for every other role is untouched. Views are created
`WITH (security_barrier = on)`.

Row exposure predicates (identifiers verified against `src/backend/database.types.ts`):

- `api_v1_modules` — `WHERE "public" = true AND "isApproved" = true AND submitter IS NOT NULL`.
  Rejected: allow `submitter IS NULL` (unattributable rows stay hidden).
- `api_v1_manufacturers` — `manufacturers` has no `public`/`isApproved` columns.
  EXISTS-gated by publishable modules:
  `WHERE EXISTS (SELECT 1 FROM public.modules m WHERE m."manufacturerId" = manufacturers.id AND m."public" AND m."isApproved" AND m.submitter IS NOT NULL)`.
  Rejected: add `manufacturers.public` boolean (deferred to
  `manufacturer-accounts-verification`).
- `api_v1_standards`, `api_v1_tags` — full rows (reference data).
- `api_v1_module_ins`, `api_v1_module_outs`, `api_v1_module_tags`,
  `api_v1_module_panels` — join to `api_v1_modules` for transitive exposure; `isApproved`
  also required on `module_ins`/`module_outs`/`module_panels`.

Indexes (all `CREATE INDEX IF NOT EXISTS`):

- `modules_public_approved_idx` on `public.modules (id)` where
  `"public" AND "isApproved" AND submitter IS NOT NULL`.
- `modules_public_approved_mfr_idx` on `public.modules ("manufacturerId")` with the
  same partial predicate.
- Explicit `CREATE INDEX IF NOT EXISTS` indexes on `module_ins.moduleid`,
  `module_outs.moduleid`, `module_tags.moduleid`, and `module_panels.moduleid`;
  Postgres does not create referencing-side FK indexes automatically.
- `EXPLAIN (ANALYZE, BUFFERS)` plans under `api_reader` are captured in this
  plan's validation notes before merge.

Explicit column exclusions (enforced by a whitelist test that compares view columns
to a committed manifest): `submitter`, `created`, `updated`, admin notes, moderation
state beyond `isApproved`, panel image URLs (v1), pricing / store listings.

### Admin identity — JWT `app_metadata`, not a table

Authenticated flows use the repo-standard predicate
`coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'`, matching every
existing migration (`manufacturer_logo_storage_policies`, `admin_can_update_racks`, …).
No `public.admins` table is invented. Manual partner provisioning runs as
`service_role`/postgres — connection role, not JWT — so it is not subject to this
predicate.

### API keys — physical model

Tables (contract; owner: `postgres`, in migration `…_api_identity.sql`):

- `public.api_tiers (code text PRIMARY KEY CHECK (code ~ '^[a-z_]+$'), monthly_quota int NOT NULL CHECK (>0), per_minute_quota int NOT NULL CHECK (>0), description text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`
  seeded `('free', 5000, 60, …)` and `('partner', 500000, 600, …)`.
- `public.api_keys (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, key_prefix text NOT NULL, key_hash bytea NOT NULL, tier_code text NOT NULL REFERENCES public.api_tiers(code), monthly_quota_override int CHECK (>0), per_minute_quota_override int CHECK (>0), label text, created_at timestamptz NOT NULL DEFAULT now(), revoked_at timestamptz, last_used_at timestamptz)`
  with `UNIQUE INDEX (key_hash)` and partial index on `profile_id WHERE revoked_at IS NULL`.
- `public.api_key_usage_monthly (key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE, month date NOT NULL, used int NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (key_id, month))`.
  Lives in the identity migration to keep MVP migration count low.

Rejected: Postgres `enum` for tier (each tier is a migration; renames painful);
Worker-side tier constants (origin cannot enforce overrides); < 128 bits of
entropy; plain SHA-256 without pepper (offline brute force on hash dump).

Key material:

- Raw = 16 bytes from `extensions.gen_random_bytes(16)` (128 bits); wire format
  `pk_live_<base64url no padding>` (exactly 22 chars after prefix).
- Hash = `extensions.hmac(raw_bytes, pepper_bytes, 'sha256')`. The HMAC input
  is the 16 raw random bytes, not the ASCII wire key. The Worker removes
  `pk_live_`, base64url-decodes the suffix to exactly 16 bytes, and signs those
  bytes.
- **Pepper** (256 random bits) is written twice: to Supabase Vault
  (`api_key_pepper`) so DB RPCs can hash at mint time, and to Cloudflare Worker
  secret `API_KEY_PEPPER` so the Worker can hash inbound `Authorization`
  headers. Both values are base64 text decoded to exactly 32 bytes before HMAC
  (`bytea` in Postgres, `Uint8Array` in the Worker). **Doubled surface honestly
  disclosed** — unavoidable if the Worker
  must verify without a DB round-trip on every request. Vault is read only
  inside the RPCs below by their owner; `api_reader` gets no Vault access.
  Preflight verifies Vault is enabled and the function owner can read
  `vault.decrypted_secrets`. Pepper rotation invalidates all keys (incident
  procedure).

RPCs (exact signatures; all `SECURITY DEFINER`, `set search_path = public[, extensions, vault]`):

- `public.create_api_key(p_label text) RETURNS TABLE (id uuid, raw_key text, prefix text, tier text)`
  — mints a `free` key for `auth.uid()`. Raises `28000` if unauthenticated. Cannot
  target another profile; cannot pick tier. `revoke all … from public, anon, authenticated;
  grant execute … to authenticated`.
- `public.create_partner_api_key(p_profile_id uuid, p_label text) RETURNS TABLE (id uuid, raw_key text, prefix text, tier text)`
  — mints a `partner` key for `p_profile_id`. `revoke all … from public, anon, authenticated`;
  the migration explicitly revokes the default `PUBLIC` pseudo-role grant and
  grants no execute privilege to `authenticated`. Callable only from
  `service_role`/`postgres`.
  Explicit test asserts `42501` when invoked as `authenticated` or `anon`.
- `public.revoke_api_key(p_id uuid) RETURNS void` — owner
  (`profile_id = auth.uid()`) or JWT admin. Raises `42501` on mismatch. Grant
  `execute … to authenticated`.
- `public.verify_api_key(p_hash bytea) RETURNS TABLE (id uuid, profile_id uuid, tier_code text, monthly_quota int, per_minute_quota int)`
  — `stable`. Returns rows **only** for active keys
  (`WHERE key_hash = p_hash AND revoked_at IS NULL`). Zero rows for revoked or unknown
  keys — Worker returns `401 invalid_key`. Effective limits are
  `coalesce(k.monthly_quota_override, t.monthly_quota)` and
  `coalesce(k.per_minute_quota_override, t.per_minute_quota)`. Grant
  `execute … to api_reader` only.
- `public.record_api_key_usage(p_key_id uuid, p_month date, p_used int) RETURNS void`
  — `INSERT … ON CONFLICT (key_id, month) DO UPDATE SET used = greatest(excluded.used, api_key_usage_monthly.used), updated_at = now()`.
  Monotonic. Grant `execute … to api_reader` only. **No table-level insert/update grant
  to `api_reader`.** No HTTP receiver, no shared secret, no Edge Function.

Every RPC migration first revokes default execute from the `PUBLIC` pseudo-role
and from `anon`/`authenticated`, then grants only the role named above.

RLS on `api_keys`:

- `ENABLE ROW LEVEL SECURITY`.
- `FOR SELECT TO authenticated USING (profile_id = auth.uid())`.
- Admin `FOR SELECT TO authenticated USING (jwt-admin predicate)`.
- **No** INSERT/UPDATE/DELETE policies for `authenticated`. Mutations go only through
  the SECURITY DEFINER RPCs above.

**Worker-mint alternative evaluated and rejected** — see Decision log entry. In
brief: even a Worker-minted key still needs a credential to insert the hash,
which is either `service_role` (forbidden in the Worker) or a SECURITY DEFINER
RPC callable by `authenticated` (which just relocates the current design).
DB-mint keeps `service_role` out of the Worker and returns the raw key over the
existing Supabase HTTPS channel so the Worker never sees it.

### Request pipeline, cache key, and Vary

Exact order per request:

1. **Parse and normalize URL.** Reject any query parameter not in the endpoint's
   whitelist with `400 unknown_parameter` (bounds cache-key cardinality). Normalize
   remaining parameters (lowercase enums, canonical `limit`, drop empties, sort keys
   alphabetically).
2. **Authenticate.** Require the standard HTTP Bearer authentication scheme,
   with the raw `pk_live_…` API key as its credential. Missing header returns
   `401 missing_authorization`; a non-Bearer or malformed key returns
   `401 malformed_authorization`. Compute HMAC with `API_KEY_PEPPER`; look up
   metadata in an isolate-local LRU with a ≤60 s wall-clock expiry, then call
   `verify_api_key` on a miss. Workers KV is deliberately not used for key
   verification because its eventual-consistency window cannot support a hard
   revocation bound. Expired entries are absent, never extended.
3. **Consume quota.** `stub.fetch('/consume')` on the per-key Durable Object. DO
   enforces both windows atomically (see next section). Over-limit →
   `429 + Retry-After + X-RateLimit-*` headers. Every request goes through this
   step **before** cache lookup.
4. **Serve.** Cache key = method + normalized path + normalized query only.
   `Authorization` is **not** in the cache key or in `Vary`. Hit → return with
   `X-Cache: HIT`. Miss → parameterized query via Hyperdrive; compute
   `ETag = SHA-256(response body)`; store in Cache API; return with `X-Cache: MISS`.
   Cache entries contain only body, status, ETag, content type, and immutable
   public headers. Per-key `X-RateLimit-*` / `Retry-After` headers are never
   cached: after `cache.match()`, the Worker constructs the outgoing response
   and attaches the current request's DO counters. `If-None-Match` → `304`
   with the current key's quota headers. ETag is page-specific by construction
   because cursor/limit change the body.

Cache TTLs (Cache API only; responses do **not** set `Cache-Control: public`
because per-key rate headers must not be shared cross-tenant): lists
`s-maxage=3600, swr=86400`; details `s-maxage=21600, swr=86400`; reference
(`/standards`, `/tags`) `s-maxage=21600, swr=604800`. Invalidation is TTL-only
in v1 (accepted staleness bound ≤6 h).

### Quotas — Durable Object enforces both windows atomically

One DO per API key (`ApiKeyCounter`, namespace `API_KEY_COUNTER`). **No** Cloudflare
Dashboard Rate Limiting rule and **no** Workers Rate Limiting API binding —
per-key overrides mean static rules cannot express real thresholds, and a single DO
call collapses per-minute + monthly checks into one round-trip.

DO storage (`state.storage`, transactional): `month_start` (ISO date, first-of-month
UTC), `used_month`, `minute_start` (ISO datetime, top-of-minute UTC), `used_minute`,
`monthly_quota`, `per_minute_quota` (refreshed on tier change),
`last_flushed_month_used`, and flush-retry state.

`POST /consume` contract:

1. Read counters from `state.storage` (seed from `verify_api_key` result on first call).
   On every isolate-LRU miss/re-verification, pass the latest effective limits
   into `/consume`; the DO updates its stored limits so tier/override changes
   take effect within the ≤60 s metadata-cache bound.
2. **Lazy rollover** — if `now.minute != minute_start` reset per-minute counter; if
   `now.month != month_start` reset per-month counter and enqueue a final flush of
   the prior month. No dedicated rollover alarm is required; the flush alarm below
   persists the final prior-month value even if traffic stops.
3. If `used_minute + 1 > per_minute_quota` → 429 with
   `Retry-After = seconds_to_next_minute`. No storage write.
4. If `used_month + 1 > monthly_quota` → 429 with
   `Retry-After = seconds_to_next_month`. No storage write.
5. Increment both counters; `state.storage.put(...)` **before** returning success.
   Overshoot inside a single DO is therefore zero.
6. If `used_month - last_flushed_month_used >= 500` OR ≥ 5 min since last flush,
   call `record_api_key_usage(key_id, month_start, used_month)` via the same
   Hyperdrive client and update `last_flushed_month_used`. While an unflushed
   delta exists, arm a DO alarm for at most 5 minutes later. Flush failures do
   not fail the user request; the alarm retries independently of traffic with
   exponential backoff (30 s, 5 min, then 30 min cap) and emits
   `flush_retries_total` plus a structured error log.

Under a healthy Hyperdrive/Supabase path, reported usage lags the durable DO
count by at most one flush interval (≤5 min or 500 requests, whichever hits
first). During an outage, enforcement remains exact in DO storage and reporting
catches up monotonically when the alarm succeeds.

Coarse WAF/IP abuse rules may remain as an outer, non-tier-specific shield; they are
not part of quota enforcement.

### Revocation propagation

Isolate-local metadata caches have hard ≤60 s TTL; expired entries are
discarded, never extended. There is no cross-colo KV verification cache.
`verify_api_key` returns zero rows for revoked keys, so the next lookup after
60 s refuses. Acceptance bound: revocation honored within ≤60 s. Emergency
block via WAF rule on key prefix or IP (effective in seconds).

### Bulk dataset export (Structural)

Nightly job at 03:00 UTC writes JSONL for the four public views to R2 bucket
`patcher-public-datasets` (private). `GET /v1/datasets` returns manifest
(sizes, SHA-256); `GET /v1/datasets/{name}` streams the R2 object through the
Worker after auth + consume (rejected: R2 presigned URLs — replayable without
a key). Bulk downloads count against monthly quota (cost 1). R2 is
Structural — its absence does not block MVP.

### Widgets pilot coordination

MVP endpoints supersede the pilot's structural endpoint. The pilot page becomes
a consumer of `GET /v1/manufacturers/{id}?include=modules`. Legacy consumers
keep working via a temporary Worker alias (Polish). No parallel route.

### API shape (v1)

- Base `https://api.patcher.xyz/v1/`. JSON only. `CORS: *` on reads.
  Every data request uses HTTP Bearer authentication with the raw
  `pk_live_…` API key as its credential.
- Endpoints: `GET /v1/modules`, `GET /v1/modules/{id}`, `GET /v1/manufacturers`,
  `GET /v1/manufacturers/{id}`, `GET /v1/standards`, `GET /v1/tags`.
- IDs are integers throughout (matches `modules.id`, `manufacturers.id`, `standards.id`,
  `tags.id`).
- Cursor pagination: opaque base64url of
  `{"v":1,"s":<last_sort_value>,"id":<last_id_int>}`. Every list orders by
  `sort_column ASC, id ASC`. Invalid cursor → `400`.
- Filters: `manufacturer_id` (int), `hp` (int), `tag` (int id), `standard` (int id),
  `?q=` (pg_trgm, gated on approval — if denied, MVP returns
  `400 unsupported_parameter` for `q`).
- Include: `?include=ins,outs,tags,panels`; tokens whitelisted before use.
- v2: `GET /v1/patches/{public_id}`, `GET /v1/racks/{public_id}` reuse the existing
  opaque `public_id` pattern.

## Non-goals

- No write API. **No anonymous tier.** No exposure of user-level data (collections,
  analytics, addresses, transactions, emails, admin ids, tokens, private profiles,
  private racks/patches, submitter attribution). No paid billing in v1. No GraphQL.
  **No `service_role` in the Worker.** No project JWT signing secret in the Worker.

## Assumptions (explicit)

- Cloudflare manages DNS for `patcher.xyz`; `api.` binds to a Worker. Supabase
  Vault is enabled on the target project. Cloudflare Hyperdrive is available on
  the account. Rows selected by the exposure predicates are safe to publish under
  CC BY 4.0. Integer `modules.id` / `manufacturers.id` are stable and
  non-confidential.

## MVP layer (key-required, origin-protected read API)

- [ ] Create `cloudflare/public-api/` (mirrors `cloudflare/image-proxy/`):
  `wrangler.jsonc`, `src/index.ts` (router + pipeline in the order above),
  `src/keys.ts` (HMAC + isolate LRU), `src/quota.ts` (DO client),
  `src/queries/` (named parameterized catalog), `src/api-key-counter.ts` (DO
  class), `openapi.yaml`, `RUNBOOK.md`.
- [ ] Migrations (contingent on Approvals-ledger gate 1 — backend re-review):
  - `…_api_reader_role.sql` — idempotently create `api_view_owner NOLOGIN` and
    `api_reader NOLOGIN`, then grant schema usage. No base-table grants to
    `api_reader`; no password appears in git. After migration, an approved
    runbook step executed as `postgres` generates a random credential, changes
    `api_reader` to LOGIN, and enters the same credential directly into the
    Hyperdrive upstream configuration.
  - `…_api_v1_views.sql` — every `api_v1_*` view owned by `api_view_owner`,
    `WITH (security_barrier = on)`, exposure predicates + column whitelist,
    exact column-level base grants above to `api_view_owner`, additive
    `api_view_owner` SELECT policies on the two RLS tables, no RLS changes on
    ancillary tables, `GRANT SELECT … TO api_reader`, partial/FK indexes; each
    view carries a `COMMENT ON VIEW` documenting the accepted
    `security_definer_view` advisor.
  - `…_api_identity.sql` — `api_tiers` + seed, `api_keys` + RLS,
    `api_key_usage_monthly`, RPCs `create_api_key`, `create_partner_api_key`,
    `revoke_api_key`, `verify_api_key`, `record_api_key_usage` with grants.
  - Optional `…_pg_trgm_search.sql` — gated separately; if denied, MVP
    returns `400 unsupported_parameter` for `?q=`.
- [ ] Cloudflare (contingent gates): DNS `api.patcher.xyz`; Worker route +
  custom domain; Hyperdrive binding `HYPERDRIVE_READER`; DO namespace
  `API_KEY_COUNTER`; Worker secret `API_KEY_PEPPER` (mirrors Vault
  `api_key_pepper`); coarse WAF. R2 is Structural.
- [ ] Implement six MVP endpoints + the exact request pipeline; error
  envelope `{ error: { code, message, request_id } }`; per-response
  `X-RateLimit-Limit-Minute` / `-Remaining-Minute` / `-Limit-Month` /
  `-Remaining-Month`.
- [ ] Manual partner runbook — SQL editor as `postgres`:
  `select public.create_partner_api_key('<profile_uuid>', 'Vendor X preview')`.
- [ ] OpenAPI 3.1 spec + CI check that spec and router stay in sync
  (`scripts/checks/`).
- [ ] Developer docs page in `Patcher-docs` linked from
  `the-project/ai-and-open-data.md` and `llms.txt`.
- [ ] Baseline observability from built-in Workers logs/metrics (5xx, 429,
  cache-hit ratio, DB error rate). Logpush is Structural.

## Structural layer (self-service keys, usage, bulk export)

- [ ] User Area "Developer" panel under
  `src/app/components/user-parts/developer-api-keys/` +
  `developer-api-keys-data.service.ts` (layering R1–R4). Calls
  `create_api_key(label)` / `revoke_api_key(id)`; shows prefix, copy-once raw
  key, monthly usage. Coordinated with the widgets-pilot session so its page
  consumes `GET /v1/manufacturers/{id}?include=modules`.
- [ ] Backend wiring: `SupabaseService.apiKeys` namespace, `DatabaseStrings.ts`
  registration for `api_keys`, `api_tiers`, `api_key_usage_monthly`;
  `pnpm updateBackendTypes` after migrations.
- [ ] Nightly R2 export job (03:00 UTC); private bucket
  `patcher-public-datasets`; `GET /v1/datasets` + streamed
  `GET /v1/datasets/{name}` after auth + consume.
- [ ] Cloudflare Logpush → durable sink (recommended R2).
- [ ] `cloudflare/public-api/RUNBOOK.md` — pepper rotation (incident
  procedure), reader password rotation via Hyperdrive re-issue, DO
  management, dataset recovery.

## Polish layer (v2 + DX)

- [ ] Public patches/racks via `public_id` (v2 contract review first).
- [ ] Field stability + deprecation policy (extend
  `manufacturer-api-widgets-pilot.md`); API changelog page.
- [ ] Typed SDK generated from OpenAPI.
- [ ] Widget-pilot alias retirement with `Deprecation` + `Sunset` headers.
- [ ] Optional purge webhook if TTL staleness becomes user-visible pain.
- [ ] Optional dual-hash pepper migration for routine rotation.
- [ ] Optional `manufacturers.public` boolean if ownership/claims mature.
- [ ] Per-key anomaly alerting (Sentry), abuse review pass.

## Acceptance criteria

- [ ] Edge cache hit ratio ≥ 95 % under synthetic load; a `cache_hit_ratio` metric
  is exported.
- [ ] Whitelist test: every `api_v1_*` view's column set equals a committed
  manifest; extra columns fail the build. Companion assertions require owner
  `api_view_owner` and the `security_barrier=on` reloption on every view.
- [ ] Raw-table denial: `SELECT * FROM public.modules` (and `manufacturers`,
  `profiles`, `api_keys`, `api_key_usage_monthly`) as `api_reader` fails with
  `42501`; `SELECT` on every `api_v1_*` view succeeds.
- [ ] Revocation: revoke a key mid-consume-loop; requests fail with `401` within
  ≤60 s.
- [ ] Quota: per-minute and monthly enforcement is exact — no request succeeds
  past the limit. Under a healthy reporting path, Supabase usage lags the DO
  count by at most one flush interval; alarm retries catch up monotonically
  after an outage.
- [ ] Cache-key: two requests with same URL but different `Authorization` share
  a cache entry, each still verifies + consumes its own key and receives its
  own `X-RateLimit-Remaining-*` values. Cached entries contain no tenant-specific
  quota headers. `Authorization` never appears in `Vary` or cache key.
- [ ] Missing Bearer header returns `401 missing_authorization`; malformed
  scheme/key returns `401 malformed_authorization`.
- [ ] Unknown query parameter → `400 unknown_parameter`.
- [ ] ETag: paginated responses with different cursor/limit have distinct ETags;
  identical requests return `304` under `If-None-Match`.
- [ ] Partner-RPC lockout: `create_partner_api_key` invoked as `authenticated` or
  `anon` returns `42501`.
- [ ] A structurally valid but unknown key returns `401 invalid_key`.
- [ ] OpenAPI 3.1 spec validates and matches deployed routes in CI.
- [ ] Supabase advisors: no new critical findings; `security_definer_view` on
  `api_v1_*` views carries the accepted-justification `COMMENT ON VIEW`.
- [ ] Public catalogue changes visible via the API within ≤6 h.

## Validation strategy

- Worker tests (Vitest + Miniflare): router order, whitelist rejection, cursor
  round-trip, cache-key canonicalization, ETag/304, 401/429 envelopes,
  revoked-key cache miss, shared cache body with per-key quota headers. HMAC
  fixture proves DB `extensions.hmac` and Worker `crypto.subtle.sign` produce
  byte-identical digests from decoded raw-key and pepper bytes.
- DO tests: consume across two isolates verifies atomic increment and correct
  429 boundary on both windows; simulated crash between flush and next consume
  verifies exact enforcement plus alarm-driven reporting retry.
- SQL tests (`scripts/checks/` or `supabase/tests/`): raw-table denial for
  `api_reader`; view SELECT success; `create_partner_api_key` lockout for
  `authenticated`/`anon`; `verify_api_key` zero-rows for revoked keys;
  `record_api_key_usage` monotonic upsert; whitelist column-set equality.
- `EXPLAIN (ANALYZE, BUFFERS)` review of each list query under `api_reader`;
  plans are appended to this plan's validation notes before merge.
- Synthetic load test measuring cache-hit ratio and origin query count.
- `pnpm updateBackendTypes` after each migration; commit generated types.
  `supabase advisors --type security` + `--type performance` before merge.
  `pnpm lint`, targeted specs for the Developer panel,
  `node scripts/checks/check-docs.cjs`.

## Decision log

- 2026-07-24T10:45+02:00 — Intake created. Cloudflare Worker gateway recommended
  because Vercel/Supabase Edge alternatives spend the very quotas the API protects.
  Coordination: `manufacturer-api-widgets-pilot` structural endpoint superseded by
  this API; temporary Worker alias for legacy consumers.
- 2026-07-24T11:15+02:00 — Product refinement locked (see "Resolved refinement
  decisions" below).
- 2026-07-24T11:35+02:00 — Backend-plan-reviewer **BLOCK #1**. First revision;
  see prior document version in git history.
- 2026-07-24T12:00+02:00 — Backend-plan-reviewer **BLOCK #2**. Full rewrite;
  every physical decision reconfirmed against `src/backend/database.types.ts`
  and existing migration conventions, revised where wrong. Chosen
  representations (rejected alternatives inline; body carries full contracts):
  - **Gateway**: Cloudflare Worker + Hyperdrive to Supavisor transaction
    pooler kept. Rejected Supabase Edge Function — every unique cache miss
    would burn the exact invocation quota this API exists to protect.
  - **Worker driver**: postgres.js v3 over Hyperdrive with a named
    parameterized-query catalog and no session state. Rejected postgres.js
    over plain WebSockets (not a sanctioned Workers transport) and raw TCP.
  - **Read privilege redesigned**: `api_view_owner` (NOLOGIN) owns `api_v1_*`
    views with `security_barrier=on` and narrow column grants + its own RLS;
    `api_reader` gets only view SELECT + RPC EXECUTE, zero base-table access.
    Supabase `security_definer_view` advisor accepted with `COMMENT ON VIEW`
    justification. Rejected `security_invoker=on` (would require base-table
    grants + base-table RLS on `api_reader`, materially worse).
  - **Schema identifiers corrected**: `modules."manufacturerId"` (camelCase,
    quoted), `modules."public"`, `modules."isApproved"`, `submitter text`
    (nullable, not uuid); manufacturers have no `public`/`isApproved`;
    integer PKs on modules/manufacturers/standards/tags; no `public.admins` —
    admin identity uses `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`,
    matching every existing migration.
  - **Key mint kept DB-side**: HMAC with pepper in Vault + mirrored Worker
    secret. Doubled secret surface honestly disclosed — the only alternative
    is a per-request DB round-trip that defeats caching. Self-service
    `create_api_key(label)` always mints free for `auth.uid()`; manual
    partner grants use separate `create_partner_api_key(profile_id, label)`
    executable only by `service_role`/`postgres`, with explicit lockout test.
    Rejected Worker-mint (still needs `service_role` or a SECURITY DEFINER
    RPC callable by `authenticated`; no secret removed). `service_role` never
    placed in the Worker.
  - **`verify_api_key`**: returns only rows where `revoked_at IS NULL`; zero
    rows → 401. Metadata caches hard-capped ≤60 s. Revocation ≤60 s.
    Emergency WAF block by prefix/IP.
  - **Cache key & Vary**: canonical URL + normalized query only.
    `Authorization` **not** in cache key or `Vary`. Verify + consume run
    **before** cache lookup. Unknown query parameters rejected with
    `400 unknown_parameter` to bound cardinality. ETag = SHA-256(body);
    page-specific by construction.
  - **Quota enforcement**: single per-key Durable Object enforces both
    windows atomically, persists to `state.storage` before returning, lazy
    UTC rollover on consume (no alarms). Reporting via
    `record_api_key_usage` executed by `api_reader` over the same Hyperdrive
    client — no HTTP receiver, no shared secret. Rejected Dashboard Rate
    Limiting and Workers Rate Limiting API bindings.
  - **Migrations consolidated to three**: reader/view-owner roles;
    `api_v1_*` views + indexes; identity + RPCs + `api_key_usage_monthly`.
    Plus optional `pg_trgm_search`. pg_trgm owner-approval fallback preserved
    (`?q=` deferred to Polish if denied).
  - **Approval sequencing**: Approvals-ledger gate 1 is "adopt plan only
    after backend re-review verdict is not BLOCK". All schema/infrastructure
    gates (DNS, Hyperdrive, DO namespace, Worker secret, Vault pepper,
    coarse WAF, migrations, optional pg_trgm) contingent on gate 1 and not
    solicited before it clears. R2 and Logpush are Structural, not blockers.
    CURRENT_FEATURE reads "awaiting re-review".
  - **IDs**: integer, exposed as-is; enumeration not a confidentiality risk
    because every exposed row is publishable by predicate. v2 patches/racks
    reuse the opaque `public_id` pattern.
- 2026-07-24T12:30+02:00 — Backend-plan-reviewer **BLOCK #3** found four
  specification defects, not a new architectural rejection. Corrected the
  shared-cache contract so cached entries contain no per-key rate headers;
  clarified the required column grants to `api_view_owner`; split the
  credential-free NOLOGIN role migration from the manual Hyperdrive credential
  runbook; and defined HTTP Bearer authentication and its 401 errors. Removed
  KV from key verification to preserve a hard ≤60 s revocation bound. Added
  exact ancillary FK indexes, byte-level HMAC interoperability, DO alarm/retry
  reporting, Vault preflight, and explicit ancillary-table RLS non-changes.
  Consolidating tiers, keys, usage, and RPCs in `api_identity.sql` remains a
  deliberate MVP simplification; rollback is always a forward follow-up
  migration, never reversal of an applied production migration.
- 2026-07-24T12:50+02:00 — Backend-plan-reviewer verdict **APPROVE WITH
  CHANGES**. No blockers remain. Folded in the non-blocking refinements:
  explicit permissive view-owner policies; PUBLIC execute revocation for every
  RPC; effective quota override expressions; DO limit refresh within 60 s;
  `invalid_key` taxonomy; exact key length; and view ownership/reloption
  assertions. Bulk download cost remains one request for Structural MVP, with
  size-based weighting reserved for later abuse review.
- 2026-07-24T13:00+02:00 — Product owner adopted the reviewed technical plan
  as the implementation baseline. This approves safe MVP code/scaffolding work,
  not the separately listed schema/RLS, credential, DNS, Hyperdrive, Durable
  Object, Vault, WAF, or remote-apply gates.

## Resolved refinement decisions (locked)

1. `patcher.xyz` uses Cloudflare nameservers; bind Worker at `api.patcher.xyz`.
2. API keys mandatory for every data endpoint; no anonymous tier.
3. Free tier: 5000 requests/month, 60 requests/minute.
4. Panel image URLs excluded from v1.
5. Pricing and store listings deferred beyond v1.
6. Catalogue data under CC BY 4.0 with attribution.
7. Bulk exports free but require an API key.
8. Keys created in the existing User Area; no separate developer portal.
9. Only `free` and `partner` tiers modelled.
10. Bulk JSONL export precedes public patch/rack endpoints.
