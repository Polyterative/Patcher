# TODO — active backlog

> **Thin index of active and backlog tasks.** Per-task detail lives in [**plans/**](./plans/).
>
> **Rules for AI agents using this file:**
>
> 1. **Pick one task** by reading its plan file under `plans/`. Open the plan and update the
>    `## Decision log` section as you make non-obvious choices.
> 2. **Keep this index thin.** A task gets at most one line: status + title + link.
>    Backlog detail, layers, and acceptance criteria live in the plan file, not here.
> 3. **On completion**, move the one-line entry into [COMPLETED.md](./COMPLETED.md) with a date,
>    archive the plan file under `plans/done/`, and reset `CURRENT_FEATURE.md`.
> 4. **Do not duplicate strategy** already in `../product/PRINCIPLES.md` or `../product/ROADMAP.md`.

## Legend

- `[ ]` Open
- `[~]` In progress
- `ON HOLD:` Paused until explicitly resumed

---

### PRODUCT — Tier 0 (ship in any order; no external dependencies)


### PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live)

- [ ] **HIGH: Manufacturer Accounts & Verification** → [`plans/manufacturer-accounts-verification.md`](./plans/manufacturer-accounts-verification.md)
- [ ] **LOW: Manufacturer Updates / Featured Surface** → [`plans/manufacturer-updates-featured-surface.md`](./plans/manufacturer-updates-featured-surface.md)
- [ ] **LOW: Manufacturer Analytics** → [`plans/manufacturer-analytics.md`](./plans/manufacturer-analytics.md)
- [ ] **LOW: Manufacturer API / Widgets Pilot** → [`plans/manufacturer-api-widgets-pilot.md`](./plans/manufacturer-api-widgets-pilot.md)

### DATA MODEL (schema / domain gaps to address)

- [ ] **LOW: Module I/O — bidirectional and passive port support** → [`plans/module-io-bidirectional-passive-port-support.md`](./plans/module-io-bidirectional-passive-port-support.md)

### INFRA (independent; pick any time a product task is blocked)

- [ ] **HIGH: Type safety — eliminate `any` and flow Supabase types end-to-end** → [`plans/type-safety-eliminate-any-and-flow-supabase-types-end-to-end.md`](./plans/type-safety-eliminate-any-and-flow-supabase-types-end-to-end.md)
- [ ] **HIGH: Angular modernization — signals, `inject()`, standalone, `takeUntilDestroyed`** → [`plans/angular-modernization-signals-inject-standalone-takeuntildestroyed.md`](./plans/angular-modernization-signals-inject-standalone-takeuntildestroyed.md)
- [ ] **HIGH: Bundle weight, lazy boundaries, and SSR prerender coverage** → [`plans/bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md`](./plans/bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md)
- [ ] **MEDIUM: Manufacturer page — parity with module browser filters** → [`plans/manufacturer-page-parity-with-module-browser-filters.md`](./plans/manufacturer-page-parity-with-module-browser-filters.md)
- [ ] **MEDIUM: Module — public possession statistics & trend charts** → [`plans/module-public-possession-statistics-trend-charts.md`](./plans/module-public-possession-statistics-trend-charts.md)
- [ ] **LOW: Module — "Cool" appreciation button** → [`plans/module-cool-appreciation-button.md`](./plans/module-cool-appreciation-button.md)
- [ ] **MEDIUM: Module / Patch / Rack browser — replace pagination with "Load more"** → [`plans/module-patch-rack-browser-replace-pagination-with-load-more.md`](./plans/module-patch-rack-browser-replace-pagination-with-load-more.md)
- [ ] **LOW: Module tags — axis-colour tinting (code-highlighting style)** → [`plans/module-tags-axis-colour-tinting-code-highlighting-style.md`](./plans/module-tags-axis-colour-tinting-code-highlighting-style.md)
- [ ] **LOW: Rack Editor — "Weakest category" hint in module picker** → [`plans/rack-editor-weakest-category-hint-in-module-picker.md`](./plans/rack-editor-weakest-category-hint-in-module-picker.md)
- [ ] **MEDIUM: Tag taxonomy — split "PURPOSE" group into sub-groups** → [`plans/tag-taxonomy-split-purpose-group-into-sub-groups.md`](./plans/tag-taxonomy-split-purpose-group-into-sub-groups.md)
- [ ] **LOW: Rack — Stale preview indicator** → [`plans/rack-stale-preview-indicator.md`](./plans/rack-stale-preview-indicator.md)
- [ ] **MEDIUM: Rack Comparison — balance diff between two racks** → [`plans/rack-comparison-balance-diff-between-two-racks.md`](./plans/rack-comparison-balance-diff-between-two-racks.md)
- [ ] **MEDIUM: Rack Editor — "Remix" layout optimizer** → [`plans/rack-editor-remix-layout-optimizer.md`](./plans/rack-editor-remix-layout-optimizer.md)
- [ ] **MEDIUM: Rack Editor — Quick-add blank panel shortcut** → [`plans/rack-editor-quick-add-blank-panel-shortcut.md`](./plans/rack-editor-quick-add-blank-panel-shortcut.md)
- [ ] **MEDIUM: Rack Analytics — Power Header Count** → [`plans/rack-analytics-power-header-count.md`](./plans/rack-analytics-power-header-count.md)
- [ ] **MEDIUM: Bug — Rack Preview Not Loading / Updating on Specific Rack** → [`plans/bug-rack-preview-not-loading-updating-on-specific-rack.md`](./plans/bug-rack-preview-not-loading-updating-on-specific-rack.md)
- [ ] **HIGH: Perf — Investigate Initial Render Flash on Route Open** → [`plans/perf-investigate-initial-render-flash-on-route-open.md`](./plans/perf-investigate-initial-render-flash-on-route-open.md)
- [ ] **HIGH: Perf — Backend Bandwidth Optimisation (Every Byte Costs Money)** → [`plans/perf-backend-bandwidth-optimisation-every-byte-costs-money.md`](./plans/perf-backend-bandwidth-optimisation-every-byte-costs-money.md)
- [ ] **MEDIUM: Sentry — Issue Monitoring & Resolution Workflow** → [`plans/sentry-issue-monitoring-resolution-workflow.md`](./plans/sentry-issue-monitoring-resolution-workflow.md)
- [ ] **MEDIUM: Analytics — PostHog Product Instrumentation** → [`plans/analytics-posthog-product-instrumentation.md`](./plans/analytics-posthog-product-instrumentation.md)
- [ ] **LOW: Maintenance — Update libraries (Sentry SDK and others)** → [`plans/maintenance-update-libraries.md`](./plans/maintenance-update-libraries.md)
- [ ] **HIGH: E2E — Dedicated Test Account Cleanup** → [`plans/e2e-dedicated-test-account-cleanup.md`](./plans/e2e-dedicated-test-account-cleanup.md)
- [ ] **HIGH: E2E — Multi-Instance Patching** → [`plans/e2e-multi-instance-patching.md`](./plans/e2e-multi-instance-patching.md)
- [ ] **ON HOLD: SEO — OG Image Generation** → [`plans/on-seo-og-image-generation.md`](./plans/on-seo-og-image-generation.md)
