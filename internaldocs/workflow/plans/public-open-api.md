<!-- Section: PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live) -->

# Public Open API — modules & manufacturers (v1), public patches & racks (v2)

## Status

- [~] Reviewed plan adopted by the product owner. The database/Vault/reader/
  direct-endpoint Hyperdrive/Durable Object foundation is deployed, generated
  types are reconciled, the production Worker is uploaded without a target, and
  authenticated smoke/lifecycle tests pass, `api.patcher.xyz` is live, and the
  temporary smoke Worker is deleted. The owner deferred outer WAF protection;
  the production app release shipped in `6.6.0` (2026-08-17) and `6.7.0`
  (2026-08-20). Final live-doc/archive cleanup and later R2/Layer 3 work remain.
- Public consumer docs route:
  [`docs.patcher.xyz/reference/public-open-api`](https://docs.patcher.xyz/reference/public-open-api)
  (source file `learn/public-open-api.md` in Patcher-docs).
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

- Worker reads Supabase via a **Cloudflare Hyperdrive binding** (`HYPERDRIVE`)
  pointed directly at the Supabase Postgres endpoint with TLS required. Hyperdrive
  already provides pooling, so chaining Supavisor in front was tested, rejected, and
  replaced with Cloudflare's documented direct-endpoint shape. Hyperdrive owns the
  credential; password rotation is a binding re-issue, no Worker source change.
- Driver: `postgres` (postgres.js v3) over the Hyperdrive URL. Rejected: raw TCP
  (unsupported in Workers), postgres.js over plain WebSockets (not a sanctioned Worker
  transport — Hyperdrive is).
- **Pooled-connection constraints — enforced by design:** no `LISTEN`/`NOTIFY`; no
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

### API keys — physical model (stable per-profile credential slot)

**Chosen physical representation — one row per profile.** Every profile owns at
most one `api_keys` row for its whole lifetime. Create, rotate, and re-activate
all UPSERT into the same row, preserving `id`, tier, quota overrides, and the
Durable Object identity keyed off `id`. "Revoke" flips `revoked_at` on the same
row; re-activation flips it back with a fresh secret. Old hash/key history is
not retained for the MVP.

Rejected alternatives (see Decision log for the full 2026-07-24T15:35 backend
plan-review entry):

- Append-only rows with each mint/revoke creating a new `api_keys` id.
  Rejected: usage does not carry over, Durable Object identity resets, and
  self-service becomes a "list of many keys" surface. Owner-approved goal is a
  single, stable slot.
- A separate `profile_api_quota` table holding tier/override per profile with a
  child `api_keys` table. Rejected as over-engineered for a 0..1-key MVP; the
  same continuity is achieved by keeping tier/override columns on the single
  row and rotating secret material in place.

Tables (contract; owner: `postgres`, in migration `…_api_identity.sql`):

- `public.api_tiers (code text PRIMARY KEY CHECK (code ~ '^[a-z_]+$'), monthly_quota int NOT NULL CHECK (>0), per_minute_quota int NOT NULL CHECK (>0), description text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`
  seeded `('free', 5000, 60, …)` and `('partner', 500000, 600, …)`. `partner`
  supersedes and includes `free` — a profile has one total tier and one total
  quota, never additive free + partner quotas.
- `public.api_keys (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, key_prefix text NOT NULL, key_hash bytea NOT NULL, tier_code text NOT NULL REFERENCES public.api_tiers(code), monthly_quota_override int CHECK (>0), per_minute_quota_override int CHECK (>0), label text, created_at timestamptz NOT NULL DEFAULT now(), rotated_at timestamptz, revoked_at timestamptz, last_used_at timestamptz)`
  with `UNIQUE INDEX (key_hash)` and a **full** `UNIQUE INDEX (profile_id)`
  (not partial). The full unique index is the database-level enforcement of
  the one-row-per-profile invariant — including when the row is currently
  revoked. `rotated_at` is `NULL` on first mint and updated on every rotation.
  `revoked_at IS NULL` is the canonical active predicate; a revoked slot can
  be reactivated by a subsequent create-or-rotate, which sets `revoked_at`
  back to `NULL` and updates `rotated_at`.
- `public.api_key_usage_monthly (key_id uuid NOT NULL REFERENCES public.api_keys(id) ON DELETE CASCADE, month date NOT NULL, used int NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (key_id, month))`.
  Lives in the identity migration to keep MVP migration count low. Because the
  slot's `id` is stable across rotation/revoke/re-activate, current-month
  usage is preserved by construction.

Rejected: Postgres `enum` for tier (each tier is a migration; renames painful);
Worker-side tier constants (origin cannot enforce overrides); < 128 bits of
entropy; plain SHA-256 without pepper (offline brute force on hash dump).

**Required SQL migration follow-up (not part of the current local chunk).** The
already-committed `20260724133200_api_identity.sql` shipped with a partial
`UNIQUE (profile_id) WHERE revoked_at IS NULL` index and no `rotated_at`
column, matching the earlier append-and-revoke shape. A separately reviewed
follow-up migration must:

1. Add the `rotated_at timestamptz` column (nullable) to `api_keys`.
2. Replace the partial unique index with a **full** `UNIQUE (profile_id)`
   index, after a preflight that confirms every existing profile owns at most
   one row (delete/consolidate any pre-existing duplicates in a reviewed
   step).
3. Rewrite `create_api_key(p_label)` and `create_partner_api_key(p_profile_id,
   p_label)` as atomic `INSERT … ON CONFLICT (profile_id) DO UPDATE` UPSERTs
   that preserve `id`, and — for the self-service branch — `tier_code`,
   `monthly_quota_override`, `per_minute_quota_override`, so admin-set partner
   promotions and quota bumps survive a routine consumer rotation. The
   partner branch overwrites `tier_code` to `'partner'` and clears any
   temporary overrides only when explicitly requested; a plain partner UPSERT
   without override arguments preserves prior overrides. Both branches return
   the same `(id, raw_key, prefix, tier)` row shape.
4. Preserve `revoked_at`, `last_used_at`, and `api_key_usage_monthly` rows
   across every UPSERT branch. Downgrade (partner → free) remains admin-only
   and stays a Postgres-side SQL edit in the future; it is not exposed via a
   self-service RPC.

This follow-up is registered in the Structural backlog and is separately
gated; the current local chunk continues to describe both the current
partial-index shape and the target stable-slot shape so reviewers see the
delta.

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
  — **Create-or-rotate self-service call for the caller's slot.** Atomic
  `INSERT … ON CONFLICT (profile_id) DO UPDATE` on `api_keys` for
  `auth.uid()`. On first call, inserts a row seeded with `tier_code = 'free'`
  and no overrides. On subsequent calls, updates `key_prefix`, `key_hash`,
  `rotated_at = now()`, sets `revoked_at = NULL` (re-activating a previously
  revoked slot with a new secret), and **preserves** `id`, `tier_code`,
  `monthly_quota_override`, `per_minute_quota_override`, and every
  `api_key_usage_monthly` row keyed by that `id`. Cannot target another
  profile; cannot pick tier; cannot downgrade a partner slot. Raises `28000`
  if unauthenticated. `revoke all … from public, anon, authenticated; grant
  execute … to authenticated`. The returned `raw_key` is the caller's only
  chance to record the new secret; the old secret's HMAC no longer verifies
  once Worker metadata caches expire (see rotation vs revocation below).
- `public.create_partner_api_key(p_profile_id uuid, p_label text) RETURNS TABLE (id uuid, raw_key text, prefix text, tier text)`
  — **Admin-only partner promotion / rotation of the same slot.** Atomic
  `INSERT … ON CONFLICT (profile_id) DO UPDATE` on `api_keys` for
  `p_profile_id`. Sets `tier_code = 'partner'` (partner supersedes and
  includes free; there is one total tier per profile, never additive
  free + partner keys). Updates `key_prefix`, `key_hash`, `rotated_at = now()`,
  sets `revoked_at = NULL`, and preserves `id`, existing quota overrides, and
  `api_key_usage_monthly`. Same return shape as `create_api_key`. `revoke all
  … from public, anon, authenticated`; the migration explicitly revokes the
  default `PUBLIC` pseudo-role grant and grants no execute privilege to
  `authenticated`. Callable only from `service_role`/`postgres`. Explicit test
  asserts `42501` when invoked as `authenticated` or `anon`. **Downgrade
  (partner → free) is admin-only Postgres SQL, not exposed via an RPC.**
- `public.revoke_api_key(p_id uuid) RETURNS void` — owner
  (`profile_id = auth.uid()`) or JWT admin. Sets `revoked_at = now()` on the
  slot; does not delete the row, so `id` and `api_key_usage_monthly` remain
  intact. Raises `42501` on mismatch and `28000` for unauthenticated callers.
  Grant `execute … to authenticated`. Re-activation goes back through
  `create_api_key` (self-service) or `create_partner_api_key` (admin), which
  UPSERTs the same slot with a new secret and clears `revoked_at`.
- `public.verify_api_key(p_hash bytea) RETURNS TABLE (id uuid, profile_id uuid, tier_code text, monthly_quota int, per_minute_quota int)`
  — `stable`. Returns rows **only** for active slots
  (`WHERE key_hash = p_hash AND revoked_at IS NULL`). Zero rows for revoked
  slots, slots whose secret has been rotated (old hash no longer matches),
  and unknown hashes — Worker returns `401 invalid_key`. Effective limits
  are `coalesce(k.monthly_quota_override, t.monthly_quota)` and
  `coalesce(k.per_minute_quota_override, t.per_minute_quota)`. Grant
  `execute … to api_reader` only.
- `public.record_api_key_usage(p_key_id uuid, p_month date, p_used int) RETURNS void`
  — `INSERT … ON CONFLICT (key_id, month) DO UPDATE SET used = greatest(excluded.used, api_key_usage_monthly.used), updated_at = now()`.
  Monotonic. Grant `execute … to api_reader` only. **No table-level insert/update grant
  to `api_reader`.** No HTTP receiver, no shared secret, no Edge Function.

Every RPC migration first revokes default execute from the `PUBLIC` pseudo-role
and from `anon`/`authenticated`, then grants only the role named above.

### Rotation vs revocation — cache window and compromise flow

Routine rotation and compromise response are distinct procedures. Do not
conflate them.

- **Rotation (self-service, non-compromise).** Consumer calls
  `create_api_key(label)` from the Public API panel. Database UPDATE is
  atomic and immediate: the new HMAC is the only value that
  `verify_api_key` will match from that point on. Worker isolate-local
  metadata caches, however, may still hold the previous secret's `(digest
  -> {id, profile_id, tier, quotas})` entry for up to their fixed 60-second
  TTL. During this ≤60 s window a Worker isolate that already validated the
  old key can continue to serve the old key from cache without a
  `verify_api_key` round-trip. This is safe because rotation is **not** a
  compromise response — the old secret is being replaced for hygiene, and
  ≤60 s of dual acceptance is a deliberate trade-off to keep the DB
  round-trip cost bounded.
- **Revocation (self-service).** Owner calls `revoke_api_key(id)` from the
  panel. Same ≤60 s bound as above: existing isolate caches expire naturally
  and refuse the key on the next verify. Acceptance criterion:
  post-revocation request refusal within ≤60 s (already in Acceptance
  criteria).
- **Compromise flow (owner-directed emergency).** Because the ≤60 s cache
  window is unsafe when the secret is known to be leaked, compromise is
  handled as: **(1) revoke the slot, (2) wait ≥60 s so every isolate cache
  expires and no old secret is still accepted, (3) create a new secret via
  `create_api_key` or admin `create_partner_api_key`.** For emergency
  mitigation while the ≥60 s bound has not elapsed, add a coarse WAF block
  on the leaked key's public prefix or on the abuser IP; this takes effect
  in seconds.
- **Slot identity persistence.** Rotation, revocation, and re-activation all
  preserve `id`, Durable Object identity (namespace `API_KEY_COUNTER`
  keyed by `id`), and the current month's `api_key_usage_monthly` row. A
  freshly rotated key does **not** reset per-minute or monthly quota. A
  re-activated slot resumes the same DO state; the DO's persisted counters
  are unchanged by the DB write.

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
- Filters: `manufacturer_id` (int), `hp` (int), `tag` (int id), `standard` (int id).
  `?q=` is deferred with `pg_trgm` to Polish; MVP returns
  `400 unsupported_parameter`.
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

- [x] Create `cloudflare/public-api/` (mirrors `cloudflare/image-proxy/`):
  `wrangler.jsonc`, `src/index.ts` (router + pipeline in the order above),
  HMAC auth + isolate LRU metadata cache, `src/quota.ts` / quota response
  helpers, named parameterized catalogue access, `src/api-key-counter.ts` (DO
  class), `openapi.yaml`, `README.md`, and `RUNBOOK.md`.
  - [x] Foundation: Bearer parsing/HMAC byte contract, URL normalization and
    cursor validation, shared-cache response contract, pure quota boundary
    logic, fail-closed route skeleton, OpenAPI route/security skeleton, and
    focused Node tests.
  - [~] Gated integration:
    - [x] Local `ApiKeyCounter` Durable Object persistence/alarm implementation.
    - [x] Key metadata LRU + `verify_api_key`, Worker-to-DO request-path wiring,
      and Hyperdrive RPC query catalog.
    - [x] Catalogue named queries and Cache API serving.
- [x] Local-only migrations authored and statically validated; remote apply,
  reader LOGIN credential, Vault pepper creation, and Cloudflare provisioning remain
  separately gated:
  - `20260724133100_api_reader_roles.sql` — idempotently creates
    `api_view_owner NOLOGIN` and `api_reader NOLOGIN`, then grants only
    `public` schema usage. No base-table grants to `api_reader`; no password or
    LOGIN appears in git. A separately approved runbook step would have to
    provision any runtime credential outside migrations.
  - `20260724133200_api_identity.sql` — creates `api_tiers` + idempotent
    `free`/`partner` seed, `api_keys` + owner/JWT-admin SELECT-only RLS,
    `api_key_usage_monthly`, private Vault-pepper mint helper, and RPCs
    `create_api_key`, `create_partner_api_key`, `revoke_api_key`,
    `verify_api_key`, `record_api_key_usage` with explicit revoke-then-grant
    EXECUTE hygiene.
  - `20260724133300_api_v1_views.sql` — every `api_v1_*` view is owned by
    `api_view_owner`, `WITH (security_barrier = on)`, uses the reviewed
    exposure predicates + output allowlists, grants only exact base columns to
    `api_view_owner`, adds permissive `api_view_owner` SELECT policies on the
    existing RLS-enabled `modules` and `manufacturers`, leaves ancillary table
    RLS untouched, grants view SELECT to `api_reader`, adds partial/FK indexes,
    and comments the accepted `security_definer_view` pattern.
  - Optional `…_pg_trgm_search.sql` deferred to Polish; MVP returns
    `400 unsupported_parameter` for `?q=`.
- [ ] Cloudflare (contingent gates): DNS `api.patcher.xyz`; Worker route +
  custom domain; Hyperdrive binding `HYPERDRIVE`; DO namespace
  `API_KEY_COUNTER`; Worker secret `API_KEY_PEPPER` (mirrors Vault
  `api_key_pepper`); coarse WAF. R2 is Structural.
- [x] Implement six MVP endpoints + the exact request pipeline; error
  envelope `{ error: { code, message, request_id } }`; per-response
  `X-RateLimit-Limit-Minute` / `-Remaining-Minute` / `-Limit-Month` /
  `-Remaining-Month`.
- [x] Manual partner runbook — SQL editor as `postgres`:
  `select public.create_partner_api_key('<profile_uuid>', 'Vendor X preview')`.
- [x] OpenAPI 3.1 spec committed and covered by local Worker contract tests.
- [x] OpenAPI documentation accuracy audit completed for emitted headers,
  HEAD support, 503 error modes, and error-code enum drift.
- [x] Local developer/operator docs committed:
  [`cloudflare/public-api/README.md`](../../../cloudflare/public-api/README.md)
  and [`cloudflare/public-api/RUNBOOK.md`](../../../cloudflare/public-api/RUNBOOK.md).
- [x] Public consumer docs page route fixed in `Patcher-docs`:
  [`docs.patcher.xyz/reference/public-open-api`](https://docs.patcher.xyz/reference/public-open-api)
  (source file `learn/public-open-api.md`; owned by the separate coordinated docs
  session).
- [ ] Baseline observability from built-in Workers logs/metrics (5xx, 429,
  cache-hit ratio, DB error rate). Logpush is Structural.

## Structural layer (self-service keys, usage, bulk export)

### Decision — validate API first, ship self-service UI in a controlled preview

Product-owner decision (2026-07-24T14:50+02:00): the eventual public state is
User Area self-service, but the first proof point is that the API actually
works against a **preview** rollout. Local, autonomous, no-approval work runs
now (Angular UI behind a feature flag, backend wiring, tests, docs). Every
remote apply, secret, credential, DNS, and preview-to-public promotion is
batched into a single manual-operator window (see below) so the owner is only
consulted once. `sozmatmywjpstwidzlss` is the intended remote project;
`develop` may still ship the UI safely because it is flagged off in
production.

### Layering (fixed by AGENTS.md §4)

```text
DeveloperApiKeysComponent
  -> DeveloperApiKeysDataService          (component-scoped @Injectable())
  -> SupabaseService.apiKeys              (root API namespace)
  -> Supabase RPC / api_v1_* views
