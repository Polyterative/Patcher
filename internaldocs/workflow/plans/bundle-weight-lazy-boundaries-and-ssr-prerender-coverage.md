<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Bundle weight, lazy boundaries, and SSR prerender coverage

**Why:** Built `dist/Patcher/browser` is **~22 MB**, top JS chunks are 416 KB / 336 KB /
324 KB, Lottie alone is 220 KB, and `prerender-routes.txt` only lists **6 routes** even
though the public surface is per-rack / per-module / per-patch / per-user / per-manufacturer.
For a share-link-driven music-gear social app this is both a TTI and an SEO regression. Heavy
deps (`@angular/flex-layout` — deprecated, `lodash` full, `sigma` + `graphology*`, GSAP,
`lottie-web`, `modern-screenshot`, `ngx-image-cropper`, `ngx-dropzone`) are likely all in the
initial graph.

**Scope:**
- Run `pnpm bundle-report` and document the top 10 vendor offenders inline in this entry.
  - 2026-06-14 baseline via `pnpm exec ng build --configuration=production --stats-json --no-progress`:
    initial total **1.75 MB raw / 419.27 KB estimated transfer**; largest initial chunk
    **288.50 KB raw / 62.19 KB estimated transfer**; largest lazy chunk
    **419.35 KB raw / 118.29 KB estimated transfer**; Lottie lazy chunk
    **222.12 KB raw / 53.73 KB estimated transfer**.
  - Top 10 vendor raw input offenders from `dist/Patcher/stats.json`:
    `@angular/material` 1084.2 KiB, `@angular/core` 992.0 KiB, `@sentry/core` 796.9 KiB,
    `lottie-web` 469.1 KiB, `@angular/cdk` 461.4 KiB, `@sentry-internal/replay` 293.4 KiB,
    `posthog-js` 279.2 KiB, `@angular/common` 258.7 KiB, `luxon` 255.4 KiB,
    `@supabase/auth-js` 252.0 KiB.
- Replace `lodash` with `lodash-es` (already tree-shakeable) or native methods; remove
  `@angular/flex-layout` in favour of CSS grid/flex utilities already in `tools.scss`.
- Move admin-panel, `application-insights`, sigma/graph view, `ngx-image-cropper`,
  `ngx-dropzone`, and Lottie behind `@defer` blocks or route-level `loadComponent`.
- Generalise `scripts/generate-prerender-routes.mjs` to enumerate top public racks / modules /
  patches / profiles / manufacturers so they are SSR-cached and crawlable; cap volume to a
  sensible top-N to keep build time manageable.
- Image audit: add `loading="lazy"`, explicit `width`/`height`, and proper `alt` (only 154
  a11y attrs across 165 HTML files — double dip for a11y).

**Success criteria:**
- Initial JS payload (main + eagerly-loaded chunks) under 300 KB gzipped.
- Largest single chunk under 250 KB.
- Prerender list covers ≥ 95% of inbound public traffic by URL.

- [x] Capture baseline bundle report and pin numbers in this entry.
- [ ] Drop `@angular/flex-layout` and full `lodash`.
- [ ] Defer the six heavy feature areas listed above.
  - [x] `application-insights` route split into lazy `ApplicationInsightsModule` (`40.80 KB raw / 7.54 KB estimated transfer` lazy chunk).
- [x] Extend prerender generator to top-N public entities; verified static fallback locally and covered dynamic routes with focused tests.
- [x] Image/lazy-loading sweep across hero cards and list rows.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14T19:37+02:00 — Started with the measurement/prerender slice because it is HIGH infra, product-aligned, and unblocked by schema/RLS. Reused the existing sitemap Supabase REST pattern and app route definitions instead of adding Angular backend methods or UI. Kept local no-key builds static-only, with production dynamic routes gated on `SUPABASE_ANON_KEY` and capped by `PRERENDER_PUBLIC_ROUTE_LIMIT` (default 100).
- 2026-06-14T19:43+02:00 — Completed ten image metadata improvements using existing templates only: collection covers/previews, module gallery/editor previews, patch linked-rack previews, context-menu thumbnails, Product Hunt badge, and manufacturer logos now have lazy/decoding/dimension metadata where appropriate. Added a static Node regression because these are template contracts and do not require new UI behavior.
- 2026-06-14T19:46+02:00 — Split the Application Insights page and its local metric atoms into a lazy child module under `/info/insights`. Kept changelog eager in `InfoPagesModule`, restored `MatIconModule` there because changelog still uses icons, and verified stats output now contains a dedicated `application-insights.module` lazy chunk.
