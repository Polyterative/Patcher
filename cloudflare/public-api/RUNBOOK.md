# Public Open API operator runbook

This runbook is for a future authorized production rollout of the Patcher Public Open API. It is intentionally descriptive and gate-oriented: it does not contain real resource IDs, credentials, secrets, or copy-paste remote mutation commands.

Current state: the local Worker, OpenAPI file, migration files, and tests are committed. No production Supabase migration, Vault secret, `api_reader` LOGIN credential, Hyperdrive binding, Durable Object namespace, DNS route, WAF rule, R2 bucket, cache purge, or Worker deployment has been performed.

## Safety rules

- Every section marked **Manual approval gate** requires an explicit user/operator approval before action.
- Do not run remote Supabase, Cloudflare, DNS, WAF, Vault, R2, or Worker deployment changes from an autonomous agent session.
- Do not commit real IDs, database passwords, Vault values, Worker secrets, Hyperdrive IDs, account IDs, zone IDs, or generated API keys.
- Prefer forward fixes after any remote migration is applied. Do not roll back by reversing production migrations unless the operator has a reviewed, tested forward migration that makes the state safe.
- Keep `production` branch, release commands, pushes, and deployments user-triggered only.

## Rollout order

1. Local validation.
2. Supabase migration validation and explicit remote-apply approval.
3. Vault pepper creation and mirror to Worker secret.
4. `api_reader` runtime LOGIN credential provisioned outside migrations.
5. Supavisor transaction-mode connection and Hyperdrive binding.
6. Durable Object namespace/migration and Worker environment bindings.
7. Worker secrets and non-secret config.
8. Worker deployment to a non-public preview or controlled route.
9. DNS custom domain `api.patcher.xyz`.
10. Cache and WAF guardrails.
11. Smoke tests.
12. Revocation, quota, and cache behavior tests.
13. Monitoring and alarms.
14. Public announcement / public docs link-up.

Stop at the first failed gate. Do not skip ahead with partially provisioned infrastructure.

## 1. Prerequisites

- Access to the correct Supabase project with permission to apply migrations, inspect advisors, use SQL editor, and configure Vault.
- Confirmation that the target database is the intended production/staging project and not a linked local project.
- Cloudflare access to the `patcher.xyz` zone, Workers, Durable Objects, Hyperdrive, Workers secrets, cache settings, and WAF.
- A rollback owner, incident owner, and communications owner named for the rollout window.
- The local branch includes:
  - [`openapi.yaml`](./openapi.yaml)
  - [`wrangler.jsonc`](./wrangler.jsonc)
  - `supabase/migrations/20260724133100_api_reader_roles.sql`
  - `supabase/migrations/20260724133200_api_identity.sql`
  - `supabase/migrations/20260724133300_api_v1_views.sql`

Local preflight commands:

```bash
pnpm test:functions:public-api-worker
pnpm test:functions:public-open-api-migrations
node scripts/checks/check-docs.cjs
```

## 2. Supabase migration validation/apply gate

**Manual approval gate:** applying these migrations remotely changes database roles, RLS policies, tables, functions, grants, and indexes. Do not apply without explicit approval while the user/operator is present.

Validated local migration order:

1. `20260724133100_api_reader_roles.sql`
2. `20260724133200_api_identity.sql`
3. `20260724133300_api_v1_views.sql`

Before remote apply:

- Re-read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight.
- Confirm backups / point-in-time recovery are available for the target Supabase project.
- Confirm no existing role, table, function, view, or policy conflicts with the migration names.
- Confirm the migration still creates `api_reader NOLOGIN`; no password or LOGIN credential belongs in git.
- Confirm the view-owner RLS policies are additive and do not weaken existing app policies.
- Run Supabase security and performance advisors after a staging/dry validation target if available.

After remote apply:

- Verify `api_reader` has no base-table access.
- Verify `api_reader` can execute only `verify_api_key(bytea)` and `record_api_key_usage(uuid,date,integer)`.
- Verify `api_view_owner` owns all `api_v1_*` views and they have `security_barrier=on`.
- Verify the accepted `security_definer_view` advisor findings are justified by the view comments.
- Run `pnpm updateBackendTypes` only after an approved remote schema target is available, then commit generated type changes separately if needed.

Rollback principle:

