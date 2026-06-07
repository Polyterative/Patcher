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

- [ ] Capture baseline bundle report and pin numbers in this entry.
- [ ] Drop `@angular/flex-layout` and full `lodash`.
- [ ] Defer the six heavy feature areas listed above.
- [ ] Extend prerender generator to top-N public entities; verify in `dist/Patcher/prerendered-routes.json`.
- [ ] Image/lazy-loading sweep across hero cards and list rows.

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

