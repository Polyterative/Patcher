# Remote feature flags (DB-backed)

Goal: flip feature flags without a commit/push/redeploy.

Docs impact: internal only (no user-visible change).

## Design

- Table `public.app_feature_flags (key text, environment text check in ('production','development'), enabled boolean not null, updated timestamptz default now(), primary key (key, environment))`.
- RLS on; one policy: `SELECT` to `anon, authenticated` using `true`. No write policies (owner edits via dashboard / service role).
- Seeded from `src/environments/features.json` (insert only, no UPDATE backfill).
- Client: `loadRemoteFeatureFlags()` runs in `main.ts` / `main.server.ts` **before** `AppModule` is imported (dynamic import), so module-scope reads (`app-routing.module.ts`, `toolbar-link-data.ts`) see remote values. It does a plain PostgREST `fetch` (`/rest/v1/app_feature_flags?environment=eq.<env>&select=key,enabled`, anon key) with a ~1.5 s timeout and merges known boolean keys over `environment.features`. Any failure → build-time defaults (today's behaviour).
- `features.json` stays the source of defaults and of the flag key set (`EnvironmentModel.features`).

## Layers

1. MVP: migration + seed, loader, bootstrap wiring, unit spec for the merge/fallback.
2. Structural: SSR wiring, `pnpm updateBackendTypes`, docs note on how to flip a flag.
3. Polish: none planned (no realtime).

## Decision log

- 2026-10-18 — Supabase table over Vercel env (still needs rebuild) and Edge Config (Vercel lock-in vs self-host cutover).
- 2026-10-18 — Physical shape: normalized row per (key, environment) with `boolean`. Rejected: single JSONB row per env (no per-flag typing, harder to edit in dashboard), enum for key (needs migration per new flag; text + app-side whitelist instead), integer rollout percentage (no current need).
- 2026-10-18 — Loader bypasses `SupabaseService`: it must run before Angular bootstraps so module-scope route/toolbar consts pick up remote values. Plain fetch, read-only, anon key.
- 2026-10-18 — SSR: server fetches once at process start; flag changes reach SSR HTML on next server restart/deploy, client bootstrap always fetches fresh. Accepted.
- 2026-10-18 — Unknown keys from DB are ignored; missing rows fall back to the bundled default.
- 2026-10-18 — backend-plan-reviewer: approve with changes. Applied:
  - `main.ts` becomes async: await flags, then dynamic `import('./app/app.module')`; e2e smoke required.
  - Client timeout 800 ms; last-good flags cached in `localStorage` and used only when the fetch fails/times out (freshness over speed).
  - SSR: `server.ts` refreshes flags with a 60 s TTL and uses them for the 200/404 status + `environment.features`; module-scope consts (routes, toolbar) on the server refresh on instance cold start. Brief hydration disagreement right after a flip is accepted.
  - Migration grants `select` to `anon, authenticated` explicitly; `check (key ~ '^[a-zA-Z]+Enabled$')`.
  - `pnpm updateBackendTypes` moved into Layer 1.
  - Flag names are public (already true in the bundle). `readOnlyModeEnabled` is client-only enforcement, not a backend guard.
- Rollback: delete rows (app falls back to bundled defaults) → revert code → drop table. Additive: old production clients never read it.

## How to flip a flag

Supabase table editor -> `app_feature_flags` -> edit the `enabled` cell of the (key, environment) row.
Browsers pick it up on next page load; SSR within ~60 s (status code / `environment.features`) and module-scope
route/toolbar consts on the next cold start. Deleting a row falls back to the bundled `features.json` default.
Apply `supabase/migrations/20261018120000_app_feature_flags.sql` first (not yet applied; `pnpm updateBackendTypes` pending, types hand-added).