```

- Component and data service extend `SubManager`, call `super()`, and use
  `takeUntil(this.destroy$)` / template `async` pipes only.
- Data service uses `ReplaySubject<void>(1)` for identity (current
  `auth.uid()` refresh trigger), `Subject<{ label: string }>` for
  `create$`, `Subject<{ id: string }>` for `revoke$`, `Subject<void>` for
  `load$` and `copySucceeded$`.
- `SupabaseService.apiKeys` is a new root-provided namespace on the
  existing `SupabaseService`; it mirrors the `marketplace` / `get` /
  `add` namespaces already there and returns typed observables. No direct
  Supabase client access from the component (layering rule R1).

### Physical files touched — Structural

| Path | Change |
|---|---|
| `src/app/features/backbone/user-management/developer-api-keys/developer-api-keys.component.{ts,html,scss,spec.ts}` | New standalone component co-located with Account Management. Uses `ChangeDetectionStrategy.OnPush`, `providers: [DeveloperApiKeysDataService]`, and renders as a dedicated Public API subsection inside the existing account surface. |
| `src/app/features/backbone/user-management/developer-api-keys/developer-api-keys-data.service.{ts,spec.ts}` | New component-scoped data service (`@Injectable()`, no `providedIn`) reactive over `_vm$`, `load$`, `create$`, `revoke$`, and copy state; delegates to `SupabaseService.apiKeys`. Two-step inline revoke confirmation via `BehaviorSubject<string \| null>`, not a `MatDialog`. |
| `src/app/features/backbone/user-management/user-management.component.{html,ts,scss,spec.ts}` | Import the standalone API-key component and add `@if (developerApiEnabled) { <app-developer-api-keys/> }` after the Account ID row and before the Danger Zone, wired to `environment.features.developerApiEnabled`. The flag wraps the separator and full subsection so off means no DOM or spacing residue. |
| `src/app/features/backend/supabase.service.ts` | Add `readonly apiKeys!: ReturnType<typeof createApiKeysNamespace>` and initialize in `constructor` (same shape as `add = createAddNamespace(...)`). Provides `getOwnKeySlot()` (returns the caller's single slot or `null`), `getOwnUsage(keyId, month?)`, `createOrRotateOwnKey(label)` (single method for both first-mint and rotate-in-place, RPC-side is idempotent by design), and `revokeOwnKey(id)`. Cache-buster keys registered against `api_keys` + `api_key_usage_monthly` (see `patterns/BACKEND_METHODS.md`). |
| `src/app/features/backend/supabase-api-keys.ts` (new) | Implements `createApiKeysNamespace(client, session$)`. Reads through `api_keys` / `api_tiers` / `api_key_usage_monthly` (RLS enforces owner-only). Writes only via RPCs `create_api_key(p_label)` (create-or-rotate the single slot) and `revoke_api_key(p_id)` — never direct DML. |
| `src/app/features/backend/DatabaseStrings.ts` | Register three new consts: `api_keys`, `api_tiers`, `api_key_usage_monthly`. Layering rule R2 keeps this the only file that owns table-name constants. |
| `src/backend/database.types.ts` | Regenerated by `pnpm updateBackendTypes` **only after** the migrations are applied to an approved remote/isolated Supabase target. Commit the diff in an isolated chunk. |
| `src/environments/environment.model.ts` + `generate-env.js` | Add `developerApiEnabled: boolean` to the `features` block. Default: `false` in `environment.prod.ts`, `true` in dev-generated `environment.ts`. Update `scripts/tests/generate-env.test.cjs` regex assertions. |
| `user-management.component.spec.ts` + API-key component/data-service specs | Assert the subsection is gated by `developerApiEnabled`, the approved account placement, one-time reveal, copy, and inline revoke behavior. |

### Self-service behavior — exact contract (0..1 slot)

The consumer surface owns **exactly one credential slot per profile**, not a
list of many keys. The panel is a three-state machine over that slot:
**none / active / revoked**. No "list" affordance, no bulk operations, no
per-key naming beyond a single label attached to the slot.

1. **Load** — `load$` triggers a fetch for the caller's single `api_keys`
   row (RLS filters to `profile_id = auth.uid()`) and, if it exists, the
   current calendar month's usage row keyed by that slot's stable `id`.
   `revoked_at IS NULL` means the slot is currently active; `revoked_at IS
   NOT NULL` means the slot exists but is revoked and can be re-activated.
   Missing row means the profile has never minted a key.
2. **Slot display** — for the slot: label, `key_prefix` (never the hash),
   tier code (`free` or `partner`), `created_at`, `rotated_at` (when
   present), `last_used_at` (relative), effective monthly limit
   (`monthly_quota_override ?? tier.monthly_quota`), current-month used,
   remaining. The raw secret is **never** re-displayed after mint or
   rotation. Copy speaks in singular ("your API key", not "your API keys").
3. **Create or Rotate** — one primary action. When the slot is empty:
   `Create API key`. When the slot is active: `Rotate API key`. Both call
   `SupabaseService.apiKeys.createOwnKey(label)` which invokes the same
   `create_api_key(label)` RPC. Rotation requires an inline confirmation
   step warning that the previous secret stops verifying within ≤60 s.
   The RPC returns `{ id, raw_key, prefix, tier }` exactly once. UI enters
   a one-time-reveal state with a copy button
   (`navigator.clipboard.writeText` fallback → snackbar success/failure
   via existing `SharedConstants.errorCustom`/`successCustom`). Reveal
   panel offers `I copied it` → transitions back to the active-slot view
   and discards the raw key from memory (`_revealedRawKey$.next(null)`).
   Refresh, route change, and component destroy all discard the raw key.
   Because the slot preserves `id`, `tier_code`, and overrides, a `free`
   consumer stays `free` after rotation and a partner-promoted profile
   stays `partner` after rotation.
4. **Revoke** — two-step inline confirm mirroring
   `user-address-book.component.ts::confirmDelete`. First click sets
   `_revokeConfirmId$.next(id)` and shows an inline warning row noting
   "revoke breaks any app or script using this key; you can re-create a
   new key on the same slot afterwards". Second click dispatches
   `revoke$` → `revoke_api_key(id)` RPC → optimistic slot refresh into
   the "revoked" state. The slot row remains visible with a `Create API
   key` action that re-activates the same slot (calling `create_api_key`
   again clears `revoked_at` and mints a new secret while preserving the
   slot's `id` and current-month usage). Cancel is always visible during
   the confirmation step.
5. **Quota semantics** — "60 requests/minute · 5,000/month (free tier)"
   for free slots and the equivalent partner line ("600 requests/minute ·
   500,000/month (partner tier)") is a fixed label sourced from a
   client-side constant keyed by the slot's `tier_code`, **not** from
   `api_tiers` (which is not readable by `authenticated` in the reviewed
   grants and would need a new view or RLS opening; deferred as out of
   scope for MVP). Monthly usage figures come from `api_key_usage_monthly`
   filtered by `key_id = <slot.id>` and `month = date_trunc('month', now())`.
   Usage may lag by up to one flush interval — surface a small "usage
   updates within a few minutes" hint next to the number.
6. **One slot, no cap needed.** The database enforces one row per
   profile via `UNIQUE (profile_id)` and every mutation is an UPSERT on
   the same row, so no per-profile active-key cap is required and the UI
   never renders a "you have N keys" counter. The historical
   "per-profile active-key cap" question is answered by the stable-slot
   design and is resolved as a standing approval in the Approvals
   ledger; the previously-planned `CHECK` cap migration is superseded
   and dropped from the Polish backlog.
7. **Error taxonomy** — mint/rotate failures map by SQLSTATE:
   `28000` → sign-in-required copy + redirect prompt; `42501` → generic
   "not allowed"; anything else → snackbar + inline retry. Load failures
   never destroy previously-loaded rows; they surface a banner with
   retry.
8. **Accessibility & voice** — copy follows `product/PRINCIPLES.md`:
   plain, warm, exact. Labels: "Create your API key" / "Rotate your API
   key" / "Copy your key — this is the only time it will be shown" /
   "Revoke". Rotation confirmation: "Rotating replaces your current key.
   Any app or script using the current key will stop working within a
   minute of rotation." Revoke confirmation: "Revoking will break any
   app or script still using this key. You can create a new key
   afterwards on the same slot."
9. **Placement/hierarchy is approved.** Render a dedicated "Public API"
   subsection inside `/user/account`, after the identity rows and before
   the Danger Zone. It is a peer account-control block, not an
   accordion, new route, User Area card, Marketplace surface, or
   public-profile surface. A tab/child route is deferred until the
   developer area has at least three distinct capabilities such as
   keys, OAuth, and webhooks.

### Feature-flag / visibility model

- New `environment.features.developerApiEnabled` boolean.
- Dev: `true`. Production build: `false`. Written into
  `environment.prod.ts` by `generate-env.js` so the shipped bundle never
  renders the panel until the operator flips it on.
- `UserManagementComponent` reads the flag and conditionally renders the
  subsection; the standalone component itself is a no-op when instantiated with
  the flag off (defensive `@if` guard in template).
- Rollout order: land UI on `develop` with the flag off in production,
  ship the remote API rollout, verify against a preview key, **then** flip
  `environment.prod.ts` to `true` in a single-line edit commit and
  release.
- Feature flag stays as long as the API is preview-only; removal is a
  Polish-layer cleanup, not part of this rollout.

### Coordination

- Widgets-pilot session consumes `GET /v1/manufacturers/{id}?include=modules`;
  its preview key is the promoted-partner secret from the controlled owner
  profile's slot minted during the batched operator window. There is no
  separate parallel widget key — every profile owns exactly one slot.

### Structural — remaining backlog

- [x] Account Management Public API subsection + data service + `SupabaseService.apiKeys`
  namespace as specified above. Local implementation is autonomous but
  gated behind the feature flag and does **not** land on production until
  the API preview is proven.
- [x] `DatabaseStrings.ts` registration for `api_keys`, `api_tiers`,
  `api_key_usage_monthly` (before any backend method that references
  them).
- [x] The consolidated local identity migration includes `rotated_at`, a
  full `UNIQUE (profile_id)`, and atomic UPSERT rewrites of
  `create_api_key` and `create_partner_api_key` that preserve `id` and —
  in the self-service branch — `tier_code` /
  `monthly_quota_override` / `per_minute_quota_override`. Static contract
  tests cover the slot invariant; remote apply remains bundled into the
  batched operator window.
- [ ] `pnpm updateBackendTypes` — **runs only after** the migrations are
  applied to an approved remote/isolated target; commit generated types
  in a separate chunk.
- [ ] Nightly R2 export job (03:00 UTC); private bucket
  `patcher-public-datasets`; `GET /v1/datasets` + streamed
  `GET /v1/datasets/{name}` after auth + consume.
- [ ] Cloudflare Logpush → durable sink (recommended R2).
- [x] `cloudflare/public-api/RUNBOOK.md` — pepper rotation (incident
  procedure), reader password rotation via Hyperdrive re-issue, DO
  management, dataset recovery, plus stable-slot rotation vs revocation
  and the compromise flow.

### Approved designer handoff

- Location: dedicated "Public API" subsection inside the existing
  `/user/account` account surface, after Account ID and before the Danger
  Zone. It is never rendered in `/user/area`, Marketplace, public profiles,
  or global navigation.
- Visual weight: neutral separator + semantic section heading + solid
  account-control surface. No extra Hero card, accordion, decorative
  gradient, or new route. The one-time raw-key reveal uses a restrained
  amber warning edge with `role="alert"` and a visible copy action.
- Interaction: inline key-label form, one-time reveal and dismissal,
  two-step inline revoke, current-month usage when available, and a
  low-weight link to the public API documentation.
- Responsive: desktop rows fit the existing 44rem account surface; tablet
  and mobile reflow each key to two lines, with full-width create/dismiss
  actions on narrow screens. Long labels truncate; the raw key remains
  selectable and copyable.
- Future migration: use a tab/child route only when the developer surface
  grows to at least three distinct capabilities.

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
- [ ] **Stable slot: single active row per profile.** After any sequence of
  `create_api_key` / `create_partner_api_key` / `revoke_api_key` calls for a
  given profile, `SELECT count(*) FROM public.api_keys WHERE profile_id = $1`
  returns exactly `1`, and the full `UNIQUE (profile_id)` index rejects any
  attempted second insert with `23505`.
- [ ] **Stable id across rotation.** Calling `create_api_key(label)` on an
  existing active slot returns the same `id` as the pre-rotation slot;
  `key_prefix`, `key_hash`, and `rotated_at` change; `tier_code`,
  `monthly_quota_override`, and `per_minute_quota_override` are preserved.
- [ ] **Usage continuity across rotation and revoke/reactivate.** The current
  `api_key_usage_monthly` row for the slot is unchanged by any of
  `create_api_key`, `create_partner_api_key`, `revoke_api_key`, and a
  subsequent re-activation, so a profile cannot reset its monthly consumption
  by rotating.
- [ ] **Partner promotion preserves slot, downgrade is admin-only.**
  `create_partner_api_key(profile_id, label)` UPSERTs the same slot, sets
  `tier_code = 'partner'`, preserves `id` and usage, and does not create a
  second row. A subsequent self-service `create_api_key(label)` does **not**
  downgrade `tier_code` back to `'free'`; only a Postgres-level SQL edit by
  an admin can change `tier_code` back to `'free'`.
- [ ] **Old secret stops verifying within ≤60 s of rotation.**
  Post-`create_api_key` rotation, the previous secret returns `401` within
  ≤60 s (isolate metadata cache expiry), and revoke → wait ≥60 s → new create
  is a valid compromise-response sequence.

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

### Local migration chunk validation notes

- 2026-07-24T13:45+02:00 — Added focused static contract coverage in
  `scripts/tests/public-open-api-migrations.test.cjs` plus package script
  `test:functions:public-open-api-migrations`, included in the
  `test:functions` aggregate. The test asserts the three migration filenames
  and order; absence of LOGIN/password/remote secret creation; RLS/RPC grant
  hygiene; actual identifier use (`"public"`, `"isApproved"`,
  `"manufacturerId"`, `submitter`, `moduleid`); output exclusions including
  panel file fields; no ancillary-table RLS enabling; `api_reader` raw-table
  denial represented by base-table revokes + view-only grants; and local-only
  infrastructure scope.
- 2026-07-24T13:45+02:00 — Docker/local migration application was not run:
  this checkout has migrations but no `supabase/config.toml` and no established
  safe isolated migration-apply script. To avoid resetting or interfering with
  a user's linked/running Supabase instance, validation stayed on static
  contract tests and repo checks. Remote apply, `pnpm updateBackendTypes`, and
  Supabase advisors remain gated until an approved isolated/remote target
  exists.

### Local documentation chunk validation notes

- 2026-07-24T14:08+02:00 — Added the local Worker developer/operator overview
  at `cloudflare/public-api/README.md` and the gated rollout/rollback runbook at
  `cloudflare/public-api/RUNBOOK.md`. No in-app UI surface was added; discovery
  is via repo README/internal wiki links only.
- 2026-07-24T14:08+02:00 — Validation passed:
  `node scripts/checks/check-docs.cjs`,
  `pnpm test:functions:public-api-worker` (33/33),
  `pnpm test:functions:public-open-api-migrations` (11/11), and the
  no-dependency OpenAPI smoke check documented in the Worker README.
  `pnpm install --frozen-lockfile` was run first because this worktree had no
  `node_modules`; it did not change tracked manifests.
- 2026-07-24T14:30+02:00 — OpenAPI documentation accuracy audit passed after
  documenting reusable response headers, explicit HEAD operations, generalized
  503 service-unavailable modes, and emitted error codes. Validation passed:
  `pnpm test:functions:public-api-worker` (33/33) and
  `node scripts/checks/check-docs.cjs`.

### Preview validation strategy (what proves the API works before public rollout)

Two orthogonal questions must be answered before UI polish or public
announcement: **"does the local build behave correctly?"** and **"does the
same code behave correctly against the real Supabase + Hyperdrive + DO
stack?"**. This plan separates them so autonomous work can finish
everything in the first question without touching remote resources.

Provable locally, autonomously, right now (no owner presence required):

- Worker unit + contract tests: `pnpm test:functions:public-api-worker`
  (currently 34/34). Extend with a small set of **preview-mode**
  scenarios: (a) valid preview key consuming quota; (b) revoked key
  refused within 60 s of a metadata cache expiry; (c) shared cache hit
  serving distinct per-key rate headers.
- Migration static-contract tests: `pnpm test:functions:public-open-api-migrations`
  (currently 11/11). Extend with a whitelist assertion for the
  Structural-layer `api_keys` / `api_tiers` / `api_key_usage_monthly`
  grants used by the new UI namespace.
- OpenAPI smoke check as documented in `cloudflare/public-api/README.md`.
- Angular unit specs for `DeveloperApiKeysComponent`,
  `DeveloperApiKeysDataService`, and the new `SupabaseService.apiKeys`
  namespace under `pnpm test-headless`. `MatSnackBar` and clipboard are
  mocked; RPC responses are stubbed.
- `pnpm lint` covering the new layering (R1–R4).
- `node scripts/checks/check-docs.cjs`.
- `generate-env.js` regeneration + `scripts/tests/generate-env.test.cjs`
  extension for the new `developerApiEnabled` flag.

Not provable without remote infrastructure — batched into the operator
window below:

- `verify_api_key` byte compatibility between Supabase `extensions.hmac`
  and Worker `crypto.subtle.sign` (an interop **fixture** already lives
  in the Worker tests; the live end-to-end path still requires a mint
  through the RPC against the real Vault pepper).
- `api_reader` role's actual raw-table denial: `SELECT * FROM public.modules`
  as `api_reader` failing with `42501`. Local static tests assert grant
  hygiene but cannot execute against a running Postgres.
- Durable Object monthly rollover under real cross-isolate load.
- Cloudflare cache hit ratio ≥ 95% under synthetic load.
- Revocation ≤ 60 s in production Worker isolates (multiple colos).
- Public docs page reachability at `docs.patcher.xyz/reference/public-open-api`
  is already live (owned by Patcher-docs); operator only re-checks it after
  API go-live.

### Controlled preview rollout (owner-present)

Preview means: real Supabase + Cloudflare stack, but the Worker route is
either on the Cloudflare-generated preview URL for the deployed version
or on a temporary hostname (e.g. `api-preview.patcher.xyz`) that is
**not** referenced from the docs page. `wrangler.jsonc` currently
disables both `workers_dev` and `preview_urls`; the preview step must
either flip these on for a bounded window or use a versioned deployment
route. Choose one before the operator window; do not both flip flags and
add an alias in the same commit.

Preview rollout order (compressed from `cloudflare/public-api/RUNBOOK.md`
sections 2–13, with the new self-service UI gates inserted):

1. Apply the reviewed migration foundation to the target
   Supabase project (`sozmatmywjpstwidzlss`, `eu-central-1`) after
   backup/PITR check. The identity migration includes `rotated_at`, the
   full `UNIQUE (profile_id)` index, and the reviewed atomic UPSERT RPCs;
   the restricted Vault-permission follow-up grants the managed migration
   owner only the pgsodium key-ID role needed by `vault.create_secret`.
2. `pnpm updateBackendTypes` from the same worktree; commit the diff.
3. Create `api_key_pepper` in Supabase Vault; mirror to Worker secret
   `API_KEY_PEPPER`.
4. Provision `api_reader` LOGIN password via SQL editor as `postgres`;
   paste directly into Cloudflare Hyperdrive; never commit.
5. Create Durable Object namespace `API_KEY_COUNTER`.
6. Deploy Worker to the preview route (not the public `api.patcher.xyz`
   custom domain yet).
7. Preview key sequence for a **controlled owner profile** (the same
   profile is used for every step below; there is no simultaneous
   free + partner key because a profile owns exactly one slot):
   1. From the owner's User Area session (with the newly landed
      flag-gated panel), call `create_api_key('preview-smoke')`. The
      slot is created at tier `free`.
   2. Exercise runbook §11 smoke and §12 quota tests with that free
      key.
   3. In the SQL editor as `postgres`, call
      `create_partner_api_key(<owner_profile_id>, 'partner-preview')`.
      This UPSERTs the **same** slot in place, promoting `tier_code`
      to `partner`, updating `rotated_at`, and preserving `id`,
      current-month `api_key_usage_monthly`, and any operator-set
      quota overrides. The response returns the new partner secret;
      the previous free secret stops verifying within ≤60 s.
   4. Rotate the partner slot once via the panel's Rotate action
      (`create_api_key('preview-smoke')` — self-service must preserve
      the promoted `partner` tier). Confirm the returned tier is
      `partner`, that `id` is unchanged, and that current-month usage
      is preserved.
   5. Revoke via the panel; confirm the runbook §12 revocation window
      (≤60 s to `401 invalid_key`).
   6. Re-activate via the panel by pressing `Create API key` on the
      revoked slot; confirm the same `id`, the preserved `partner`
      tier, and current-month usage continuity.
8. Run runbook §12 quota + revocation + cache tests using the preview
   secrets minted above.
9. Watch runbook §13 monitoring for at least one flush cycle (5 min)
   with zero `configuration_error` / `quota_unavailable` /
   `origin_unavailable`.
10. Only after the preview passes: swap DNS to the custom domain
    `api.patcher.xyz`, flip `environment.prod.ts` `developerApiEnabled`
    to `true`, and cut a release.

Rollback at any preview step is: disable the Worker route, keep migrations
in place, revoke the preview slot. The UI stays flag-off; no user sees a
broken panel.

### Batched manual-operator window (single owner session)

Owner-present rollout status:

1. [x] Apply the reviewed migration foundation and Vault permission
   follow-up; reconcile generated types.
2. [x] Create the 32-byte base64 Vault pepper and mirror it only to the
   Worker secret.
3. [x] Provision the `api_reader` LOGIN credential and configure
   Hyperdrive against the direct Supabase Postgres endpoint with TLS and
   SQL result caching disabled.
4. [x] Create `API_KEY_COUNTER`; upload the production Worker with
   `workers_dev: false`, preview URLs off, and no target/custom domain.
5. [x] Deploy a temporary authenticated smoke Worker and run catalogue,
   ETag/304, HEAD, quota-header, usage-reporting, and MISS→HIT cache tests.
6. [x] Create the controlled owner partner slot; rotate, revoke, wait for
   invalidation, and re-activate it while preserving slot ID, partner
   tier, quotas, and current-month usage. The final raw key exists only
   in the owner's approved secret store.
7. [x] Keep `pg_trgm` and trigram GIN indexes deferred to Polish; `?q=`
   remains `400 unsupported_parameter`.
8. [~] Coarse WAF/IP abuse rules were explicitly deferred by the owner for
   initial launch; mandatory keys and per-key Durable Object quotas remain.
9. [~] The production Worker is attached to `api.patcher.xyz`, live smoke
   monitoring passes, live-status docs are in progress, and the temporary
   smoke Worker is deleted. `developerApiEnabled` is committed on `develop`;
   the app release and final archive remain.
10. [ ] Structural follow-ups: private R2 bucket
    `patcher-public-datasets`, Cloudflare Logpush, and nightly export job.

Inputs the owner must have ready before the window opens:

- Supabase project login with SQL editor + Vault + advisors access on
  `sozmatmywjpstwidzlss`.
- Cloudflare zone access for `patcher.xyz` with Workers, DO,
  Hyperdrive, secrets, DNS, WAF.
- 90-minute uninterrupted block. Expected wall-clock is ≤60 min if no
  gate fails; the buffer covers advisor re-review time.

The historical per-profile active-key cap question is **not** an input
to this window: it is answered by the stable-slot design (one row per
profile enforced by a full unique index) and moved to Standing
approvals.

### Docs updates after the API is truly live

Only after DNS custom domain `api.patcher.xyz` serves traffic and the
Worker has passed §11–§13 checks:

- [x] Root `README.md`: mark the Public Open API as live and link the
  public docs page. (Already done — see "Public Open API" section, live
  link + `docs.patcher.xyz/reference/public-open-api`.)
- [x] `cloudflare/public-api/README.md`: record the deployed-but-unrouted
  intermediate state without embedding real IDs.
- [x] `cloudflare/public-api/RUNBOOK.md`: keep the rollback/incident
  procedures; mark the initial rollout section as complete with the
  date. (Updated 2026-08-22: flag shipped in `6.6.0`/`6.7.0`.)
- [ ] Patcher-docs `learn/public-open-api.md`: unpublish any "preview"
  banner; publish key-management instructions that mirror the User Area
  panel behavior.
- [ ] This plan: append a "Rollout complete" Decision log line with the
  effective date, then move `plans/public-open-api.md` to `plans/done/`
  and archive one line to `internaldocs/workflow/COMPLETED.md` with the
  commit hash.
- [ ] `CURRENT_FEATURE.md`: reset to `_No active feature._` and bump the
  `Updated:` date.

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
  - **Gateway**: Cloudflare Worker + Hyperdrive was kept. Supavisor
    transaction mode was the initial transport assumption and was later
    superseded by the rollout-tested direct Supabase endpoint (recorded
    below). Rejected Supabase Edge Function — every unique cache miss would
    burn the exact invocation quota this API exists to protect.
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
    `create_api_key(label)` seeds new slots at `free` for `auth.uid()`;
    manual partner grants use separate
    `create_partner_api_key(profile_id, label)` executable only by
    `service_role`/`postgres`, with explicit lockout test. Rejected
    Worker-mint (still needs `service_role` or a SECURITY DEFINER RPC
    callable by `authenticated`; no secret removed). `service_role` never
    placed in the Worker. *(Superseded 2026-07-24T15:35 — see the
    stable-slot entry: both RPCs are now atomic UPSERTs on a single
    per-profile slot; self-service preserves the slot's tier/overrides
    across rotation instead of always minting a fresh free-tier row.)*
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
- 2026-07-24T13:20+02:00 — Safe MVP foundation implemented under
  `cloudflare/public-api/` without provisioning remote resources or touching
  Supabase. Added fail-closed routing, HTTP Bearer parsing, 16-byte key decode +
  HMAC-SHA256 interoperability fixture, canonical query/cache keys, opaque
  cursor validation, cache-body/per-key-header separation, pure exact quota
  rollover/boundary logic, OpenAPI skeleton, and six focused tests. Validation:
  `pnpm test:functions:public-api-worker` (6/6), `pnpm lint` (exit 0), reviewer
  verdict APPROVE.
- 2026-07-24T13:30+02:00 — Product owner approved authoring and Docker/local
  validation of the three reviewed migrations only. Remote apply, reader LOGIN
  credential, Vault secret creation, remote type generation, and Cloudflare
  provisioning remain explicitly unapproved.
- 2026-07-24T13:45+02:00 — Local-only backend migration chunk authored as the
  three reviewed migrations, in role → identity → views order. Identity uses a
  private mint helper to avoid duplicating Vault/HMAC logic; the helper has no
  caller grants, while public RPCs revoke `PUBLIC`/`anon`/`authenticated` first
  and then grant only `authenticated`, `service_role`, or `api_reader` per the
  reviewed contract. View ownership uses `api_view_owner` +
  `security_barrier=on` with accepted `security_definer_view` comments, and
  `api_reader` receives view/RPC access only. No remote Supabase, Vault,
  credential, DNS, Hyperdrive, Durable Object, WAF, pg_trgm, or Cloudflare work
  was performed.
- 2026-07-24T14:00+02:00 — Post-implementation reviewer verdict APPROVE WITH
  CHANGES. Added an explicit unauthenticated guard to `revoke_api_key` (avoids
  SQL NULL comparison bypass) and changed tier seed replay to
  `ON CONFLICT DO NOTHING` so operator-tuned quotas are never overwritten.
  `verify_api_key` remains an intentional digest oracle available only to the
  private `api_reader` credential; the public Worker never exposes arbitrary
  digest lookup and still applies authentication/quotas at its boundary.
- 2026-07-24T14:20+02:00 — Local-only `ApiKeyCounter` Durable Object component
  implemented without creating a Cloudflare namespace or deploying resources.
  Quota consumption persists exact minute/month counters transactionally before
  success, refreshes effective limits, preserves monotonic pending reports across
  month rollover, and retries failed reporting at 30 s / 5 min / 30 min without
  traffic shortening the backoff. Wrangler declares only the class binding and
  SQLite migration, with no fabricated remote ID. Validation:
  `pnpm test:functions:public-api-worker` (14/14), `pnpm lint` (exit 0), scoped
  reviewer verdict APPROVE. Worker-to-DO wiring remains the next isolated chunk.
- 2026-07-24T14:40+02:00 — Local authentication/quota pipeline wired without
  provisioning Hyperdrive or configuring credentials. Postgres.js 3.4.9 uses
  parameterized named RPC queries for `verify_api_key` and
  `record_api_key_usage`; metadata is stored only by digest in a bounded
  isolate-local LRU with a fixed hard expiry of 60 seconds. Valid keys consume
  quota through the per-key Durable Object before the still fail-closed origin;
  missing bindings, malformed external responses, and query failures return
  stable 503 envelopes. DO 429 responses retain only the current request's quota
  headers. Wrangler enables `nodejs_compat` but contains no fabricated
  Hyperdrive ID. Validation: `pnpm test:functions:public-api-worker` (23/23),
  `pnpm lint` (exit 0), reviewer verdict APPROVE.
- 2026-07-24T15:10+02:00 — Local Worker catalogue serving completed for all
  six v1 routes. Explicit parameterized queries read only `api_v1_*` views;
  module relation includes are batch-loaded, cursor pagination supports fixed
  `name`/`id` sort modes, sparse fields are allowlisted, and `q` remains a
  deliberate 400 until pg_trgm is separately approved. Shared cache entries are
  authorization-independent and exclude request/quota headers; every hit,
  stale response, and 304 still authenticates and consumes the current key's
  quota first. Cache freshness/SWR, SHA-256 ETags, HEAD, and per-request IDs are
  implemented, and OpenAPI now documents the complete local contract. Module
  `switches` uses its real structured JSON array shape rather than a string.
  Validation: `pnpm test:functions:public-api-worker` (33/33), `pnpm lint`
  (exit 0), targeted Worker TypeScript check (exit 0), reviewer verdict APPROVE.
  No database, Hyperdrive binding, cache namespace, DNS, secret, or Worker
  deployment was touched.
- 2026-07-24T14:08+02:00 — Local technical/operator documentation completed in
  this repository. The docs explicitly preserve all remaining remote gates
  (Supabase apply/RLS, Vault pepper, `api_reader` LOGIN credential, Hyperdrive,
  Durable Object namespace, Worker secrets/deploy, DNS, WAF/cache, R2, and
  monitoring) and intentionally add no app UI surface because the natural
  placement is repository/operator documentation rather than product UX.
- 2026-07-24T14:14+02:00 — Cross-repo public docs route fixed as
  `https://docs.patcher.xyz/reference/public-open-api` from Patcher-docs source file
  `learn/public-open-api.md`. Added Patcher-side discoverability links in the
  root README and `cloudflare/public-api/README.md`; no in-app UI surface was
  added.
