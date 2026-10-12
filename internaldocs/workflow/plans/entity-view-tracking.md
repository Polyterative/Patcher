# Entity view tracking → Grafana ("what people look at")

<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

Goal: see which modules, racks, patches, manufacturers, collections and pages get viewed the most,
both right now (last hour / day) and long term (weeks / months / all time), in the self-host Grafana
next to the existing Pulse / Build / Usage dashboards.

Status: **DB + Grafana live since 2026-10-12; the frontend starts sending views with the next
release of `develop`.** Migration validated locally, then applied to the self-host DB (owner-approved);
API smoke test passed and was cleaned up; all 21 panel queries run through Grafana's API.

## Where we are today

- Grafana (`scripts/ops/grafana/`) reads **only the self-host Postgres** through `grafana_ro`.
  Every current dashboard is built from what users *create* (racks, rack_modules, user_modules,
  comments, auth events). Nothing in Postgres records what users *look at*.
- PostHog already gets `module.viewed`, `rack.viewed`, `patch.viewed`, `manufacturer.viewed`,
  `module_collection.viewed` and a `$pageview` on every `NavigationEnd`
  (`analytics.service.ts`). So the instrumentation points exist, but the data lives in PostHog cloud,
  is undercounted by ad blockers and DNT (`respect_dnt: true`), only carries ids (no names), and
  Grafana cannot read it.

## Recommended approach: first-party view log in Postgres, rolled up for Grafana

```text
Detail page loads (browser only)
  → AnalyticsService.capture('*.viewed') → ViewTrackingService   // + route templates on NavigationEnd
  → small in-memory queue, flushed every ~10 s and on pagehide (fetch keepalive)
  → RPC public.track_views(visitor, events)   // SECURITY DEFINER, validates + dedupes + caps
  → analytics.view_events (raw, 90 d)
  → pg_cron rollup every 10 min → analytics.view_daily (forever)
  → Grafana "Patcher — What people look at" dashboard (+ a live panel on Pulse)
```

Why this one:
- Grafana already speaks Postgres; no new datasource, no cloud API key on the NAS.
- Self-host means the writes cost nothing extra (no hosted egress / row quotas).
- Joins for free with names and with what people *do* (view → added to rack / collection).
- Not blocked by ad blockers, because it is our own API on our own domain.

### Rejected alternatives (for the Decision log)

| Option | Why not |
|---|---|
| Grafana Infinity/JSON plugin → PostHog query API | Cloud API key on the LAN box, rate/row limits, ad-block undercount, no join with names or DB activity. Still useful as a cross-check (Phase 0). |
| Parse the Envoy gateway access log (or Postgres logs / `pg_stat_statements`) | Envoy logs every API request with the id in the query string, but: detail reads are cached in the browser (`moduleWithId` / `rackWithId`, LocalStorage TTL) so repeat views never reach it; SSR fetches come from the render server, not the visitor; a rack view also fetches every module in it, so "data needed" ≠ "page viewed"; pages without an entity fetch (browser, insights) are invisible; the log is container stdout, so it needs a shipper (Vector/Promtail → Loki) first, and parsing breaks silently when query shapes change. Postgres logs don't record SELECTs by default and `pg_stat_statements` drops parameter values (no ids). Good later for API / bot / API v1 traffic, not for views. |
| `view_count` column on `modules` / `racks` / `patches` | Hot-row write contention, no time dimension (no "this week" vs "all time"), touches core tables (the `updated` timestamp trap in BACKEND_METHODS preflight). |
| Raw events only, no rollup | Fine for weeks, slow for "all time" top-N; rollup keeps long-term queries cheap and lets raw rows expire. |

## What counts as a view (the contract every number depends on)

A **view** = a real browser tab showed an entity detail page (or a route) **after its data loaded
successfully**, while the tab was visible. Concretely:

