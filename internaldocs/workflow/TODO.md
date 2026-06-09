# TODO

> **Index of active and backlog tasks. Per-task detail lives in [plans/](./plans/).**
>
> **Rules for AI agents using this file:**
> 1. **Pick one task** by reading its plan file under `plans/`. Open the plan and update the
>    `## Decision log` section as you make non-obvious choices.
> 2. **Keep this index thin.** A task gets at most one line: status + title + link.
>    Backlog detail, layers, and acceptance criteria live in the plan file, not here.
> 3. **On completion**, move the one-line entry into [COMPLETED.md](./COMPLETED.md) with a date,
>    archive the plan file under `plans/done/`, and reset `CURRENT_FEATURE.md`.
> 4. **Do not duplicate strategy** already in `../product/PRINCIPLES.md` or `../product/ROADMAP.md`.

## Legend

- `[ ]` OPEN — `[~]` IN PROGRESS — `[x]` DONE

---

### 🔥 MAX PRIORITY

- [ ] **MAX: Bug — Patch editor collection-mode cards collapse to title-only after first connection** → [`plans/bug-patch-editor-collection-mode-cards-collapse-on-first-connection.md`](./plans/bug-patch-editor-collection-mode-cards-collapse-on-first-connection.md)

### PRODUCT — Tier 0 (ship in any order; no external dependencies)

