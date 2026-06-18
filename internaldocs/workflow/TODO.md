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

- [ ] **HIGH: Security — Audit Remediation** → [`plans/security-audit-remediation.md`](./plans/security-audit-remediation.md)
- [ ] **ON HOLD: VERY LONG TERM: Bundle weight, lazy boundaries, and SSR prerender coverage** → [`plans/bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md`](./plans/bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md)
- [ ] **MEDIUM: Module — public possession statistics & trend charts** → [`plans/module-public-possession-statistics-trend-charts.md`](./plans/module-public-possession-statistics-trend-charts.md)
- [ ] **LOW: Cross-entity Cool reactions** → [`plans/module-cool-appreciation-button.md`](./plans/module-cool-appreciation-button.md)
- [ ] **LOW: Dev utils — "Merge into target module" action** → [`plans/dev-utils-merge-into-target-module.md`](./plans/dev-utils-merge-into-target-module.md)
- [ ] **MEDIUM: Tag taxonomy — split "PURPOSE" group into sub-groups** → [`plans/tag-taxonomy-split-purpose-group-into-sub-groups.md`](./plans/tag-taxonomy-split-purpose-group-into-sub-groups.md)
- [ ] **ON HOLD INDEFINITELY: Rack Comparison — balance diff between two racks** → [`plans/rack-comparison-balance-diff-between-two-racks.md`](./plans/rack-comparison-balance-diff-between-two-racks.md)
- [ ] **MEDIUM: Sentry — Issue Monitoring & Resolution Workflow** → [`plans/sentry-issue-monitoring-resolution-workflow.md`](./plans/sentry-issue-monitoring-resolution-workflow.md)
- [~] **MEDIUM: Analytics — PostHog Product Instrumentation** → [`plans/analytics-posthog-product-instrumentation.md`](./plans/analytics-posthog-product-instrumentation.md)
- [ ] **HIGH: E2E — Dedicated Test Account Cleanup** → [`plans/e2e-dedicated-test-account-cleanup.md`](./plans/e2e-dedicated-test-account-cleanup.md)
- [ ] **HIGH: E2E — Multi-Instance Patching** → [`plans/e2e-multi-instance-patching.md`](./plans/e2e-multi-instance-patching.md)
- [ ] **ON HOLD: SEO — OG Image Generation** → [`plans/on-seo-og-image-generation.md`](./plans/on-seo-og-image-generation.md)