- Before public traffic: disable the Worker route/custom domain and leave migrations in place until a reviewed forward cleanup migration exists.
- After public traffic: preserve auditability and usage records. Revoke keys or disable the Worker first; clean database objects only through a reviewed forward migration.

## 3. Vault pepper contract

**Manual approval gate:** creating or rotating `api_key_pepper` invalidates or enables key material. Treat it as a production secret operation.

Contract:

- Supabase Vault secret name: `api_key_pepper`.
- Value: base64 text that decodes to exactly 32 random bytes.
- The same value is mirrored to the Cloudflare Worker secret `API_KEY_PEPPER`.
- The value must never appear in git, logs, terminal transcripts, screenshots, issue comments, or docs.

Validation:

- The database mint helper must be able to read exactly one Vault secret named `api_key_pepper`.
- If the secret is missing, duplicated, invalid base64, or not 32 bytes after decoding, key minting must fail.
- The Worker must fail closed with `503 configuration_error` if `API_KEY_PEPPER` is missing or invalid.

Rotation:

- Routine dual-pepper rotation is not implemented in the MVP.
- Single-pepper rotation invalidates all existing API keys because stored key hashes are HMACs of the old pepper.
- Emergency rotation sequence: disable or WAF-block API traffic, create the new Vault/Worker pepper pair, revoke or re-mint keys, redeploy/restart Worker config as needed, then notify affected consumers.

## 4. `api_reader` LOGIN credential outside migrations

**Manual approval gate:** the runtime database password must be created by an operator outside migrations and entered directly into Hyperdrive.

Contract:

- The checked-in role migration creates `api_reader NOLOGIN`.
- Only an approved operator step may grant LOGIN and set a high-entropy password for the runtime role.
- The password lives only in Cloudflare Hyperdrive configuration and the operator secret manager, not in repository files.
- Hyperdrive, not the Worker source, owns the credential.

Validation:

- As `api_reader`, raw base-table `SELECT` from `modules`, `manufacturers`, `profiles`, `api_keys`, and `api_key_usage_monthly` must fail.
- As `api_reader`, selecting from `api_v1_*` views must succeed.
- As `api_reader`, `verify_api_key` and `record_api_key_usage` must be executable; other API key mutation RPCs must not be.

Rollback:

- Revoke LOGIN or rotate the password and detach Hyperdrive if the credential is exposed.
- Revoke affected API keys if runtime traffic may have been compromised.

## 4a. Manual partner keys

**Manual approval gate:** partner keys bypass self-service tier assignment and must be intentionally provisioned for a known profile.

Contract:

- Partner keys use the same wire shape and Worker pipeline as free keys.
- The manually provisioned tier is `partner`, currently seeded at `500,000` requests/month and `600` requests/minute.
- Provisioning is done by an approved operator through `public.create_partner_api_key(profile_uuid, label)` in an administrative SQL context (`postgres` or `service_role` only).
- The raw key is returned once. Store it in the approved secret delivery channel and never commit it.
- `anon` and `authenticated` callers must receive `42501`.

Rollback:

- Revoke the partner key through `public.revoke_api_key` or an approved administrative revocation path.
- If the partner key leaked, also add a short-lived WAF block by key prefix while revocation propagates.

## 5. Supavisor transaction mode and Hyperdrive

**Manual approval gate:** creating a Hyperdrive binding and pointing it at Supabase production is remote infrastructure work.

Required shape:

- Use Supavisor transaction-mode pooler, not session mode.
- The Worker uses postgres.js with no session state: no `LISTEN`/`NOTIFY`, no `SET ROLE`, no session-level `SET`, and no reliance on session-scoped prepared statements.
- Bind the Worker environment to Hyperdrive as `HYPERDRIVE`.
- Do not commit placeholder Hyperdrive IDs to `wrangler.jsonc`.

Validation:

- Verify a read-only query against `api_v1_modules` through Hyperdrive.
- Verify `public.verify_api_key` can be called with a test digest and returns zero rows for unknown/revoked keys.
- Verify DB errors produce `503 authentication_unavailable` or `503 origin_unavailable` envelopes and do not leak SQL details.

Rollback:

- Detach or disable the Worker route first.
- Rotate the `api_reader` password if Hyperdrive or logs may have exposed it.
- Remove or disable the Hyperdrive binding only after traffic is stopped.

## 6. Durable Object migration / namespace

**Manual approval gate:** deploying the Durable Object migration creates durable quota state.

Committed local declaration:

