# Patcher Public Open API Worker

Local Cloudflare Worker implementation for the key-required Patcher Public Open API at `https://api.patcher.xyz/v1`.

The committed code and OpenAPI contract are complete for the local MVP, but no production Supabase migrations, Vault secret, Hyperdrive binding, Durable Object namespace, DNS route, WAF rule, R2 bucket, or Worker deployment has been performed from this repository. Operators must follow [`RUNBOOK.md`](./RUNBOOK.md) and the approval gates in [`internaldocs/workflow/TODO.md`](../../internaldocs/workflow/TODO.md) before any remote change.

## Contract

- Public consumer docs: [docs.patcher.xyz/learn/public-open-api](https://docs.patcher.xyz/learn/public-open-api)
- Canonical API contract: [`openapi.yaml`](./openapi.yaml)
- Canonical API contract on GitHub: [`Polyterative/Patcher/cloudflare/public-api/openapi.yaml`](https://github.com/Polyterative/Patcher/blob/develop/cloudflare/public-api/openapi.yaml)
- Base URL: `https://api.patcher.xyz/v1`
- Format: JSON only, `GET`/`HEAD` only, CORS `*` for read requests.
- Authentication: every data request must send an `Authorization` header using the `Bearer` scheme. The credential must start with `pk_live_` and then contain exactly 22 base64url characters.
- Default free quota: `5,000` requests/month and `60` requests/minute. Partner keys are manually provisioned.
- License for exposed catalogue data: CC BY 4.0; API consumers must attribute Patcher when redisplaying or reusing the data.

No anonymous tier exists. Missing or malformed keys fail before cache lookup.

## Architecture

```text
Consumer
  -> Cloudflare Worker route api.patcher.xyz/v1/*
  -> URL normalization + route/query allowlist
  -> API key HMAC verification with API_KEY_PEPPER
  -> Hyperdrive/Supavisor transaction pooler -> public.verify_api_key(...)
  -> per-key Durable Object API_KEY_COUNTER quota consume
  -> Cloudflare Cache API lookup by normalized public URL only
  -> on cache miss: Hyperdrive/Supavisor -> api_v1_* views
```

The Worker never contains a Supabase `service_role` key, project JWT signing secret, user credential, or raw API key storage. Runtime reads use a least-privilege `api_reader` database role through Hyperdrive.

## Request flow

1. Normalize path and query parameters. Unknown query parameters return `400 unknown_parameter`; unsupported `q` returns `400 unsupported_parameter`.
2. Parse the `Authorization` header. Missing returns `401 missing_authorization`; a non-`Bearer` scheme, missing `pk_live_` prefix, wrong suffix length, or non-base64url suffix returns `401 malformed_authorization`.
3. HMAC the decoded 16-byte key suffix with `API_KEY_PEPPER`; verify active metadata through `public.verify_api_key(bytea)`.
4. Consume quota in the per-key Durable Object before cache lookup. Quota responses attach `X-RateLimit-Limit-Minute`, `X-RateLimit-Remaining-Minute`, `X-RateLimit-Limit-Month`, `X-RateLimit-Remaining-Month`, and `X-RateLimit-Reset`; `429` also includes `Retry-After`.
5. Serve from Cache API when possible. Cache keys use only method, normalized path, and normalized query; `Authorization` is never part of the cache key or `Vary`.
6. On miss, query only `api_v1_*` views through parameterized postgres.js calls over Hyperdrive.
7. Return SHA-256 `ETag` values. Matching `If-None-Match` returns `304` after authentication and quota consumption, with current per-key quota headers.

## Endpoints

| Endpoint | Purpose | Notes |
|---|---|---|
| `GET /v1/modules` | Paginated public modules | Filters: `manufacturer_id`, `hp`, `standard`, `tag`; includes: `ins`, `outs`, `tags`, `panels`. |
| `GET /v1/modules/{id}` | One public module | Supports `fields` and module includes. |
| `GET /v1/manufacturers` | Manufacturers that have at least one publishable module | Supports pagination and `fields`. |
| `GET /v1/manufacturers/{id}` | One public manufacturer | `include=modules` adds safe module summaries. |
| `GET /v1/standards` | Reference standards | Supports pagination and `fields`. |
| `GET /v1/tags` | Reference tags | Supports pagination and `fields`. |

List endpoints support:

- `limit`: `1..100`, default `50`.
- `sort`: `name` or `id`, ascending, with `id` as tie-breaker for `name`.
- `cursor`: opaque base64url cursor shaped as `{"v":1,"s":<last_sort_value>,"id":<last_id>}`.
- `fields`: comma-separated allowlisted top-level fields; `id` is always retained.
- `q`: reserved for future `pg_trgm` search and intentionally returns `400 unsupported_parameter` in the MVP.

## Examples

Use a placeholder key shape in docs and tests only. Real keys are returned once by the database mint RPC and must not be committed, logged, or pasted into issue trackers.

```bash
AUTH_HEADER='Authorization'
AUTH_SCHEME='Bearer'
API_KEY='pk_live_<replace-with-real-22-char-suffix>'
curl -sS 'https://api.patcher.xyz/v1/modules?limit=10&include=tags,panels' \
  -H "${AUTH_HEADER}: ${AUTH_SCHEME} ${API_KEY}"
```

```bash
AUTH_HEADER='Authorization'
AUTH_SCHEME='Bearer'
API_KEY='pk_live_<replace-with-real-22-char-suffix>'
curl -i 'https://api.patcher.xyz/v1/manufacturers/123?include=modules&fields=name,website_url' \
  -H "${AUTH_HEADER}: ${AUTH_SCHEME} ${API_KEY}"
```

```bash
AUTH_HEADER='Authorization'
AUTH_SCHEME='Bearer'
API_KEY='pk_live_<replace-with-real-22-char-suffix>'
curl -i 'https://api.patcher.xyz/v1/tags' \
  -H "${AUTH_HEADER}: ${AUTH_SCHEME} ${API_KEY}" \
  -H 'If-None-Match: "previous-etag"'
```

Error envelope:

```json
{
  "error": {
    "code": "invalid_key",
    "message": "API key is invalid",
    "request_id": "00000000-0000-4000-8000-000000000000"
  }
}
```

## Public data exclusions

The v1 contract exposes only allowlisted catalogue fields from publishable module/manufacturer data and reference rows. It deliberately excludes:

- private users, private profiles, private racks, private patches, addresses, marketplace transactions, emails, admin IDs, tokens, and analytics;
- submitter attribution and moderation/private operational fields;
- panel image URLs and panel filenames;
- pricing and store listings;
- bulk export endpoints;
- public rack and public patch endpoints.

Bulk JSONL export is a Structural follow-up. Public racks and patches are deferred to a later contract review and will use existing opaque `public_id` patterns rather than integer IDs.

## Source map

| Path | Responsibility |
|---|---|
| [`src/index.ts`](./src/index.ts) | Top-level Worker pipeline, auth/quota/catalogue handoff, Cloudflare export. |
| [`src/auth.ts`](./src/auth.ts) | `Bearer` / `pk_live_` parsing and HMAC digest generation. |
| [`src/api-key-metadata-cache.ts`](./src/api-key-metadata-cache.ts) | Fixed-TTL isolate metadata cache; revocation bound stays <= 60 seconds. |
| [`src/api-key-counter.ts`](./src/api-key-counter.ts) | Durable Object quota counter, usage flush, alarm retry. |
| [`src/quota.ts`](./src/quota.ts) and [`src/quota-response.ts`](./src/quota-response.ts) | Pure quota boundary logic and rate-limit headers. |
| [`src/request.ts`](./src/request.ts) | Route detection, query allowlists, normalization, cursors. |
| [`src/catalogue-provider.ts`](./src/catalogue-provider.ts) | Parameterized catalogue queries against `api_v1_*` views. |
| [`src/catalogue-serving.ts`](./src/catalogue-serving.ts) | Cache API, ETag/304, stale-while-revalidate, origin error handling. |
| [`src/catalogue-mapping.ts`](./src/catalogue-mapping.ts) | Row normalization, field allowlists, sparse fields, cursor encoding. |
| [`src/database.ts`](./src/database.ts) | postgres.js Hyperdrive client, API key RPC calls, usage reporter. |
| [`wrangler.jsonc`](./wrangler.jsonc) | Local Worker entry and Durable Object class declaration only; no real remote IDs. |
| [`openapi.yaml`](./openapi.yaml) | OpenAPI 3.1 consumer contract. |
| [`../../supabase/migrations/20260724133100_api_reader_roles.sql`](../../supabase/migrations/20260724133100_api_reader_roles.sql) | Local role foundation, credential-free. |
| [`../../supabase/migrations/20260724133200_api_identity.sql`](../../supabase/migrations/20260724133200_api_identity.sql) | API tiers, keys, usage, Vault-backed mint/verify/revoke/report RPCs. |
| [`../../supabase/migrations/20260724133300_api_v1_views.sql`](../../supabase/migrations/20260724133300_api_v1_views.sql) | Security-barrier public catalogue views and least-privilege grants. |
| [`../../scripts/tests/public-api-worker.test.mjs`](../../scripts/tests/public-api-worker.test.mjs) | Local Worker contract tests. |
| [`../../scripts/tests/public-open-api-migrations.test.cjs`](../../scripts/tests/public-open-api-migrations.test.cjs) | Static migration contract tests. |

## Local commands

Use `pnpm`; do not use `npm` or watch-mode test commands.

```bash
pnpm test:functions:public-api-worker
pnpm test:functions:public-open-api-migrations
node scripts/checks/check-docs.cjs
```

No-dependency OpenAPI smoke check:

```bash
node -e "const fs=require('node:fs'); const s=fs.readFileSync('cloudflare/public-api/openapi.yaml','utf8'); for (const t of ['openapi: 3.1.0','/modules:','/manufacturers:','apiKey:','ErrorResponse:']) if (!s.includes(t)) throw new Error('OpenAPI smoke check missing '+t);"
```

The Worker is not deployed locally by default because production bindings are intentionally absent. Use dependency-injected tests for local contract validation until an operator creates approved Cloudflare and Supabase resources.

## Non-goals

- No write API.
- No anonymous access.
- No GraphQL.
- No billing or paid self-service tier in v1.
- No direct PostgREST/`anon` exposure.
- No `service_role`, JWT signing secret, or raw database credential in the Worker.
- No Patcher-docs repository edits from this package; public marketing/consumer docs live at <https://docs.patcher.xyz/learn/public-open-api>.
