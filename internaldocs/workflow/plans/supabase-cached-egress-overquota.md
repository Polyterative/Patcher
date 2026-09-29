# Supabase Cached Egress overquota — cut API + Storage bytes

<!-- Section: INFRA (independent; pick any time a product task is blocked) — GitHub issue #161 -->

Goal: cut Supabase Cached Egress from 6.25 GB back under the 5 GB Free-plan include by reducing API + Storage response bytes, without behavior or schema changes.

Status: Open on `develop`, frontend-only. No schema/migration/RLS/RPC change. No production/release/push. GitHub issue: [Patcher#161](https://github.com/Polyterative/Patcher/issues/161).

## Background (read-only diagnosis, 2026-09-29)

- No `interval()`/`timer()` polling in component data services; refetches are navigation/entity/auth/refresh-driven. No `.channel()` Realtime subscriptions in `src/`. No frontend `functions.invoke`; only Edge Function is `snapshot-store-listings` (every 3 days, `limit=20`) — low risk.
- Client cache is in-memory only (`supabase.cache.ts`: `defaultCacheTime` 5 min, `smallCacheTime` 1 min, `longCacheTime` 50 min, `priceHubCacheTime` 1 h) — helps repeat views in one session, not cold sessions.
- Biggest byte suspects: `getRacksMinimal` name search skips `.range()` and filters client-side (`supabase-queries.racks.ts:413-466`); module text-search `fetchAllRows` 500-row fallback + client filter + detail refetch (`supabase-queries.modules.ts:405-477`, 1-min cache); module-detail fan-out (`module-details.ts:161-195`, `module-detail-data-loading.bindings.ts:19-145`); unpaginated `getCurrentUserRacksForAuthor` / `getCurrentUserPatchesForAuthor` / `getCurrentUserModules*`; rack-detail nested-module heavy join read; collection covers bypass `images.patcher.xyz` via direct public URLs with `cacheControl: '360'` (`supabase-storage.ts:152-170`).

## Layer 1 — MVP (stop the full-table fetches)

- [x] `getRacksMinimal`: apply server-side name filter (`.ilike`) + `.range(from, effectiveTo)` on the search path; drop client-side full-fetch filter. (`2b257495`)
- [x] Collection covers via `images.patcher.xyz` proxy (parity with panels/racks); bump `uploadCollectionCover` `cacheControl: '360'` → `'31536000'`; confirm no direct-URL fallback in hot card path. (`3c2f33ac`)
- [x] Targeted specs + `pnpm lint` green (94/94 across 3 spec files, eslint 0, `diff --check` clean); Supabase Reports top-query bucket check stays dashboard-side.

## Layer 2 — Structural (shrink repeat payloads)

- [ ] `getPatches` name search: same server-side filter + range treatment as racks (`supabase-queries.patches.ts:377-418`).
- [ ] Module text search: min 2–3 chars + debounce, cap/remove `fetchAllRows` fallback (e.g. `range(0,99)`), raise `getModules` TTL 1 min → 5 min.
- [ ] Current-user lists: `select('id')` where only IDs needed, else paginate (racks/patches already have paginated alternatives).
- [ ] Module/rack detail projections: replace `select *` with explicit columns; trim unneeded joins on first paint.
- [ ] Specs for search caps, pagination, and projection trims.

## Layer 3 — Polish (defer + densify what remains)

- [ ] Lazy-load below-fold detail reads (price history, usage summary, reactions, acquisitions) on tab/visibility.
- [ ] Cap ModularGrid import candidate burst (terms 80→20, candidates 300→50, batch + debounce).
- [ ] Image sizing params on proxy URLs (`width`/`quality` for cards; full-res on detail only); `count: 'exact'` → estimated/none where count unused.
- [ ] Re-check Supabase Cached Egress daily graph for ≥1.5 GB headroom before closing.

## Decision log

- 2026-09-29: Frontend-only scope; no backend shape change so no `backend-plan-reviewer` gate and no RLS/operator window needed.
- 2026-09-29: Layer 1 accepted accent tradeoff on rack search: pure server `ILIKE` means an unaccented query (e.g. `lubadh`) no longer matches accented rack names (`Lùbadh`), which the old full-scan client filter handled. Kept server-only (no paged-window client refinement) because refinement can't recover rows the server already excluded; full accent preservation needs a DB-side normalized column/trigram — follow-up only if users report it.
- 2026-09-29: Proxy routing uses a per-bucket allowlist (`IMAGE_PROXY_BUCKETS`) in `getPublicStorageUrl` so only `module-collections` moves; other buckets keep direct URLs until verified.
- 2026-09-29: `getPatches` (`supabase-queries.patches.ts:377-418`) found with the same unbounded name-search pattern (no `.range()`, no server filter) — queued into Layer 2 alongside module fallback caps.

## Documentation impact

- Classification: internal-only
- Production visibility: immediate
- Public docs paths: none
- Screenshot targets: none
- Changelog summary: Reduce Supabase egress by paging rack search server-side and serving collection covers through the cached image proxy.
