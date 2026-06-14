# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut).
>    Future agents read this to avoid relitigating settled questions.

---

## Active

HIGH: Bundle weight, lazy boundaries, and SSR prerender coverage

Plan: [bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md](./plans/bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md)

### Layer 1 — Measurement and prerender coverage

- [x] Capture production bundle stats baseline.
- [x] Generalise the existing prerender route generator behind capped public Supabase REST reads.
- [x] Add focused generator tests and wire them into `pnpm test:functions`.

### Layer 2 — Lazy/deferred boundaries

- [x] Pick one heavy eager dependency area and move it behind an existing lazy/deferred boundary.
- [x] Verify chunk movement against the bundle stats baseline.

### Layer 3 — Asset and image polish

- [x] Sweep high-traffic hero/list images for lazy-loading, dimensions, decoding, and alt text using existing components.

### Implementation note

- Existing components/patterns reused: `api/sitemap.ts` Supabase REST fetch shape, route paths from `app-routing.module.ts` and feature modules, canonical rack/patch token fallback from `RoutingService`.
- Layout/page patterns copied: none; no UI created or changed in this slice.
- Styling conventions preserved: no SCSS or visual-token changes.
- Files modified: `scripts/generate-prerender-routes.mjs`, `scripts/tests/prerender-routes.test.mjs`, `package.json`, workflow/agent docs, generated `prerender-routes.txt`.
- Files not touched: Angular components/templates/SCSS, Supabase schema/RLS/policies/migrations, backend Angular services.
- Tests/build commands: `node --test scripts/tests/prerender-routes.test.mjs`, `pnpm test:functions:prerender-routes`, `pnpm build`, `pnpm lint`.
- Risks/assumptions: local builds without `SUPABASE_ANON_KEY` intentionally emit static-only routes; production/CI environments with the anon key emit capped dynamic routes. Top-N traffic is approximated by recent public updates until inbound analytics are available.

### 2026-06-14 image metadata slice

Ten completed improvements:

1. Module collection card cover images now declare lazy loading, async decoding, and intrinsic dimensions.
2. Module collection detail cover images now declare lazy loading, async decoding, and intrinsic dimensions.
3. Module collection editor cover previews now declare async decoding and intrinsic dimensions.
4. Module panel gallery thumbnails now declare async decoding and intrinsic dimensions.
5. Module editor cropped panel previews now declare async decoding and intrinsic dimensions.
6. Patch linked-rack preview images now declare async decoding and intrinsic dimensions.
7. General context-menu submenu thumbnails now declare lazy loading, async decoding, and intrinsic dimensions.
8. Product Hunt badge now declares async decoding alongside existing lazy loading and dimensions.
9. Manufacturer row logos now declare async decoding and intrinsic dimensions.
10. A focused static regression (`pnpm test:functions:image-metadata`) now guards the image metadata contract and is wired into `pnpm test:functions`.

### 2026-06-14 lazy boundary slice

- `ApplicationInsightsPageComponent`, `InsightChipComponent`, and `InsightMetricBarComponent` moved out of `InfoPagesModule` into `ApplicationInsightsModule`.
- `/info/insights` now lazy-loads that feature module while `/info/changelog` stays eager inside the parent info module.
- Focused route regression: `infoPageRoutes` keeps `insights` behind `loadChildren`.
- Stats verification: production stats now emit `application-insights.module-*.js` as a lazy chunk at **40.80 KB raw / 7.54 KB estimated transfer**.

### 2026-06-14 dependency cleanup slice

- Removed unused direct `lodash` dependency; source search found no imports/usages.
- Removed unused direct `@types/lodash` dev dependency.
- Removed `lodash` from Angular `allowedCommonJsDependencies`.
- Refreshed `pnpm-lock.yaml`; remaining lodash entries are transitive dependencies.

### 2026-06-14 patch graph dialog lazy slice

- Converted `PatchGraphFullscreenDialogComponent` to standalone and opened it through a dynamic import from `PatchGraphComponent`.
- Removed the dialog declaration/import from `PatchModule` while preserving the existing inline graph, legend, fullscreen action, and export behavior.
- Verification artifact: production output now emits `dist/Patcher/browser/patch-graph-fullscreen-dialog.component-*.js`, so the fullscreen/export dialog and `modern-screenshot` are outside the default patch graph path.
- Scope cut: did not touch `@angular/flex-layout`, inline `LibGraphModule` rendering, or the module-editor cropper because those require broader template/module restructuring.

### 2026-06-14 root leaf route lazy slice

- Exported `appRoutes` from `AppRoutingModule` for route-shape regression coverage.
- Switched `/404` and `/links/retired` from eager `component` imports to existing standalone `loadComponent` boundaries.
- Added a focused spec that keeps both low-traffic pages lazy-loaded.
- Verification artifacts: production build emits `not-found.component-*.js` and `legacy-link-gone-page.component-*.js`; current `main` chunk dropped from ~117.77 KB to ~114.76 KB raw.