- 2026-07-24T14:30+02:00 — OpenAPI contract documentation decision: every
  documented GET route also documents HEAD because the Worker accepts HEAD and
  runs it through the same auth/quota/cache/ETag/error path without a body. The
  spec now lists the per-request rate-limit headers, `X-Request-ID`, `X-Cache`,
  `ETag`, and `Retry-After` where applicable. `X-RateLimit-Reset` is documented
  as the current minute-window start emitted by the MVP Worker, not a true next
  reset timestamp; changing that behavior remains a future implementation
  decision, not part of this documentation-only chunk.
- 2026-07-24T14:21+02:00 — Hyperdrive binding name normalized to `HYPERDRIVE`.
  The Worker implementation and operator runbook naming are canonical; stale
  planning references to the previous binding name were corrected without changing
  any remote rollout gate.
- 2026-07-24T14:50+02:00 — Product-owner refinement on Structural rollout:
  self-service User Area keys are still the eventual state, but the first
  proof point is that the API works end-to-end. Every autonomous local
  chunk (backend namespace, `SupabaseService.apiKeys`, `DatabaseStrings`
  registrations, feature-flagged `DeveloperApiKeysComponent` +
  `DeveloperApiKeysDataService`, spec coverage, docs updates) proceeds
  without owner presence and ships to `develop` with
  `environment.features.developerApiEnabled = false` in
  `environment.prod.ts`. Every remote/manual action (Supabase migration
  apply, `pnpm updateBackendTypes`, Vault pepper, `api_reader` LOGIN
  credential, Hyperdrive, Durable Object namespace, Worker secret + deploy,
  preview route, DNS custom domain, WAF, preview key mint, smoke/quota/
  revocation/cache tests, flag flip to production) is batched into a single
  owner-present window as described in the new "Batched manual-operator
  window" section. Rejected: shipping the UI unflagged to `develop`
  (would render a broken panel until the remote stack lands); rejected:
  waiting for the remote rollout before starting UI work (would idle
  autonomous capacity and keep the widgets-pilot session blocked on a
  preview key that only exists once the panel is coded).
