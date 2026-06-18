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

- [ ] **HIGH: Marketplace — Purchase Price History** → [`plans/marketplace-purchase-price-history.md`](./plans/marketplace-purchase-price-history.md)

### PRODUCT — Tier 1 (requires Manufacturer Page Phase 2 to be live)

- [ ] **HIGH: Manufacturer Accounts & Verification (claims, admin review, verified-owner edits)** → [`plans/manufacturer-accounts-verification.md`](./plans/manufacturer-accounts-verification.md)
- [ ] **LOW: Manufacturer Updates / Featured Surface** → [`plans/manufacturer-updates-featured-surface.md`](./plans/manufacturer-updates-featured-surface.md)
- [ ] **LOW: Manufacturer Analytics** → [`plans/manufacturer-analytics.md`](./plans/manufacturer-analytics.md)
- [ ] **LOW: Manufacturer API / Widgets Pilot** → [`plans/manufacturer-api-widgets-pilot.md`](./plans/manufacturer-api-widgets-pilot.md)

### PRODUCT — Tier 2 (requires stable public profiles / community trust layer)

- [ ] **HIGH: Marketplace — Shipping Address Book** → [`plans/marketplace-shipping-address-book.md`](./plans/marketplace-shipping-address-book.md)
- [ ] **HIGH: Marketplace — Browse, Detail, and Cockpits** → [`plans/marketplace-browse-detail-and-cockpits.md`](./plans/marketplace-browse-detail-and-cockpits.md)
- [ ] **HIGH: Marketplace — Listings Core and Media** → [`plans/marketplace-listings-core-and-media.md`](./plans/marketplace-listings-core-and-media.md)
- [ ] **HIGH: Marketplace — Structured Inquiry and Offers** → [`plans/marketplace-structured-inquiry-and-offers.md`](./plans/marketplace-structured-inquiry-and-offers.md)
- [ ] **HIGH: Marketplace — Transaction Lifecycle** → [`plans/marketplace-transaction-lifecycle.md`](./plans/marketplace-transaction-lifecycle.md)
- [ ] **MEDIUM: Marketplace — Realtime Messaging** → [`plans/marketplace-realtime-messaging.md`](./plans/marketplace-realtime-messaging.md)
- [ ] **MEDIUM: Marketplace — Feedback and Reputation** → [`plans/marketplace-feedback-and-reputation.md`](./plans/marketplace-feedback-and-reputation.md)

### DATA MODEL (schema / domain gaps to address)

- [ ] **LOW: Module I/O — bidirectional and passive port support** → [`plans/module-io-bidirectional-passive-port-support.md`](./plans/module-io-bidirectional-passive-port-support.md)

### INFRA (independent; pick any time a product task is blocked)

- [ ] **ON HOLD: HIGH: Security — Manual Approval Follow-ups** → [`plans/security-manual-approval-followups.md`](./plans/security-manual-approval-followups.md)
- [ ] **ON HOLD: LOW: FUI-inspired instrument components** → [`plans/fui-inspired-instrument-components.md`](./plans/fui-inspired-instrument-components.md)
- [ ] **ON HOLD: VERY LONG TERM: Bundle weight, lazy boundaries, and SSR prerender coverage** → [`plans/bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md`](./plans/bundle-weight-lazy-boundaries-and-ssr-prerender-coverage.md)
- [ ] **ON HOLD: MEDIUM: Module possession trend charts (schema approval follow-up)** → [`plans/module-possession-trend-charts-schema-followup.md`](./plans/module-possession-trend-charts-schema-followup.md)
- [ ] **LOW: Cross-entity Cool reactions** → [`plans/module-cool-appreciation-button.md`](./plans/module-cool-appreciation-button.md)
- [ ] **ON HOLD INDEFINITELY: Rack Comparison — balance diff between two racks** → [`plans/rack-comparison-balance-diff-between-two-racks.md`](./plans/rack-comparison-balance-diff-between-two-racks.md)
- [ ] **ON HOLD: MEDIUM: Sentry — Live Issue Audit** → [`plans/sentry-live-issue-audit.md`](./plans/sentry-live-issue-audit.md)
- [~] **HIGH: E2E — Dedicated Test Account Cleanup** → [`plans/e2e-dedicated-test-account-cleanup.md`](./plans/e2e-dedicated-test-account-cleanup.md)
- [ ] **MEDIUM: Docs screenshot pipeline refresh (audit E2E captures, then sync to Patcher-docs)** → [`plans/docs-screenshot-pipeline-refresh.md`](./plans/docs-screenshot-pipeline-refresh.md)
- [ ] **MEDIUM: Patch SVG previews (mirror rack JPEG preview UX/backend, but store SVG of the patch graph)** → [`plans/patch-svg-previews.md`](./plans/patch-svg-previews.md)
- [ ] **ON HOLD: SEO — OG Image Generation** → [`plans/on-seo-og-image-generation.md`](./plans/on-seo-og-image-generation.md)
