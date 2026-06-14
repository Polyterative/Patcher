<!-- Section: PRODUCT — Tier 0 (ship in any order; no external dependencies) -->

#### MEDIUM: Discovery — Most Owned / Wanted / Sold modules section

**Why:** We already capture user possession intent (`HAS`, `WANTS`, `SELLS`). Turning this
community data into ranked discovery surfaces helps users quickly find modules that are
popular to own, currently in demand, or actively circulating in the market.

**Product concept:**

- Add a discovery section that highlights top modules in three buckets:
  - **Most Owned**
  - **Most Wanted**
  - **Most Sold**
- Make each bucket browsable (top N) with direct links to module detail pages.
- Reuse existing aggregated counts from user module states; no user identities exposed.
- Use this as a lightweight recommendation/discovery layer, not as a full feed.

**Placement options (MVP choose one):**

- Home/explore page section with three tabs.
- Module browser sidebar/panel with quick links.
- Dedicated "Community Trends" route if we want room for future expansion.

**MVP shape:**

- [ ] Query ranked module lists by state (`HAS`, `WANTS`, `SELLS`) with stable sorting.
- [ ] Show module card rows with rank, module name, maker, and count.
- [ ] Add caching/TTL and refresh strategy so reads are cheap and responsive.
- [ ] Apply privacy thresholding for low counts (same policy as possession stats).
- [ ] Instrument clicks to measure discoverability impact.

**Open product questions:**

- Should ranking be all-time, rolling 30 days, or both?
- Should counts be global only, or filterable by format/category/tag/manufacturer?
- How many modules per bucket feel useful without becoming noisy?
- Should this section be personalized later (e.g., hide modules a user already owns)?

---

## Decision log

<!-- Append timestamped one-liners as the plan progresses. -->

- 2026-06-14 — Existing homepage implementation found: `HomeDiscoverySectionComponent` renders the three possession buckets, `ApplicationStatisticsService.discovery$` calls `GET.applicationModuleDiscovery(6, 3)`, and the RPC migration applies count thresholding/stable sorting. MVP scope is to enable and verify this existing surface rather than add a new route.
- 2026-06-14 — Enabled the homepage community trends section by flipping the existing `showCommunityTrends` flag. Added backend coverage for `get_module_discovery_snapshot` RPC parameters and response normalization; existing component tests continue covering rows, bucket analytics, and click analytics.