- Binding: `API_KEY_COUNTER`
- Class: `ApiKeyCounter`
- Migration tag: `v1`

Validation:

- Per-key quota state is isolated by API key UUID.
- Successful requests persist before returning.
- Per-minute and monthly overages return `429 rate_limit_exceeded` with `Retry-After`.
- Usage reports flush through `record_api_key_usage` and retry on DO alarms.

Rollback:

- Disable traffic before changing Durable Object class or migration config.
- Do not delete Durable Object state while usage accounting or incident review depends on it.
- If quota state is corrupt for a single key, revoke that key and issue a replacement rather than clearing global state.

## 7. Worker secrets and deployment bindings

**Manual approval gate:** setting Worker secrets and deploying the Worker are production actions.

Required runtime items:

- `API_KEY_PEPPER` Worker secret: same base64 32-byte value as Supabase Vault.
- `HYPERDRIVE` binding: points at the approved Hyperdrive config.
- `API_KEY_COUNTER` Durable Object binding: created through the approved migration.

The Worker must not contain:

- Supabase `service_role`
- project JWT signing secret
- raw `api_reader` password
- raw API keys
- real account, zone, route, namespace, or Hyperdrive IDs in committed docs

Deployment validation:

- Missing `API_KEY_PEPPER` returns `503 configuration_error`.
- Missing Hyperdrive returns `503 authentication_unavailable` or `503 origin_unavailable`.
- Missing Durable Object binding returns `503 quota_unavailable`.

## 8. DNS custom domain

**Manual approval gate:** routing `api.patcher.xyz` changes public traffic.

Requirements:

- Cloudflare zone for `patcher.xyz` must own the `api.patcher.xyz` hostname.
- The Worker route/custom domain must point only at the approved Worker version.
- No app route under `patcher.xyz` should be repointed or proxied through this Worker.

Rollback:

- Remove or disable the custom domain/route.
- Keep the Worker deployed but unreachable while investigating if state inspection is needed.
- If DNS cache has propagated, leave a static maintenance/error route rather than serving stale/partial API behavior.

## 9. Cache and WAF

**Manual approval gate:** WAF and cache rules can affect legitimate consumers and must be reviewed before enablement.

Worker cache behavior:

- Cache API key = `GET <normalized path>?<normalized query>`.
- `Authorization` is excluded from cache key and `Vary`.
- Cached entries contain public response data and ETags only; per-key quota headers are attached after cache lookup.
- TTLs: lists 1 hour fresh + 1 day stale-while-revalidate; details 6 hours fresh + 1 day stale; standards/tags 6 hours fresh + 7 days stale.

Recommended outer WAF:

- Coarse IP or ASN abuse rules only.
- Emergency block by API key prefix is acceptable when a leaked prefix is known.
- Do not use Cloudflare static rate limiting as the authoritative quota mechanism; per-key quota is the Durable Object's job.

Rollback:

- Disable only the problematic WAF/cache rule first.
- Purge affected API cache entries if a public data leak or malformed response is discovered.
- Do not clear Durable Object quota state as part of cache rollback.

## 10. R2 and bulk export

R2 is Structural, not MVP-blocking.

**Manual approval gate:** creating `patcher-public-datasets`, Logpush sinks, or bulk-export jobs is separate from MVP rollout.

Contract for the future Structural layer:

- Private R2 bucket: `patcher-public-datasets`.
- No presigned URLs for public datasets.
- Bulk downloads stream through the Worker after key verification and quota consumption.
- Bulk export comes before public rack/patch endpoints.

Rollback:

- Disable dataset routes/jobs first.
- Preserve objects needed for forensic comparison.
- Rebuild datasets from the database only after the public view predicates are revalidated.

## 11. Smoke tests

Use approved test keys only. Do not paste real keys into shell history on shared machines.

Minimum checks after deployment:

- `GET /v1/modules?limit=1`
- `HEAD /v1/modules?limit=1`
- `GET /v1/modules?limit=1&include=tags,panels`
- `GET /v1/modules/{id}`
- `GET /v1/manufacturers?limit=1`
- `GET /v1/manufacturers/{id}?include=modules`
- `GET /v1/standards?limit=1`
- `GET /v1/tags?limit=1`
- Unknown query parameter returns `400 unknown_parameter`.
- `q=test` returns `400 unsupported_parameter`.
- Missing `Authorization` returns `401 missing_authorization`.
- Malformed scheme or malformed key returns `401 malformed_authorization`.
- Unknown structurally valid key returns `401 invalid_key`.

