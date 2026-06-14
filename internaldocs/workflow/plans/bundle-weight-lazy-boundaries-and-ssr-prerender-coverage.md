<!-- Auto-split from TODO.md by scripts/split-todo.cjs. -->
<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

#### HIGH: Bundle weight, lazy boundaries, and SSR prerender coverage

**Status:** ON HOLD — very long-term future. Do not resume unless explicitly requested.

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
  - [x] Removed unused direct `lodash`, `@types/lodash`, and Angular CommonJS allow-list entry; remaining lodash packages are transitive.
- [ ] Defer the six heavy feature areas listed above.
  - [x] `application-insights` route split into lazy `ApplicationInsightsModule` (`40.80 KB raw / 7.54 KB estimated transfer` lazy chunk).
  - [x] Patch graph fullscreen/export dialog converted to a standalone dynamic `MatDialog` import; production output now emits `patch-graph-fullscreen-dialog.component-*.js` as a separate lazy browser artifact, keeping `modern-screenshot` off the default patch graph path.
  - [x] Low-traffic root leaf pages (`/404`, `/links/retired`) switched from eager component imports to `loadComponent`; production output now emits `not-found.component-*.js` and `legacy-link-gone-page.component-*.js`, trimming `main` from ~117.77 KB to ~114.76 KB raw in the current build.
- [x] Extend prerender generator to top-N public entities; verified static fallback locally and covered dynamic routes with focused tests.
- [x] Image/lazy-loading sweep across hero cards and list rows.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14T19:37+02:00 — Started with the measurement/prerender slice because it is HIGH infra, product-aligned, and unblocked by schema/RLS. Reused the existing sitemap Supabase REST pattern and app route definitions instead of adding Angular backend methods or UI. Kept local no-key builds static-only, with production dynamic routes gated on `SUPABASE_ANON_KEY` and capped by `PRERENDER_PUBLIC_ROUTE_LIMIT` (default 100).
- 2026-06-14T19:43+02:00 — Completed ten image metadata improvements using existing templates only: collection covers/previews, module gallery/editor previews, patch linked-rack previews, context-menu thumbnails, Product Hunt badge, and manufacturer logos now have lazy/decoding/dimension metadata where appropriate. Added a static Node regression because these are template contracts and do not require new UI behavior.
- 2026-06-14T19:46+02:00 — Split the Application Insights page and its local metric atoms into a lazy child module under `/info/insights`. Kept changelog eager in `InfoPagesModule`, restored `MatIconModule` there because changelog still uses icons, and verified stats output now contains a dedicated `application-insights.module` lazy chunk.
- 2026-06-14T19:49+02:00 — Source search found no direct lodash imports, so removed the direct `lodash` and `@types/lodash` package entries plus the Angular CommonJS allow-list item. Kept the broader dependency checklist open because `@angular/flex-layout` removal remains.
- 2026-06-14T19:55+02:00 — Split the patch graph fullscreen/export dialog behind a dynamic import instead of touching the always-visible graph surface. Converted the dialog to standalone so `modern-screenshot` is loaded on fullscreen/export demand and left the module-level `LibGraphModule` usage intact for the existing inline graph.
- 2026-06-14T19:58+02:00 — Removed eager root-route imports for the 404 and retired-share-link pages. Used existing standalone component boundaries with `loadComponent`, exported `appRoutes` for a small route regression, and preserved the current redirect paths/copy.
- 2026-06-14T20:00+02:00 — User explicitly deprioritised the remaining bundle/flex-layout work as very long-term future. Keep completed measurement/prerender/image/lazy slices, but do not keep this plan active.
