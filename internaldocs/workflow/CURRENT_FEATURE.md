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

- [ ] Pick one heavy eager dependency area and move it behind an existing lazy/deferred boundary.
- [ ] Verify chunk movement against the bundle stats baseline.

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