- Fires on load success in the detail data service (same place as today's `*.viewed`), so 404s,
  errors and redirects never count.
- A tab opened in the background counts only when it first becomes visible; a prefetch never counts.
- Same visitor + same entity inside 30 min = 1 view (refresh, back/forward, tab restore).
- Not counted: SSR / prerender, `navigator.webdriver`, bot user agents (checked in the browser **and**
  in the RPC from the request headers PostgREST exposes), non-production builds.
- One call feeds both PostHog and Postgres, so the two can be reconciled.

## Data design (as built — `supabase/migrations/20261012120000_add_entity_view_tracking.sql`)

New schema `analytics`, **not exposed** through PostgREST, RLS on with no policies, all table
privileges revoked from `anon` / `authenticated`. Only the RPC writes; only owners + `grafana_ro` read.

| object | what |
|---|---|
| `analytics.entity_types` | code → name lookup for Grafana: 1 module, 2 rack, 3 patch, 4 manufacturer, 5 collection, 9 page |
| `analytics.view_events` | raw views, 90 days. `viewed_at`, 30-min `bucket`, `entity_type` smallint, `entity_id` bigint (0 for pages), `route` text ('' for entities), `visitor_hash` bytea, `is_signed_in`, `is_owner`, `source` smallint. Unique dedupe index `(visitor_hash, entity_type, entity_id, route, bucket)`; BRIN on `viewed_at`. |
| `analytics.view_daily` | rollup kept forever: `(day, entity_type, entity_id, route)` → views, unique_visitors, signed_in, owner, search, external |
| `analytics.visitor_salts` | one random salt per UTC day, deleted after 2 days (never granted to Grafana) |
| `public.track_views(p_visitor text, p_events jsonb)` | SECURITY DEFINER, `search_path = ''`, execute for anon + authenticated. ≤ 25 events, drops bots by request UA, drops unknown types / non-existent ids / bad routes, computes `is_owner` from `auth.uid()`, `ON CONFLICT DO NOTHING`, never raises. |
| pg_cron `analytics-view-rollup` | every 10 min, recompute last 2 UTC days (idempotent upsert) |
| pg_cron `analytics-view-prune` | 03:17 daily: roll up 3 days, delete raw > 90 d, delete old salts |

Kill switch without a release: `revoke execute on function public.track_views(text, jsonb) from anon, authenticated;`
— clients get 401/404, mark tracking missing and stop for the page session. Rollback SQL is in the migration header.

## Client design (as built)

- `ViewTrackingService` (`features/backbone/analytics-integration/view-tracking.service.ts`): queue,
  10 s timer, `pagehide` / hidden flush with `keepalive`, hidden-tab deferral, landing-source
  classification, daily-rotating visitor id in LocalStorage. Off unless browser + `environment.production`
  + `features.viewTrackingEnabled` + not `navigator.webdriver` + not a bot UA.
- `AnalyticsService.capture()` forwards the five existing `*.viewed` events (no call-site changes);
  route `NavigationEnd` sends the matched route template (`modules/details/:id`), never the URL.
- `SupabaseService.views.track` (`supabase-view-tracking.ts`): raw `fetch` to `/rest/v1/rpc/track_views`
  with the current access token (signed out → anon key). Returns `ok | missing | error`, never throws.
- Flag `viewTrackingEnabled`: production `true`, development `false` (`src/environments/features.json`).
  Safe to release before the DB apply: the first 404 turns tracking off for that page session.

## How we know the numbers are right

- Local DB checks (2026-10-12): module/rack/page/collection rows land; repeat within 30 min deduped;
  bot UA, empty UA, bad visitor id, non-array payload, unknown type, missing entity, bad route → ignored;
  owner flagged only for the author; anon cannot read `analytics.*`; rollup idempotent.
- Specs: `view-tracking.service.spec.ts`, `supabase-view-tracking.spec.ts`, `analytics.service.spec.ts`.
- First week in production: compare daily `module.viewed` in PostHog with `view_daily`. Postgres
  should be equal or higher (no ad blockers); a big gap either way means a bug.
- Health check (`selfhost-health-remote.sh`): FAIL if the rollup hasn't succeeded in 30 min, WARN if
  no views in 24 h. Skipped until the migration is applied.

## Grafana dashboard: "Patcher — What people look at" (`patcher-views.json`)

Built (19 panels, default range 30 days, variable **Owner views** exclude/include). Aggregates read
`view_daily`; the hourly series, visitor-days and live stats read raw `view_events` (90 days).

1. Stats: views, visitor-days, % signed in, % from search, views last 60 min, distinct modules viewed.
2. Views per day by type (long term) and per hour by type (short term).
3. Most viewed modules / racks / patches / collections / manufacturers with "vs previous" period change.
   Private racks/patches/collections show only `#id`.
4. Most visited pages / sections (route templates).
5. Trending modules: last 7 d vs the 7 before.
6. Look → do: module views vs rack adds and list changes in the same range.
7. Pies: where views come from, signed in vs anonymous, what gets looked at.

**Pulse** gets a live row: "Viewed in the last 60 min" + "Being looked at right now". Every dashboard
gets a "What people look at" link.

## Layers

### Layer 1 — MVP
- [x] Backend plan review (inline, persona checklist) — outcome in the Decision log.
- [x] Migration: schema, raw + daily tables, salts, `track_views`, rollup + prune jobs; validated locally.
- [x] `ViewTrackingService` + `SupabaseService.views` + forwarding from `AnalyticsService`; specs.
- [x] `grafana-ro-role.sql` grants (analytics block skips itself until the migration exists).
- [x] `patcher-views.json`; every query checked as `grafana_ro` on the local DB.

### Layer 2 — Structural
- [x] Route-template page views, `source` classification, 30-min dedupe.
- [x] Trending, look → do, sources, Pulse live row, "vs previous" columns.
- [x] Health check in `selfhost-health-remote.sh`.
- [x] Docs: `patterns/ANALYTICS.md` boundary section.
- [x] Go-live steps 1–2 (2026-10-12, owner-approved): migration applied, role re-run, dashboards deployed.
- [ ] Step 3 release (owner) + first-week PostHog reconciliation.
- [ ] Public privacy wording (anonymous aggregate counts, no IP, daily-rotating id) — after go-live, via `docs-publisher`.

### Go-live (owner-gated: production DB + Grafana role)
1. Apply the migration to the self-host DB:
   `bash scripts/ops/with-staging-db.sh sh -c 'psql "$TARGET_DB_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/20261012120000_add_entity_view_tracking.sql'`
2. `bash scripts/ops/selfhost-grafana.sh role` (re-asserts grants incl. analytics), then `bash scripts/ops/selfhost-grafana.sh deploy` (syncs dashboards).
3. Release `develop` as usual; views start arriving with the new frontend.
4. After a day: `pnpm health:selfhost` shows the rollup OK and a non-zero 24 h view count.

### Layer 3 — Polish / later
- [ ] Spike alert to ntfy (e.g. a rack suddenly 10× normal = shared on a forum).
- [ ] Optional per-API-key read counts for API v1 (separate source, same rollup).
- [ ] Possible product follow-up (separate plan, needs UX + RLS approval): show authors how many views
  their public rack/patch got, or a "trending" rail. Only then does anti-abuse need to get stronger.

## Risks and how they're handled

- **Count inflation**: the RPC is public, so anyone can post fake views. Acceptable for an internal
  dashboard (caps + dedupe + unique visitors make spam visible). Must be revisited before counts are
  shown in the app.
- **Privacy**: no user id, no IP, no UA stored; visitor hash rotates daily; raw rows expire at 90 d.
- **DB load**: one batched insert per ~10 s per active tab; the rollup reads only the last 2 days.
  Volume to confirm against real traffic after a week (assumption, not measured).
- **Breaking prod**: purely additive (new schema + new RPC); old clients never call it.

## Owner questions — answered with defaults (change any by editing one line)

1. Do Not Track: **counted** — nothing personal is stored (no IP / UA / user id, id rotates daily). Flip by adding a `navigator.doNotTrack` check in `ViewTrackingService`.
2. Own views: **flagged, not dropped** (`is_owner`); dashboards exclude them by default via the Owner views variable.
3. Raw retention: **90 days** (`prune_view_events`).
4. API v1 reads: **separate** (not views); Layer 3.
5. Counts shown in the app: **no** for now — so the current anti-abuse level (dedupe, caps, existence check, bot UA) is enough.

## Decision log

- 2026-10-12: Proposal: first-party Postgres view log + daily rollup over PostHog API or log parsing (see table above).
- 2026-10-12: Hardened: explicit view definition (load success + visible + 30-min dedupe), monthly
  partitions for retention, hourly + daily rollups, server-side bot check, kill switch, PostHog reconciliation.
- 2026-10-12: Backend review (persona checklist, inline). Representation: `entity_type` smallint +
  lookup table (matches `reactions`; enum rejected — adding a type needs `ALTER TYPE`, text rejected —
  wider rows/index for no gain); `entity_id` bigint NOT NULL with 0 / `route` NOT NULL with '' so the
  dedupe unique index needs no expressions (nullable columns rejected: NULLs never conflict).
  Simplified vs the hardened draft: **no monthly partitions and no hourly rollup** — expected volume is
  small, raw rows already serve "last hours/days", and a nightly `DELETE` + BRIN is cheaper to operate
  than partition-management cron (revisit if `view_events` passes ~20 M rows). Visitor hash =
  sha256(daily-rotating client id ‖ per-day DB salt deleted after 2 days). No existing table is touched
  (no `updated` trigger risk); no typegen beyond the `track_views` Functions entry (added by hand,
  matching generator output). Verdict: APPROVE — additive, old clients unaffected.
- 2026-10-12: Forwarding inside `AnalyticsService.capture()` instead of touching the five call sites:
  one mapping table, the existing `shouldCaptureCanonicalDetailView` / load-success guards are reused.
- 2026-10-12: Raw `fetch` with `keepalive` instead of supabase-js `rpc()`: only way to survive `pagehide`.
- 2026-10-12: Go-live 1–2 done. Preflight: PG 17.6, pg_cron present, no `analytics` schema or
  `track_views` before, all referenced columns present. Applied in one transaction. Live API checks:
  RPC 204 with a browser UA, bot UA dropped, `Accept-Profile: analytics` → 406 (schema not exposed).
  The two smoke rows were deleted. `grafana_ro` can read `view_daily` / `view_events`, not `visitor_salts`.