- [ ] **MEDIUM: Admin — Rack Image Upload** → [`plans/admin-rack-image-upload.md`](./plans/admin-rack-image-upload.md)
- [ ] **HIGH: Module Possession States** → [`plans/module-possession-states.md`](./plans/module-possession-states.md)
- [x] **MEDIUM: Module Browser — Tag Filter UX improvements** → [`plans/module-browser-tag-filter-ux-improvements.md`](./plans/module-browser-tag-filter-ux-improvements.md)
- [ ] **HIGH: Rack Editor — Optimistic / diff-based updates (no full-reload flash)** → [`plans/rack-editor-optimistic-diff-based-updates-no-full-reload-flash.md`](./plans/rack-editor-optimistic-diff-based-updates-no-full-reload-flash.md)

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
- [ ] **BUG: Rack editor — name field empty when entering edit mode** → [`plans/rack-editor-name-field-empty-when-entering-edit-mode.md`](./plans/rack-editor-name-field-empty-when-entering-edit-mode.md)
- [x] **LOW: Filter inputs — focus-triggered preset chips overlay** → [`plans/filter-inputs-focus-triggered-preset-chips-overlay.md`](./plans/filter-inputs-focus-triggered-preset-chips-overlay.md)
- [ ] **MEDIUM: Manufacturer page — parity with module browser filters** → [`plans/manufacturer-page-parity-with-module-browser-filters.md`](./plans/manufacturer-page-parity-with-module-browser-filters.md)
- [ ] **MEDIUM: Module — public possession statistics & trend charts** → [`plans/module-public-possession-statistics-trend-charts.md`](./plans/module-public-possession-statistics-trend-charts.md)
- [ ] **LOW: Module — "Cool" appreciation button** → [`plans/module-cool-appreciation-button.md`](./plans/module-cool-appreciation-button.md)
- [ ] **MEDIUM: Module / Patch / Rack browser — replace pagination with "Load more"** → [`plans/module-patch-rack-browser-replace-pagination-with-load-more.md`](./plans/module-patch-rack-browser-replace-pagination-with-load-more.md)
- [ ] **HIGH: Bug — 1U module placeholder wrong aspect ratio** → [`plans/bug-1u-module-placeholder-wrong-aspect-ratio.md`](./plans/bug-1u-module-placeholder-wrong-aspect-ratio.md)
- [ ] **LOW: Module tags — axis-colour tinting (code-highlighting style)** → [`plans/module-tags-axis-colour-tinting-code-highlighting-style.md`](./plans/module-tags-axis-colour-tinting-code-highlighting-style.md)
- [x] **LOW: Module Browser — keyword highlighting in descriptions** → [`plans/module-browser-keyword-highlighting-in-descriptions.md`](./plans/module-browser-keyword-highlighting-in-descriptions.md)
- [x] **LOW: Maintenance — audit & fix external search shortcut URLs** → [`plans/maintenance-audit-fix-external-search-shortcut-urls.md`](./plans/maintenance-audit-fix-external-search-shortcut-urls.md)
- [ ] **LOW: Rack Editor — "Weakest category" hint in module picker** → [`plans/rack-editor-weakest-category-hint-in-module-picker.md`](./plans/rack-editor-weakest-category-hint-in-module-picker.md)
- [ ] **MEDIUM: Tag taxonomy — split "PURPOSE" group into sub-groups** → [`plans/tag-taxonomy-split-purpose-group-into-sub-groups.md`](./plans/tag-taxonomy-split-purpose-group-into-sub-groups.md)
- [ ] **LOW: Rack — Stale preview indicator** → [`plans/rack-stale-preview-indicator.md`](./plans/rack-stale-preview-indicator.md)
- [ ] **MEDIUM: Rack Comparison — balance diff between two racks** → [`plans/rack-comparison-balance-diff-between-two-racks.md`](./plans/rack-comparison-balance-diff-between-two-racks.md)
- [x] **LOW: Rack Editor — Same-HP highlight on hover (edit mode)** → [`plans/rack-editor-same-hp-highlight-on-hover-edit-mode.md`](./plans/rack-editor-same-hp-highlight-on-hover-edit-mode.md)
- [ ] **MEDIUM: Rack Editor — "Remix" layout optimizer** → [`plans/rack-editor-remix-layout-optimizer.md`](./plans/rack-editor-remix-layout-optimizer.md)
- [ ] **MEDIUM: Rack Editor — Quick-add blank panel shortcut** → [`plans/rack-editor-quick-add-blank-panel-shortcut.md`](./plans/rack-editor-quick-add-blank-panel-shortcut.md)
- [x] **HIGH: Rack Editor — Row HP overflow indicator** → [`plans/rack-editor-row-hp-overflow-indicator.md`](./plans/rack-editor-row-hp-overflow-indicator.md)
- [ ] **MEDIUM: Rack Analytics — Power Header Count** → [`plans/rack-analytics-power-header-count.md`](./plans/rack-analytics-power-header-count.md)
- [ ] **MEDIUM: Bug — Rack Preview Not Loading / Updating on Specific Rack** → [`plans/bug-rack-preview-not-loading-updating-on-specific-rack.md`](./plans/bug-rack-preview-not-loading-updating-on-specific-rack.md)
- [x] **MEDIUM: Bug — Moving Modules Inside a Rack Does Not Bump `updated` Timestamp** → [`plans/bug-moving-modules-inside-a-rack-does-not-bump-updated-timestamp.md`](./plans/bug-moving-modules-inside-a-rack-does-not-bump-updated-timestamp.md)
- [ ] **HIGH: Perf — Investigate Initial Render Flash on Route Open** → [`plans/perf-investigate-initial-render-flash-on-route-open.md`](./plans/perf-investigate-initial-render-flash-on-route-open.md)
- [x] **HIGH: Perf — Audit Reactive Pipelines & Event Chains for Smoothness** → [`plans/perf-audit-reactive-pipelines-event-chains-for-smoothness.md`](./plans/perf-audit-reactive-pipelines-event-chains-for-smoothness.md)
- [x] **HIGH: Perf — Cache Strategy Review (Hits, Invalidation, Coverage)** → [`plans/perf-cache-strategy-review-hits-invalidation-coverage.md`](./plans/perf-cache-strategy-review-hits-invalidation-coverage.md)
- [ ] **HIGH: Perf — Backend Bandwidth Optimisation (Every Byte Costs Money)** → [`plans/perf-backend-bandwidth-optimisation-every-byte-costs-money.md`](./plans/perf-backend-bandwidth-optimisation-every-byte-costs-money.md)
- [ ] **MEDIUM: Sentry — Issue Monitoring & Resolution Workflow** → [`plans/sentry-issue-monitoring-resolution-workflow.md`](./plans/sentry-issue-monitoring-resolution-workflow.md)
- [ ] **LOW: Maintenance — Update libraries (Sentry SDK and others)** → [`plans/maintenance-update-libraries.md`](./plans/maintenance-update-libraries.md)
- [ ] **HIGH: E2E — Dedicated Test Account Cleanup** → [`plans/e2e-dedicated-test-account-cleanup.md`](./plans/e2e-dedicated-test-account-cleanup.md)
- [ ] **HIGH: E2E — Multi-Instance Patching** → [`plans/e2e-multi-instance-patching.md`](./plans/e2e-multi-instance-patching.md)
- [ ] **ON HOLD: SEO — OG Image Generation** → [`plans/on-seo-og-image-generation.md`](./plans/on-seo-og-image-generation.md)
- [x] **POLICY: Unit Test Coverage** → [`plans/unit-test-coverage.md`](./plans/unit-test-coverage.md)
