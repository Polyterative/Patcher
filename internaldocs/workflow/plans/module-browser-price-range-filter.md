<!-- Section: PRODUCT — Tier 2 (requires stable public profiles / community trust layer) -->

# Module browser — price range filter (min/max EUR on Price Hub estimates)

## Goal

Add a professional min/max price filter to the `/modules` browser sidebar that filters on the existing Price Hub estimated market price (EUR), copying the marketplace min/max control pattern and the module-browser reactive filter conventions end to end.

## Background / key discoveries

- Module price is **not a column on `modules`**. It is derived Price Hub data: `module_store_listings` + `module_price_snapshots` → `GET.recentModuleMarketPrices(ids)` → `ModuleRecentMarketPrice.estimatedPriceEurMinor` (EUR-normalized via the FX table, 1 h `priceHub` cache). The module list already fetches this per page for display (`module-list.component.ts:231-259`, `priceSummaryByModuleId$`).
- The pattern to copy is the **marketplace min/max pair**: `marketplace-browser-fields.factory.ts:82-83` (two `FormTypes.NUMBER` 7 rem fields), `marketplace-browser.component.html:76-94` (`.marketplace-price-controls.row.gap1`), `filterAndSortMarketplaceListings` + `parsePriceBoundary` (`marketplace-view-models.ts:191-231,338-345`), field→filter wiring in `marketplace-browser-data.service.ts:174-184`.
- The module-browser filter convention to extend: `ModuleBrowserFields` (`module-browser-data.models.ts:75-86`) → `createModuleBrowserFields` (`module-browser-fields.factory.ts`) → criteria + matchers (`module-browser-filter.helpers.ts:173-235`) → reactive pipeline in `ModuleBrowserDataService` (750 ms debounce, `canReset$`, `resetForm$`, `search.filter_changed` / `search.performed` analytics) → sidebar controls in `module-browser-root.component.html` → `syncVisibleModules` in `module-browser-root.component.ts:237-257,474-495`.
- **No schema / migration / RPC / RLS change is needed.** Anon SELECT on the price tables is already granted (`20260706193400_secure_price_hub_rls.sql`, confirmed in the price-drops plan). No `backend-plan-reviewer` gate, no `pnpm updateBackendTypes`.
- No `mat-slider` usage exists anywhere in the repo (`@angular/material ^22` is available, but the slider module is not imported). A dual-thumb slider is new dependency surface — deferred to Layer 3 (see Decision log).
- Server-paginated dataset caveat: `GET.modules` pages 25 rows at a time. Price lives outside that query, so price filtering applies to **loaded results joined with the price map** (same honesty constraint the price-drops plan hit with PostgREST caps). Pagination semantics are an explicit open decision below.

## Layers

### Layer 1 — MVP (frontend-only, min/max EUR inputs)

- [ ] `module-browser-data.models.ts`: add `priceMin` / `priceMax` `ModuleTextField` entries to `ModuleBrowserFields`.
- [ ] `module-browser-fields.factory.ts`: add both controls (`FormTypes.NUMBER`, `Validators.min(0)` + integer pattern copied from `depth`, labels `Min price (€)` / `Max price (€)`, flex `7rem` copied from marketplace).
- [ ] `module-browser-filter.helpers.ts`: add `parsePriceBoundary` (copy of `marketplace-view-models.ts:338-345`), `matchesPriceRange(estimatedEurMinor, minEur, maxEur)` (copy shape of `applyHpCondition` in `module-browser-data.utils.ts:28-37`), extend `ModuleFilterCriteria`, `matchesOwnedModuleFilters`, `hasResettableModuleFilters`, `hasActiveModuleFiltersForFields`, `getActiveFilterNames` (+`'price'`).
- [ ] `ModuleBrowserDataService`: add a shared `priceSummaryByModuleId$` (fetch current page ids via `backend.GET.recentModuleMarketPrices`, riding the existing `priceHubRecentModuleMarketPrices` cache entry); wire price controls into `canReset$`, `filterControlChanges$` (same 750 ms debounce path), `resetForm$` (silent `''` + reload), analytics (automatic via `getActiveFilterNames`).
- [ ] `module-browser-root.component.html`: price block in `.filter-sidebar` directly after the Max Depth control — `<div class="module-filter-control module-filter-control--optional"><div class="module-price-controls row gap1">` with two `lib-mat-form-entity` NUMBER fields (copies `marketplace-browser.component.html:76-91`), plus a dual-thumb `mat-slider` range bound to the same min/max controls underneath (owner-approved 2026-09-17; requires importing `MatSliderModule` — first `mat-slider` usage in the repo, see Decision log).
- [ ] `module-browser-root.component.ts`: include price controls in the `syncVisibleModules` merge; join loaded modules with the price map and drop out-of-range rows; honest empty-state/hint copy when a price filter is active but the loaded page has no priced matches.
- [ ] `ModuleListComponent`: consume the service price map instead of a second parallel fetch (avoids double `recentModuleMarketPrices` traffic).
- [ ] Specs: helper specs (parse/match/resettable/active/names), data-service spec additions, root-component spec; `pnpm lint` clean; targeted `pnpm test-headless --include="**/module-browser/**"`.

### Layer 2 — Structural

- [ ] Pagination semantics: document + implement the chosen behavior for the server dataset (filter-loaded-page + hint is the default; over-fetch-until-full is the alternative — see open decisions). `Load more` must keep working; `itemsCount` stays the server count.
- [ ] Owned / wanted / available collection modes parity (client-side full datasets — exact filtering, no pagination caveat).
- [ ] Optional price sort (`MODULE_ORDER_OPTIONS` `price ↑/↓` on `estimatedPriceEurMinor`; unpriced last).
- [ ] Verify `priceHub` cache-bust path, no N+1 (one batched call per page, same as today), analytics `search.performed.filters_active` counts price.

