<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Insights — recent price drops (two insights, error-filtered)

## Goal

Add ONE new section to `/info/insights` with TWO insights about recent price drops from Price Hub data, filtering obvious scraper errors so the section stays useful.

## Layers

### Layer 1 — MVP

- [x] New `module-price-drops.utils.ts` with strict reliability filter + specs
- [x] `ApplicationStatisticsService.priceDrops$` over discovery Top modules via existing per-module histories + module names
- [x] Insights page card after Makers with Insight 1 (count) + Insight 2 (biggest reliable drop + link), empty/error/suppressed states, method note
- [ ] Targeted specs + `pnpm lint` clean

### Layer 2 — Structural

- [ ] Verify cache keys (`priceHub` bust) and no N+1 blowup (cached discovery + bounded per-module histories + one `publicModulesByIds` for top drops only)
- [ ] Confirm RLS anon-readable (already granted), no policy change

### Layer 3 — Polish

- [ ] Copy review (zero-bullshit, tabular numerals), mobile 36rem check, manual screenshot

## Checklist

- [ ] Util thresholds documented + tested (5–60%, ≥€20, ≥3 pts or 2 stores, span ≥7d, range <3x, no €0)
- [ ] Component VM handles loading/error/empty/suppressed without layout shift
- [ ] Method note documents window, filters, and suppression

## Decision log

- 2026-09-12 · Placement: after Makers (owner-approved via prompt; keeps market topic together, minimal churn).
- 2026-09-12 · Insights: Insight 1 = count of tracked modules with reliable drop; Insight 2 = biggest reliable drop example with before/after EUR + store count + module link (owner-approved).
- 2026-09-12 · Strict filtering (owner-approved): drop 5–60%, floor €20 both ends, all points >0, ≥3 points OR ≥2 stores, earliest–latest span ≥7d, max/min <3x. Rationale: hides cents-vs-euros, kit-vs-assembled, single-blip scraper errors; may hide some real clearance deals (accepted).
- 2026-09-12 · Frontend-only, no migration/RPC change: single snapshots query (60d, active listings, limit 5000) + client-side EUR normalize via existing FX table + `getModuleSparsePriceHistorySummary`. No backend-plan-reviewer gate (no persistent-data-shape change), no RLS change (anon SELECT already granted).
- 2026-09-12 · Only public modules named (via `publicModulesByIds`); counts derived from snapshots joined to active listings. Suppressed until ≥1 reliable drop; otherwise empty note explains coverage (never misleading zero-as-signal).
- 2026-09-12 · REDESIGN after live-data probe: the single global snapshots query is unworkable — PostgREST caps responses at 500 rows, so an `observed_at desc` slice covers only the last ~12h of crawl output (436 modules, 373 with a single point → no history → permanent suppression). Replaced with per-module `getModulePriceHistorySnapshots` over the discovery Top modules (≤18 ids, cached discovery + 1h priceHub history cache, ≤13 small parallel requests, per-module errors isolated). Live probe confirmed real qualifying drops among hero modules (Disting MK4 −24%, Cs-L −12%, Knight Gallop/ochd −5%) and correct rejection of a +337% mixed-variant error. Global-catalogue coverage remains a follow-up requiring a server-side aggregation RPC (migration + owner approval).
- 2026-09-12 · Top-drop card renders the shared `app-module-minimal` (same `heroModuleViewConfig` as hero rankings, `ModulePartsModule` already imported) instead of custom name/maker markup; the mapper attaches the full `MinimalModule` on `topDrop.module`, with the hero-style fallback spans when unnamed.

## Documentation impact

- Classification: public-behavioral + public-visual (new card on public page; no URL/contract change)
- Production visibility: immediate on publish (page ungated; no flag)
- Public docs paths: Patcher-docs insights pages (named at publication, post-production-confirmation only)
- Screenshot targets: insights desktop + mobile
- Changelog summary: `The insights page now highlights recent module price drops with error-filtered Price Hub history.`