- 2026-07-24T14:50+02:00 — Initial Structural sketch placed the standalone
  API-key component in User Area near Marketplace controls. This was a
  provisional location pending the required designer/owner gate.
- 2026-07-24 — Owner approved the designer's replacement direction: a
  dedicated Public API subsection inside `/user/account`, after identity
  rows and before the Danger Zone. The component is co-located under
  `src/app/features/backbone/user-management/developer-api-keys/`; User
  Area, Address Book, Marketplace, public profiles, global navigation,
  accordions, and a new route are explicitly rejected for MVP. Inline
  one-time reveal and two-step revoke remain canonical. A tab/child route
  is deferred until at least three developer capabilities exist.
- 2026-07-24T15:35+02:00 — Backend-plan-review verdict **APPROVE WITH
  CHANGES** on the credential-slot shape. Owner-approved chosen
  representation and rejected alternatives:
  - **Chosen: stable per-profile credential slot (one row, UPSERT-in-place).**
    `api_keys` holds at most one row per `profile_id`, enforced by a full
    `UNIQUE (profile_id)` index. `create_api_key(label)` and
    `create_partner_api_key(profile_id, label)` are atomic `INSERT … ON
    CONFLICT (profile_id) DO UPDATE` UPSERTs that preserve `id`,
    `api_key_usage_monthly`, and — for the self-service branch —
    `tier_code` / `monthly_quota_override` / `per_minute_quota_override`.
    Admin partner promotion sets `tier_code = 'partner'` on the same
    slot. `revoke_api_key` flips `revoked_at`; re-activation flips it
    back with a fresh secret while keeping the same `id`. A new
    `rotated_at` column is added; `revoked_at IS NULL` remains the
    canonical active predicate. Downgrade partner → free is admin-only
    Postgres SQL, not exposed via any RPC. Old hash/key history is not
    retained for MVP.
  - **Rejected: append-only rows for every mint/revoke.** Would reset
    `api_key_usage_monthly` and the per-key Durable Object identity on
    every rotation, force the panel into a "list of many keys" surface,
    and break the owner-approved singular-slot UX.
  - **Rejected: separate `profile_api_quota` table** holding
    tier/override per profile, with `api_keys` as a child table. The
    same continuity is achieved by keeping tier and override columns
    on the single slot; a second table is over-engineered for the
    owner-approved 0..1-key MVP and adds cross-table transaction
    surface for no functional gain.
  - **Rotation vs revocation cache window formalized.** DB UPDATE is
    immediate, but Worker isolate metadata caches may accept the
    previous secret for up to their fixed 60-second TTL. Routine
    rotation is **not** a compromise response; compromise flow is
    revoke → wait ≥60 s → create, with WAF prefix/IP blocking as
    emergency mitigation.
  - **Historical per-profile active-key cap question is resolved.** The
    full `UNIQUE (profile_id)` index makes the cap `= 1` by
    construction, so the previously queued `≤ 5` client-side cap and
    the Polish-layer `CHECK` cap migration are dropped. The pending
    Approvals-ledger question moves to Standing approvals as
    "stable-slot semantics".
  - **Required SQL migration follow-up** (authoring is autonomous;
    remote apply bundled into the batched operator window): add
    `rotated_at`, swap partial `UNIQUE (profile_id) WHERE revoked_at
    IS NULL` for full `UNIQUE (profile_id)` after preflight, rewrite
    both create RPCs as atomic UPSERTs with the self-service branch
    preserving tier/overrides and the admin branch setting the
    partner tier, same `(id, raw_key, prefix, tier)` return shape.
    Static contract tests to be extended alongside.