### Layer 3 — Polish

- [ ] Dual-thumb range slider **only if validated**: `MatSliderModule` import, min/max bounds sourced honestly (loaded-page bounds, not fake global bounds), mobile 390 px + dark-theme pass, Playwright screenshots before concluding (per `AGENTS.md` §5).
- [ ] Preset chips (copy the HP `[presets]` pattern, e.g. `~€100 / ~€300 / ~€500` bounds) — cheap professional-shop touch.
- [ ] Copy review (zero-bullshit, tabular numerals per `DESIGN_LANGUAGE.md`), `€` glyph + `~` estimated-prefix consistency with `displayPrice`.

## Decisions (owner-approved 2026-09-17)

1. **Control style**: min/max inputs **plus** a dual-thumb range slider underneath (Thomann-style). Slider bounds sourced honestly from loaded-page data, never fake global bounds.
2. **Unpriced modules while a price bound is set**: exclude (professional-shop behavior).
3. **Scope**: `/modules` browser all modes + rack-editor picker reuse via the shared root component. Excluded: marketplace (already has), module detail, insights, user-area lists.
4. **Pagination semantics**: filter the loaded page + honest hint copy; `Load more` keeps working; `itemsCount` stays the server count. No over-fetch loop, no server-side RPC.

## Checklist

- [ ] Plan approved (controls, unpriced behavior, scope, pagination semantics — all owner-approved 2026-09-17)
- [ ] Layer 1 implemented per file list above
- [ ] Layer 2 pagination + collection-mode parity + (optional) price sort
- [ ] Layer 3 polish per approved control style, screenshots captured + inspected
- [ ] Targeted specs + `pnpm lint` clean

## Decision log

- 2026-09-17 · Price source = Price Hub estimate (`estimatedPriceEurMinor`), not a `modules` column: no migration/RPC/RLS/typegen work, no `backend-plan-reviewer` gate. Inputs are whole EUR to match `formatEstimatedEurPrice` rounding (`~€X`).
- 2026-09-17 · Copy targets fixed: marketplace min/max pair (fields factory + html + `parsePriceBoundary` + field→filter wiring) for the controls; module-browser HP/depth (`applyHpCondition`, debounce/`canReset$`/`resetForm$`/analytics pipeline) for the filter plumbing.
- 2026-09-17 · No `mat-slider` in repo today: slider deferred to Layer 3 pending validation, so Layer 1 introduces zero new dependency surface.
- 2026-09-17 · First placement proposal: sidebar directly after Max Depth (numeric filters cluster: HP → Depth → Price), same `lib-mat-form-entity` weight as siblings, no new section header. Affected: `/modules` browser + rack-editor picker (shared root component). Excluded: marketplace (already has), module detail, insights, user-area lists.
- 2026-09-17 · Owner approvals: (1) inputs + dual-thumb slider from the start — slider is the first `mat-slider` in the repo, so its module import + dark-theme + 390 px mobile pass are Layer 1 acceptance, not polish; bounds come from loaded-page data only; (2) unpriced modules excluded while a bound is set; (3) scope = browser + picker via shared root component; (4) pagination = filter loaded page + honest copy, no over-fetch, no RPC.
- 2026-09-17 · Root specs caught an infinite refetch loop during chunk 3: listings-less modules come back empty, and a naive always-emit merge re-triggered the sync that requested them (`RangeError: Maximum call stack size exceeded`). Fixed with a `priceSummariesRequestedIds` guard (one fetch per id per service lifetime) + change-only `mergePriceSummaries` emissions, covered by a dedicated no-refetch regression spec.
- 2026-09-17 · Live probes caught a runtime type crash the specs missed: `type="number"` inputs surface `number | null` via Angular's NumberValueAccessor despite the `FormControl<string>` typing (same latent typing as hp/depth), so `parsePriceBoundary`'s `.trim()` threw on real input and silently killed filtering. Hardened the parser for `string | number | null | undefined`, normalized zero-min to no-bound (a zero min constrains nothing — keeping it only hid unpriced modules while looking inactive), and exported `normalizePriceRange` for the root server-page path. Covered by numeric-input + zero-min specs.
- 2026-09-17 · Visual verification (desktop 1440px, mobile 390px, emulated-OS dark, all screenshot-inspected; zero page errors): (1) stacked full-width Min/Max, not the marketplace side-by-side pair — at this rail's 208px the halved fields clip floating labels under the clear button; (2) slider CSS trilogy, all probe-measured: block-level flex (the `row` utility's inline-flex sizes to 470px max-content and overflows), `width: auto` (M3 8px side touch insets), `position: relative` + `overflow: clip` (absolutely-positioned native range inputs otherwise inflate rail scrollWidth to 221px); (3) live probes: typed Max=100 filters 25→8 cards, slider keyboard steps filter 25→19, rail overflow 0. Dark renders from system tokens + native slider theming, no custom colors.

## Documentation impact

- Classification: public-behavioral + public-visual (new filter on a public page; no URL/contract change)
- Production visibility: immediate on publish (page ungated; no flag)
- Public docs paths: Patcher-docs modules pages (named at publication, post-production-confirmation only)
- Screenshot targets: modules desktop + mobile
- Changelog summary: `The modules browser now filters by estimated market price with min/max EUR controls.`
