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

- [x] `getPatches` name search: same server-side filter + range treatment as racks (`supabase-queries.patches.ts:377-418`). (`24e2b653`)
- [x] Module text search: fallback `fetchAllRows` pagination-to-exhaustion replaced with a single bounded `[0, 99]` window; narrowed `ilike` + accent predicate + lightweight projection + detail refetch unchanged. (`7c96e9b9`)
- [x] Current-user lists verified already narrow, no change: `getCurrentUserPatchesForAuthor` selects exact caller columns; `getCurrentUserRacksForAuthor` uses `currentUserRackListColumns` + 50-min cache with a paginated alternative available; possessions has a minimal `getCurrentUserModulesPossessionOnly` variant.
- [ ] Module search TTL 1 min → 5 min search-path-only: skipped, needs a method split (single `@Cacheable` covers list + search branches).
- [ ] Module/rack detail `select *` trims: skipped, needs an exhaustive template audit (`singleModuleData$` fans out to many subcomponents).

## Layer 3 — Polish (defer + densify what remains)

- [ ] Lazy-load below-fold detail reads (price history, usage summary, reactions, acquisitions) on tab/visibility.
- [ ] Cap ModularGrid import candidate burst (terms 80→20, candidates 300→50, batch + debounce).
- [ ] Image sizing params on proxy URLs (`width`/`quality` for cards; full-res on detail only); `count: 'exact'` → estimated/none where count unused.
- [ ] Re-check Supabase Cached Egress daily graph for ≥1.5 GB headroom before closing.

## Decision log

- 2026-09-29: Frontend-only scope; no backend shape change so no `backend-plan-reviewer` gate and no RLS/operator window needed.
- 2026-09-29: Layer 1 accepted accent tradeoff on rack search: pure server `ILIKE` means an unaccented query (e.g. `lubadh`) no longer matches accented rack names (`Lùbadh`), which the old full-scan client filter handled. Kept server-only (no paged-window client refinement) because refinement can't recover rows the server already excluded; full accent preservation needs a DB-side normalized column/trigram — follow-up only if users report it.
- 2026-09-29: Proxy routing uses a per-bucket allowlist (`IMAGE_PROXY_BUCKETS`) in `getPublicStorageUrl` so only `module-collections` moves; other buckets keep direct URLs until verified.
- 2026-09-29: Layer 2 skips are deliberate, not deferred debt: search-path-only TTL needs a method split, detail `*` trims need a template audit, and current-user lists are already narrow. Revisit only if egress still over after Layer 3.
- 2026-09-29: `get-cached-delegates.spec.ts` carried a stale racks `client-side` test from Layer 1 commit `2b257495`; fixed in-tree to assert server ilike + range passthrough.

## Documentation impact

- Classification: internal-only
- Production visibility: immediate
- Public docs paths: none
- Screenshot targets: none
- Changelog summary: Reduce Supabase egress by paging rack search server-side and serving collection covers through the cached image proxy.
