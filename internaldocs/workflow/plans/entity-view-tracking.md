# Entity view tracking → Grafana ("what people look at")

<!-- Section: INFRA + ANALYTICS (proposal; not active) -->

Goal: see which modules, racks, patches, manufacturers, collections and pages get viewed the most,
both right now (last hour / day) and long term (weeks / months / all time), in the self-host Grafana
next to the existing Pulse / Build / Usage dashboards.

Status: **proposal, 2026-10-12.** Nothing built. Needs owner answers (§Open questions) and the
`backend-plan-reviewer` pass before Layer 1 starts.

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
  → AnalyticsService.trackView(type, id)     // same call sites as the existing *.viewed events
  → small in-memory queue, flushed every ~10 s and on pagehide (fetch keepalive)
  → RPC public.track_views(jsonb)             // SECURITY DEFINER, validates + dedupes + caps
  → analytics.view_events (raw, 90 d)
  → pg_cron rollup every 5 min → analytics.view_daily (forever)
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
| Parse Cloudflare / Kong / Envoy access logs (Loki) | SPA navigation never hits the server for the page; Cloudflare cache hits never reach Kong. Counts would be wrong in both directions. |
| `view_count` column on `modules` / `racks` / `patches` | Hot-row write contention, no time dimension (no "this week" vs "all time"), touches core tables (the `updated` timestamp trap in BACKEND_METHODS preflight). |
| Raw events only, no rollup | Fine for weeks, slow for "all time" top-N; rollup keeps long-term queries cheap and lets raw rows expire. |

## Data design (draft for backend-plan-reviewer)

New schema `analytics`, **not exposed** through PostgREST (not in `db-schemas`), so clients can
only write through the RPC and nobody can read it except `grafana_ro` and service role.

`analytics.view_events` (raw, pruned after 90 days):

| column | type | note |
|---|---|---|
| `id` | bigint identity | |
| `viewed_at` | timestamptz default now() | server time, never client time |
| `entity_type` | smallint | 1 module, 2 rack, 3 patch, 4 manufacturer, 5 collection, 6 profile, 9 page (matches the `reactions` smallint style) |
| `entity_id` | bigint null | null for `page` |
| `route` | text null | route *template* for `page` (e.g. `/modules/browser`), never raw URL or query string |
| `visitor_hash` | bytea | sha256(random per-tab session id ‖ daily server salt) — no user id, no IP, unlinkable across days |
| `is_signed_in` | boolean | |
| `is_owner` | boolean | viewer owns the rack/patch/collection — so dashboards can exclude self-views |
| `source` | smallint | 0 direct, 1 internal nav, 2 search engine, 3 other external (from `document.referrer` host class only) |

Dedupe: unique index on `(visitor_hash, entity_type, entity_id, route, date_trunc('30 min'))`
with `ON CONFLICT DO NOTHING` — a refresh or back/forward inside 30 min counts once.

`analytics.view_daily` (rollup, kept forever, small):
`(day, entity_type, entity_id, route) → views, unique_visitors, signed_in_views, owner_views, external_views`.
pg_cron upserts today + yesterday every 5 min; nightly job deletes raw rows older than 90 days.

`public.track_views(p_events jsonb)` (SECURITY DEFINER, `search_path` pinned, granted to `anon`, `authenticated`):
- max 25 events per call, unknown `entity_type` / non-positive ids dropped silently;
- `is_owner` computed **server-side** from `auth.uid()` (client value ignored);
- returns void, never errors to the client (tracking must not break pages);
- a `statement_timeout` on the function so a slow DB never stalls the beacon.

Grafana: extend `grafana-ro-role.sql` with `USAGE ON SCHEMA analytics` + `SELECT` on both tables, and
`SELECT (id, name, public)` on `racks` / `patches` / `module_collections`, `(id, name)` on `manufacturers`.
Dashboards show private rack/patch names as "private rack #id".

## Client design

- `AnalyticsService.trackView(type, id)` sits next to `capture()`; the existing five `*.viewed` call
  sites call it too (one line each). Route pageviews reuse `wireRoutePageviews`, sending the matched
  route template (walk `ActivatedRoute` snapshot `routeConfig.path`), not the URL.