For successful responses, verify:

- `Content-Type: application/json; charset=utf-8`
- `X-Request-ID`
- `ETag`
- `X-Cache`
- current `X-RateLimit-*` headers
- no private columns, panel filenames, panel image URLs, pricing, user emails, or private rack/patch data.

## 12. Revocation, quota, and cache tests

Revocation:

- Mint a test key.
- Confirm a successful request.
- Revoke the key.
- Confirm requests fail with `401 invalid_key` within 60 seconds.

Quota:

- Use a temporary test tier or override in an approved staging environment.
- Confirm no request succeeds past the per-minute or monthly limit.
- Confirm `429` includes `Retry-After` and rate-limit headers.
- Confirm `record_api_key_usage` catches up monotonically after DO flush retry.

Cache:

- Request the same normalized URL with two different valid keys.
- Confirm cache is shared by URL while each response has the current key's own quota headers.
- Confirm `Authorization` is absent from `Vary`.
- Confirm identical `If-None-Match` returns `304` after consuming quota.
- Confirm different cursors/limits produce distinct ETags.

## 13. Monitoring and alarms

Minimum MVP monitoring:

- Worker request volume, error rate, and latency.
- 5xx count by error code: `configuration_error`, `authentication_unavailable`, `quota_unavailable`, `origin_unavailable`.
- 401/429 trend.
- `X-Cache` hit/miss/stale ratio from logs or sampled probes.
- Durable Object structured log event `public_api_usage_flush_failed`.
- Supabase database errors from the `api_reader` connection.
- Supabase advisors after migration and after any grant/policy follow-up.

Suggested alert thresholds for first rollout:

- Any sustained `configuration_error`.
- Any `quota_unavailable` after deployment.
- `origin_unavailable` spike above baseline.
- Cache hit ratio below 95% under synthetic steady traffic.
- Usage flush failures that do not recover within the retry window.

## 14. Incident procedures

Credential leak:

1. Disable public route or WAF-block affected traffic.
2. Rotate `api_reader` password if database credential exposure is possible.
3. Revoke affected API keys.
4. Rotate `api_key_pepper` only when key-hash compromise is suspected; this invalidates all keys.
5. Re-enable traffic after smoke tests and communication.

Private data exposure:

1. Disable the Worker route/custom domain.
2. Purge Cloudflare cache for affected API URLs.
3. Preserve logs and response samples for forensics.
4. Verify `api_v1_*` view definitions and grants.
5. Apply a reviewed forward migration or Worker fix.
6. Re-run smoke/exclusion tests before restoring traffic.

Quota malfunction:

1. Disable or WAF-limit traffic if overage can harm Supabase/Vercel budgets.
2. Inspect Durable Object error logs and `api_key_usage_monthly`.
3. Revoke abusive keys if needed.
4. Do not globally delete DO state unless a reviewed recovery plan exists.

Origin outage:

1. Confirm whether Cache API stale responses are serving.
2. Check Hyperdrive and Supavisor status.
3. Disable route only if stale/error behavior is worse than outage.
4. Restore only after `origin_unavailable` clears and smoke tests pass.

## 15. Rollback

Preferred rollback order:

1. Disable `api.patcher.xyz` Worker route/custom domain.
2. Disable or relax newly added WAF/cache rules if they caused the incident.
3. Rotate Worker secret / Hyperdrive credential / API keys as appropriate.
4. Leave Supabase migrations in place unless a reviewed forward cleanup migration is approved.
5. Preserve Durable Object state and usage rows until incident review finishes.

Rollback is successful when:

- Public traffic no longer reaches the Worker.
- No remote secret or credential remains exposed.
- Existing Patcher app traffic is unaffected.
- The incident owner has a recorded follow-up plan for database or Cloudflare cleanup.

## 16. Public documentation handoff

The public docs repository is coordinated separately. That session should link to this repo's committed contract paths:

- `cloudflare/public-api/openapi.yaml`
- `cloudflare/public-api/README.md`
- `cloudflare/public-api/RUNBOOK.md` for operator-only details, not public secret steps

Public docs route: <https://docs.patcher.xyz/learn/public-open-api>.

Public docs source file in Patcher-docs: `learn/public-open-api.md`.