## Decision log — remote rollout

- 2026-07-24 — The reviewed schema/RLS/role/view/RPC foundation was applied
  to production and generated backend types were reconciled. Vault initially
  failed because the managed migration owner lacked pgsodium key-ID access;
  the restricted grant in `0af983f3` fixed the root cause without broadening
  application-role access.
- 2026-07-24 — Hyperdrive must connect directly to the Supabase Postgres
  endpoint with TLS; Supavisor was removed from the chain because Hyperdrive
  already pools connections. Hyperdrive SQL result caching is disabled for
  authentication and read-after-write consistency; public response caching
  remains in the Worker Cache API.
- 2026-07-24 — Production data established two contract corrections:
  standard ID `0` is valid (`3U`), while stored numeric tag types `1..10`
  map to semantic lowercase public values. postgres.js over Hyperdrive also
  requires `decode(hex, 'hex')` for the HMAC digest rather than a textual
  `\\x...::bytea` cast. Runtime, OpenAPI, and regression tests landed in
  `c3081e40`; authenticated smoke tests passed against production data.
- 2026-07-24 — The production Worker is uploaded with no public target.
  The temporary authenticated smoke Worker passed catalogue, ETag/304,
  HEAD, quota-header, usage-reporting, stable-slot rotation/revocation/
  re-activation, and MISS→HIT cache checks. The controlled slot preserved
  identity, partner tier, quotas, and usage; its final raw key exists only
  in the owner's approved secret store. Remaining rollout gates are WAF,
  `api.patcher.xyz`, public monitoring, production flag/release, live-doc
  status, and smoke Worker deletion.