- Browser only (`isPlatformBrowser`): SSR / prerender never counts. Skip `navigator.webdriver`,
  common bot UAs, and the Playwright e2e runs.
- Batches in a plain array, flushes on a 10 s timer and on `pagehide` / `visibilitychange=hidden` via
  `fetch(..., { keepalive: true })` (unlike `sendBeacon`, it can send the `apikey` header).
- Runs outside the Angular zone; no change detection, no effect on the cached-egress work.
- Environment tag: production only by default, same guard as PostHog; a flag can enable it on the
  staging preview for testing.

## Grafana dashboard: "Patcher — What people look at" (`patcher-views.json`)

The time picker decides short vs long term; panels use `$__timeFilter` on `view_events` for ≤ 7 d
and `view_daily` beyond, so "last hour" and "last year" both work.

1. Stats: views (range), unique visitors, % signed in, % from search engines.
2. Time series: views per hour (short) / per day (long), stacked by entity type.
3. Top modules (name + manufacturer, views, unique visitors, Δ vs previous period).
4. Top racks, top patches, top collections (public names; private shown as #id), excluding owner views.
5. Top manufacturers (direct page views) and manufacturers by module-page views (rolled up).
6. Top pages / sections (route templates): browser, insights, marketplace, home, etc.
7. Movers: biggest growth 7 d vs prior 7 d (what's trending).
8. Look → do: module views vs adds to racks / own / want lists in the same period (conversion %).
9. Where views come from: direct / internal / search / external.

Plus a row on **Pulse**: "Viewed in the last 60 min" (count + top 5), so the live page gets it too.
Template variables: entity type, include owner views (on/off), min views.

## Layers

### Layer 0 — today, no code (optional)
- [ ] PostHog → Insights → Trends on `module.viewed` broken down by `module_id` (and the same for racks /
  patches), saved to a "Views" dashboard. Gives a rough top-N while Layer 1 is built.

### Layer 1 — MVP (~2–3 days)
- [ ] `backend-plan-reviewer` pass on the data design; record outcome in the Decision log.
- [ ] Migration: `analytics` schema, `view_events`, `view_daily`, `track_views` RPC, rollup + prune pg_cron jobs.
- [ ] `AnalyticsService.trackView` + queue/flush + browser/bot guards; wire the five existing `*.viewed` sites.
- [ ] Unit specs: batching, flush on pagehide, SSR no-op, bot skip, non-production no-op.
- [ ] `grafana-ro-role.sql` grants (owner-approved `role` re-run).
- [ ] `patcher-views.json` with panels 1–4 and 6; deploy with `selfhost-grafana.sh deploy`.
- [ ] Verify on the staging preview: views land, rollup fills, dashboard shows them.

### Layer 2 — Structural (~2 days)
- [ ] Route-template page views; `source` classification; 30-min dedupe index.
- [ ] Panels 5, 7, 8, 9 and the Pulse live row; Δ vs previous period columns.
- [ ] Health check: `selfhost-health-remote.sh` warns if the rollup job hasn't run for 30 min or
  `view_events` got zero rows in 24 h while the site is up.
- [ ] Docs: `ANALYTICS.md` (first-party views vs PostHog boundary), runbook entry, privacy policy wording
  (anonymous aggregate counts, no cookies, no IP) queued for public docs.

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

## Open questions for the owner

1. Honour Do Not Track for first-party anonymous counts too (lower counts, consistent with PostHog), or count everyone?
2. Exclude your own / admin views entirely, or just flag them (`is_owner`) and filter in Grafana?
3. Raw retention: 90 days OK?
4. Include API v1 reads in "views", or keep them separate?
5. Will view counts ever be shown inside Patcher? (Decides how much anti-abuse Layer 1 needs.)

Approvals needed (register in `TODO.md` Approvals ledger when this becomes active): new schema + SECURITY
DEFINER RPC (backend review + owner), `grafana_ro` grant change (owner runs `role`).

## Decision log

- 2026-10-12: Proposal: first-party Postgres view log + daily rollup over PostHog API or log parsing (see table above).