- 2026-07-24 — The owner approved initial launch without an outer WAF rule.
  `api.patcher.xyz` was attached to the production Worker and passed live
  auth, catalogue, standard-0, semantic-tag, HEAD, ETag/304, quota-header,
  and MISS→HIT cache checks. The temporary smoke Worker and diagnostic
  secret were deleted. `developerApiEnabled` is committed on `develop`;
  the app release and final workflow archive remain.
- 2026-07-25 to 2026-07-27 — Post-launch stabilization fixes landed on
  `develop` (no plan-scope change): restored dropped module includes in
  catalogue responses (`342dd5a6`), decoded bigint panel IDs correctly
  (`2b40bce8`), added a live-production smoke test (`8ba25161`), accepted
  weak ETag validators (`8dab702d`), protected the live smoke secret in CI
  (`11c906a5`), and fixed an unrelated develop-suite CI regression
  (`189eebb8`). No rollout-gate status changed; recorded here so the
  Decision log stays a complete history of the live API.
- 2026-08-22 — Documentation hygiene pass: confirmed via `git log`/`generate-env.js`
  history that `developerApiEnabled` shipped to production with releases `6.6.0`
  (2026-08-17, `9eaee758`) and `6.7.0` (2026-08-20, `dac1d845`); `origin/production`
  and `origin/develop` are now even. Corrected the stale "app release pending" claim
  in this plan's `## Status`, `CURRENT_FEATURE.md`, `RUNBOOK.md`, and `TODO.md`.
  Root `README.md` already documented the API as live and links the public docs
  page, so that checklist item was checked off without further edits. Remaining
  open work is unchanged: Patcher-docs external publish, final plan archival, and
  Layer 2 (bulk JSONL export) / Layer 3 (contract polish, flag removal).
- 2026-08-25 — Documentation hygiene pass: removed the two "Pending questions"
  entries for this feature from `TODO.md` (infra/schema gates checklist and
  owner-present rollout narrative). Every sub-item was already `[x]` done and
  recorded in `TODO.md`'s Standing approvals (including the WAF deferral), the
  remaining `[ ]` R2 item was already tracked as Structural/non-MVP in
  `CURRENT_FEATURE.md` Layer 2, and every technical detail cited (Durable Object
  name, Vault secret names, migration filenames) already lives in this plan.
  No open owner question remained under either entry, so nothing was lost.

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
