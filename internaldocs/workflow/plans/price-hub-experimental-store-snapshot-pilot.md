<!-- Section: PRODUCT — Tier 1 / Experimental infrastructure pilot -->

#### MEDIUM: Price Hub — Experimental Store Snapshot Pilot

**Status:** MVP persistence/display checkpoint active. The additive schema has been applied remotely; corrected SchneidersLaden ADDAC812VU / Finaliser R-EQ / Nibbler snapshots plus full Signal Sounds EU, SchneidersLaden, New Groove, and Elevator Sound crawl imports are visible on module detail. Signal Sounds lazy stock detection, batched Randem inventory, shippable-location fallback, SchneidersLaden archived-page detection, Shopware structured-stock detection, Shopware panel-variant diagnostics, same-product match deduplication, memory-safe full-catalog matching, compact module-code matching, New Groove used/preorder noise filtering, Elevator Sound B-stock/ex-demo/preorder/accessory filtering, explicit shipping-origin labels, and module-detail status-dot/filter/order display have been fixed in the local crawler/importer/UI. Elevator Sound uses the official UK `.com` WooCommerce store after the previous `.eu` target failed DNS. No RLS/policy/GRANT change, Edge Function deploy, cron job, push, or release has been approved.

**Current checkpoint:** local MVP preparation has been refined with Node-testable snapshot worker helper logic, a local-only no-database probe mode, WooCommerce/BigCommerce/Shopware local crawlers, a schema-only Supabase persistence layer, and a module-detail Store prices card. The crawler can remain local-first long-term; Edge Function deploy/Cron remains a later decision.

**Why:** Patcher already has module store search links and one `modules.store_url` field, but users cannot see current store-by-store price or availability inside Patcher. This pilot proves whether Patcher can collect daily price/stock snapshots with the existing Supabase-backed, backendless architecture before committing to a full Price Hub.

**Final objective:** let users check module availability and prices store by store, with source links and freshness labels, while keeping unverified stores as search-link fallbacks.

**Pilot hypothesis:** local-first crawling can discover and review store/module matches safely before deciding whether any Supabase-backed daily snapshot worker is still needed. If translated later, Supabase Edge Functions plus Supabase Cron should be enough for a small daily store snapshot worker on the current Free organization, provided the worker is DB-queued, capped, and launched with one or two easy stores first.

---

## Cost and feasibility gate

### Current Supabase state observed 2026-07-01

- Organization: `MAIN` / `colourful-peach-caterpillar`
- Plan: **Free**
- Patcher project: `sozmatmywjpstwidzlss`
- Project status: **ACTIVE_HEALTHY**
- Region: `eu-central-1`

### Supabase Free limits relevant to this pilot

Source: Supabase pricing/docs checked 2026-07-01.

| Area | Free-plan allowance / limit | Pilot impact |
|---|---:|---|
| Edge Function invocations | 500,000/month included | A daily worker is ~30 invocations/month if one scheduled call handles the batch. This is effectively free at pilot scale. |
| Edge Function count | 100 functions/project | One or two functions are fine. |
| Edge Function wall-clock duration | 150 seconds | The worker must process a capped batch, not every listing forever. |
| Edge Function memory | 256 MB | Fine for fetch + parse + inserts; avoid browser automation. |
| Edge Function CPU time | 2 seconds/request | Use lightweight HTML/JSON parsing and async I/O only. |
| Database size | 500 MB | Fine for a small snapshot pilot; snapshot retention must be capped before broad rollout. |
| Egress | 5 GB/month | Likely fine for daily small batches; monitor before expanding store/listing count. |
| Free project pausing | After 1 week of inactivity | Patcher is currently active; still a risk for dormant side projects, not the active app. |
| Cron jobs | Supabase Cron supports recurring jobs; docs recommend no more than 8 concurrent jobs and jobs under 10 minutes | One daily job is safe. |

**Cost conclusion:** the daily experimental pilot should fit the Free plan if it stays small: one scheduled Edge Function, one batch per day, no browser rendering, no high-frequency refreshes, and no broad all-store crawl.

**Cost stop conditions:**

- Snapshot tables approach 250 MB or grow faster than expected.
- Function runtime regularly nears 150 seconds.
- Egress/log volume becomes measurable against the 5 GB allowance.
- Store count/listing count requires multiple scheduled jobs or high-frequency refreshes.
- The project must move to Pro for unrelated production needs; then revisit whether Price Hub work should expand.

---

## Stores checked for parser ease

### Easiest first

| Store | Likely adapter | Evidence | Pilot priority |
|---|---|---|---|
| Elevator Sound | `woocommerce_store_api` | Official reachable site is `www.elevatorsound.com`, whose WooCommerce Store API works. Official contact page lists Elevator Sound at 74 Stokes Croft, Bristol, BS1 3QY; treat shipping origin as `GB`, currency as `GBP`. The earlier `.eu` target was invalid and failed DNS. | 1 |
| New Groove | `woocommerce_store_api` | Public WooCommerce Store API returns sale/regular price, EUR currency, stock flags, permalink, images. Some real product rows expose `0` with empty `price_html`; normalize those as unknown/suspicious, not as `0.00 EUR`. Italian used/preorder listings (`usato`, `occasione`, `prenotazione`, `preordine`) must be excluded from full-catalog imports so second-hand/deposit pages do not masquerade as current new-stock listings. | 1 |
| Signal Sounds UK | `bigcommerce_metadata` | Product sitemap exposes product URLs; product pages expose `product:price:amount`, `product:price:currency`, `og:url`, `og:title`, image metadata, and SKU. Availability metadata can be stale, so the crawler overrides it with Randem store-location inventory for the `HQ` store. | 2 |
| Signal Sounds EU | `bigcommerce_metadata` | Separate `signalsounds.eu` store with its own sitemap, EUR prices, and potentially different availability from the UK store. Official store copy says EU orders ship from the warehouse in Poland, so shipping origin is `PL` even though the sales region is EU. Availability can lazy-update after page load; the crawler overrides stale `og:availability` with Randem inventory for the `SS Europe` store. | 2 |
| SchneidersLaden | `shopware_metadata` | Robots allows sitemap/product pages; Shopware sitemap index points to `.xml.gz` URL set; product pages expose `product:price:amount`, `product:price:currency`, `og:url`, `og:title`, product ID, image metadata, and stock text. | 2 |
| Control | `shopify_product_json` | Shopify search/product JSON returns `price`, `available`, variants, inventory, vendor, handle. | 2 |
| Found Sound | `shopify_product_json` | Shopify search/product JSON returns `price`, `available`, tags, vendor, condition/new-vs-used data. | 2 |
| Synthshop | `shopify_product_json` | `products.json` works; search suggest was weak, so use curated product URLs. | 2 |

### Defer initially

| Store | Reason to defer |
|---|---|
| Perfect Circuit | Fetch returned 403 during sampling. Needs permission/API/affiliate route before automated checks. |
| Thomann | Geo/cookie friction during sampling. Important store, but not a first parser. |
| Milk Audio | Search page did not expose an obvious stable product API in quick fetch. |
| Exploding Shed | No obvious Shopify/WooCommerce endpoint in quick fetch. |
| Machineroom | No obvious WooCommerce endpoint in quick fetch. |
| Escape From Noise | Custom/Abicart-like HTML; no easy Shopify/WooCommerce endpoint. |
| Wigglehunt | Aggregator rather than direct retailer; useful as a link/reference, not a canonical store snapshot source. |

---

## Proposed backend shape

### Tables

Additive schema applied remotely 2026-07-02 under the schema-only approval gate. No RLS/policy/GRANT changes were included.

#### `stores`

Registry for known retailers/search targets.

- `id`
- `slug`
- `name`
- `country_code`
- `base_url`
- `search_url_template`
- `adapter_kind`: `woocommerce_store_api | shopify_product_json | bigcommerce_metadata | shopware_metadata | custom | none`
- `currency_hint`
- `active`
- `price_tracking_enabled`
- `rate_limit_per_day`
- `created_at`
- `updated_at`

#### `module_store_listings`

Curated canonical product URL per module/store.

- `id`
- `module_id`
- `store_id`
- `product_url`
- `external_product_id`
- `external_handle`
- `active`
- `verification_status`: `candidate | verified | rejected | stale`
- `last_checked_at`
- `last_success_at`
- `next_check_at`
- `failure_count`
- `last_error`
- `created_at`
- `updated_at`

#### `module_price_snapshots`

Append-only observed price/availability history.

- `id`
- `listing_id`
- `observed_at`
- `price_amount_minor`
- `currency`
- `availability`: `in_stock | out_of_stock | preorder | backorder | discontinued | unknown`
- `source`: `scraper | api | manual | community | manufacturer`
- `raw_meta`
- `created_at`

### Retention policy for pilot

- Keep all snapshots while the pilot is below 50,000 rows.
- Before broader rollout, add an explicit retention/compaction rule:
  - keep daily snapshots for 12 months, or
  - keep only changed snapshots plus weekly unchanged checkpoints.

---

## Scheduled worker design

### Preferred environment

Use **Supabase Scheduled Edge Functions**:

```text
Supabase Cron
→ invokes snapshot-store-listings Edge Function once daily
→ function selects due module_store_listings rows
→ calls adapter based on stores.adapter_kind
→ inserts module_price_snapshots
→ updates listing health and next_check_at
```

### Worker rules

- The cron wake-up does not mean "check everything." It means "process the next due capped batch."
- Start with `limit = 20` listings/day.
- Hard cap runtime under 120 seconds to leave margin below the 150 second Free-plan wall-clock limit.
- Never use browser automation in the pilot.
- Use store-level `active` and `price_tracking_enabled` kill switches.
- Use per-listing exponential backoff after failures.
- Mark data stale rather than displaying stale data as current.
- Keep raw HTML out of permanent storage unless a tiny diagnostic sample is necessary; store normalized data plus compact parser metadata.

### Initial cadence

- Cron: once daily.
- Listing `next_check_at`: 24 hours after a successful check.
- Failure backoff: 1 day, 3 days, 7 days, then `verification_status = stale`.
- Manual refresh: deferred; later only if rate-limited and admin/user-scoped.

### Local no-database probe

Before deploy, the Edge Function can be served locally and called with `mode=probe`.
It still requires `PRICE_HUB_SNAPSHOT_TOKEN`, but does not read Supabase URL/service-role env vars, create a Supabase client, or read/write tables.
The probe fetch target is restricted to the approved WooCommerce pilot hosts: `elevatorsound.com`, `www.elevatorsound.com`, `newgroove.it`, and `www.newgroove.it`.

```bash
curl -sS -X POST 'http://127.0.0.1:54321/functions/v1/snapshot-store-listings?mode=probe' \
  -H "Authorization: Bearer $PRICE_HUB_SNAPSHOT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"storeBaseUrl":"https://www.elevatorsound.com/","productUrl":"https://www.elevatorsound.com/product/make-noise-maths/","externalHandle":"make-noise-maths"}'
```

Expected response shape: `{ "mode": "probe", "wroteToDatabase": false, "apiUrl": "...", "snapshot": { ... } }`.

### Local catalog crawler and matcher

The local crawler is the current safe path for broad product discovery. It reads only the approved HTTPS store surfaces (WooCommerce Store API, BigCommerce product sitemaps plus product-page metadata, or Shopware sitemaps plus product-page metadata) and writes local files; it does not read/write Supabase, verify matches, deploy an Edge Function, create Cron, or add UI.

```bash
pnpm price-hub:crawl-local --store=all --max-pages=5
pnpm price-hub:crawl-local --store=elevator-sound --modules=path/to/modules.json --min-score=0.72
pnpm price-hub:crawl-local --store=signal-sounds-uk --max-products=100
pnpm price-hub:crawl-local --store=signal-sounds-eu --max-products=100
pnpm price-hub:crawl-local --store=schneidersladen --max-products=100
```

Outputs:

- `tmp/price-hub/<storeSlug>/products.json` — normalized store products.
- `tmp/price-hub/<storeSlug>/matches.json` — optional conservative module/product candidates when `--modules` is provided. Status is only `strong_candidate`, `review_candidate`, or `ignored`; nothing is marked verified.

### Local import path

Curated local crawler matches can now be imported into the schema. The import keeps listing identity/current URL in `module_store_listings` and inserts a new append-only `module_price_snapshots` row on every run.

```bash
pnpm price-hub:import-local \
  --store=signal-sounds-uk \
  --products=tmp/price-hub/signal-sounds-uk/products.json \
  --matches=tmp/price-hub/signal-sounds-uk/matches.json \
  --dry-run
```

Live writes require `SUPABASE_SERVICE_ROLE_KEY`. The importer accepts only strong candidates by default, chooses the highest-scoring product per module so the `(module_id, store_id)` listing constraint is not hit twice in one upsert, and then chooses one best module per product URL so the `(store_id, product_url)` listing constraint is not hit by duplicate ModularGrid/module matches. Dropped alternate modules are recorded in the selected snapshot metadata as `priceHubProductMatchAmbiguity` and `priceHubAlternateMatchedModules`.

SchneidersLaden preview seed:

- A 1500-product local crawl discovered 5457 product URLs and normalized 1500 products.
- Local availability distribution in that crawl: 678 `in_stock`, 132 `out_of_stock`, 62 `preorder`, and 628 `discontinued`.
- The import dry-run produced 550 strong module rows before product-URL deduplication and 501 rows after deduplication.
- Remote preview import inserted 501 append-only snapshots and upserted 501 SchneidersLaden listings. Latest preview distribution after import: 238 `in_stock`, 40 `out_of_stock`, 22 `preorder`, and 202 `discontinued`, plus the previously corrected `4524` discontinued listing.

WooCommerce zero-price rule:

- `price`, `regular_price`, and `sale_price` values of `0` are treated as missing/suspicious module prices, not valid free products.
- Normalized snapshots keep `currency` and add compact metadata such as `priceWasZero` and, when the API includes empty price markup, `priceHtmlEmpty`, so the crawler can report the store quirk without showing impossible `0.00 EUR` prices.

Signal Sounds availability rule:

- BigCommerce page metadata and native page stock can report `instock` while the rendered page later shows a Randem Retail stock widget with "Sorry, this item is out of stock".
- The local crawler now extracts the SKU from page metadata/BigCommerce template data and calls `https://api.randemretail.online/public/api/location` with the Signal Sounds application id in SKU batches after product-page normalization. Per-product calls hit rate limits on full-catalog crawls.
- Storefront-specific inventory wins over stale metadata: `signal-sounds-eu` reads `SS Europe`, while `signal-sounds-uk` reads `HQ`.
- The Randem response is inconsistent: some EU rows expose `storeName: "SS Europe"` without `storeExternalId`, so the parser accepts either field for store targeting.
- Some EU storefront pages are buyable when `SS Europe` quantity is zero but another Randem location is shippable with quantity. The crawler now treats any shippable positive Randem row as `in_stock`, while preserving all location quantities in raw metadata for diagnostics.
- Signal availability is fail-closed: if a product has no SKU or no authoritative Randem row, the normalized availability becomes `unknown` instead of trusting stale `og:availability`.
- The normalized snapshot keeps compact diagnostics in `rawMeta.signalSoundsAvailabilitySource`, `rawMeta.signalSoundsStoreExternalId`, `rawMeta.signalSoundsInventoryQuantity`, and `rawMeta.signalSoundsInventoryLocations`.

Full-crawl correction:

- `signal-sounds-eu`: 4461 normalized products, 2615 match candidates after memory-safe filtering, 1355 accepted import rows, 1339 appended snapshots, and 16 skipped normalized-URL conflicts already linked to other modules.
- `schneidersladen`: 5180 normalized products from 5464 discovered product URLs, 3245 match candidates after memory-safe filtering, 1851 accepted import rows, 1841 appended snapshots, and 10 skipped normalized-URL conflicts already linked to other modules.
- `new-groove`: 5887 normalized WooCommerce Store API products, 1692 match candidates after full-catalog filtering, 1580 strong candidates, 942 accepted import rows after deduplication, and no skipped conflicts in the corrected import. Three previously active New Groove listing URLs containing used/preorder markers were deactivated after the noise rule fix.
- `elevator-sound`: 2887 normalized WooCommerce Store API products from the official `www.elevatorsound.com` domain over 29 pages, 1927 match candidates after full-catalog filtering, 1708 strong candidates, 1077 accepted import rows after deduplication, 1077 upserted active listings, and 1077 appended snapshots. Latest accepted availability distribution: 620 `in_stock`, 348 `backorder`, and 109 `out_of_stock`.
- Current latest coverage after the imports: 1368 Signal EU listings, 1872 SchneidersLaden listings, 952 New Groove listings, 1077 Elevator Sound listings, and 6643 active listings across imported store/listing pairs.
- Corrected examples:
  - Finaliser R-EQ (`4263`) is `in_stock` at both Signal EU and SchneidersLaden.
  - ADDAC812VU (`4524`) remains `discontinued` at SchneidersLaden after compact module-code matching recovers the `ADDAC812VU` -> `812V` product match.
  - Nibbler (`4831`) is `in_stock` at both stores; Signal EU uses shippable Randem `HQ` quantity while preserving EU/HQ location diagnostics.
  - Make Noise 0-Coast (`4106`) points to canonical New Groove URL `make-noise-0-coast`, not the `prenotazione` URL; New Groove currently reports availability with unknown price because its WooCommerce API exposes empty/zero price fields.
  - Make Noise 0-CTRL (`2810`) has four active imported store listings: Signal Sounds EU, Signal Sounds UK, SchneidersLaden, and New Groove.
  - Finaliser R-EQ (`4263`) now has five visible store rows; Elevator Sound reports `£380.00`, `in_stock`, and `United Kingdom`.
  - Good Elevator Sound overlap routes for UI comparison include `/modules/details/101`, `/modules/details/116`, `/modules/details/169`, `/modules/details/171`, `/modules/details/249`, `/modules/details/2810`, `/modules/details/4106`, `/modules/details/4263`, `/modules/details/4831`, and `/modules/details/8142`.

Shipping-origin rule:

- Store location badges are shipping origins, not sales regions. Do not show generic `EU`/region labels as if they were a physical dispatch point.
- Official Signal Sounds EU copy says the EU store delivers from its warehouse in Poland, so `signal-sounds-eu.country_code = PL`.
- Official Elevator Sound contact details place the active store in Bristol, United Kingdom; the crawler target is `elevator-sound` at `www.elevatorsound.com`, with `country_code = GB` and `currency_hint = GBP`.
- If a future store row still has a generic region code such as `EU`, the UI should surface that as data needing review rather than pretending it is a shipping origin.

Shopware archived-page rule:

- SchneidersLaden product pages can contain generic `in stock` text before the actual buy widget marks a product as archived.
- Terminal unavailable page text wins over earlier generic availability text: `Product is archived`, `Sorry folks`, sold-out, unavailable, and out-of-stock messages are checked before `In stock`.
- Archived products normalize to `availability = discontinued`; the snapshot keeps `rawMeta.pageAvailabilityText` for diagnostics.
- For available products, structured product availability (`schema.org/InStock`), `delivery-information delivery-available`, or an enabled `Add to cart` buy button wins over stray `preorder` words inside descriptions or external product links. Nibbler exposed this case: both Black and Silver pages are in stock, but the description links to a manufacturer URL containing `nibbler-preorder`.

Panel variant rule:

- Some stores expose multiple product URLs for the same module with different panel colours and availability, for example AJH Synth Finaliser R-EQ Silver in stock while Black is preorder.
- The current UI does not differentiate panel variants; `module_store_listings` still has one current URL per module/store.
- Product normalization records `rawMeta.panelVariant` when obvious panel colour tokens are present.
- Local import selection prefers the best available equal-score variant (`in_stock` before preorder/backorder/out-of-stock/discontinued/unknown), then records ambiguity diagnostics in the selected snapshot: `priceHubVariantAmbiguity`, `priceHubPanelVariants`, and `priceHubAlternateMatchedProducts`. `unknown` must not win over a verified unavailable state because that would hide known store evidence.

Full-catalog matching rule:

- Full Signal Sounds catalogs are large enough that retaining positive-score `ignored` candidates can exhaust Node heap.
- `matchModulesToProducts(..., { includeIgnored: false })` and `--include-ignored-matches=false` keep only strong/review candidates for full-catalog runs, while the default still includes ignored positive-score rows for smaller diagnostic crawls.
- Compact manufacturer-prefixed codes such as `ADDAC812VU` can appear as split store product slugs (`addac-systems-812v-led-voltage-meter`). The matcher now adds compact code aliases only when manufacturer evidence is already present, avoiding broad numeric false positives. Bare numeric suffixes are not aliases on their own, so Tiptop `BD909` / `CP909` / `HATS909` do not match an `SD909` page solely through `909`; alphanumeric code aliases such as `812v` still work.
- For retailer imports that should represent new/current-stock products, store-language noise terms must be strong enough to fall below importable status even when manufacturer, module name, and compact code all match. New Groove currently excludes `used`, `usato`, `occasione`, `prenotazione`, and `preordine`; otherwise rows such as `Make Noise 0-Coast (prenotazione)` can be incorrectly selected over the canonical product page.
- Elevator Sound also needs English condition/order/accessory filtering: `b-stock`, `ex-demo`, `pre-order`, `deposit`, `accessory`, and related hyphen/space variants are treated as noise so B-stock, ex-demo, preorder, and accessory pages do not become verified current-new-stock imports.

---

## UI shape for eventual pilot display

The first UI surface is implemented on module detail, directly under the primary module card on desktop so price/availability is visible without scrolling past the secondary rail.

Preferred v1 placement:

- Inline on module detail, near existing `Buy new` and `Search on` surfaces.
- Title: **Store prices**.
- Each row shows:
  - store name
  - price
  - shipping-origin country name (`Poland`, `Germany`, etc.) when known
  - availability with a status dot (`in_stock` green, `out_of_stock` red, preorder/backorder amber, `discontinued` grey, unknown muted)
  - `Checked X ago`
  - outbound store link
- Controls:
  - `Show`: All, In stock, Available soon, Unavailable, Unknown.
  - `Order`: Lowest price first by default, plus highest price, availability, store name, and most recently checked.
  - Unknown prices sort after known prices for price ordering.
- Unverified stores remain as search chips.

Trust rules:

- Always label source/freshness.
- If stale, show `Last seen` or hide current price.
- Do not rank stores as "best" until coverage is reliable.
- Do not convert currencies in v1 unless clearly labelled as estimated.
- The current read path fetches only one embedded latest snapshot per active listing (`module_price_snapshots.limit=1`) and leaves historical rows for future charts/history views.

---

## MVP → Structural → Polish layers

### MVP — one daily worker, no public UI

- [x] Confirm cost/plan feasibility and document Free-plan constraints.
- [x] Draft additive local migration for `stores`, `module_store_listings`, and `module_price_snapshots`.
- [x] Seed 2 stores only: Elevator Sound and New Groove.
- [x] Manually curate initial Signal Sounds `module_store_listings` rows for known modules.
- [x] Create `snapshot-store-listings` Edge Function with WooCommerce Store API adapter only.
- [x] Extract pure worker helpers for limit parsing, auth token checks, WooCommerce Store API URL building, failure backoff/stale state, and normalized error clipping.
- [x] Add targeted Node tests for the worker helpers without importing Deno/Supabase runtime modules.
- [x] Add local-only `mode=probe` behavior to fetch and normalize one WooCommerce product without Supabase env/client/database access.
- [x] Add local-only WooCommerce catalog crawler and conservative matcher for `elevator-sound` and `new-groove`, writing to `tmp/price-hub`.
- [x] Treat zero WooCommerce module prices as unknown/suspicious data instead of displayable `0.00 EUR` prices.
- [x] Add local-only BigCommerce metadata sitemap crawler for Signal Sounds UK and Signal Sounds EU as separate stores.
- [x] Override stale Signal Sounds availability metadata with SKU-based Randem store-location inventory.
- [x] Add local-only Shopware sitemap/metadata crawler for SchneidersLaden.
- [ ] Run Edge Function manually first; only then add daily cron.
- [x] Store snapshots and listing health.
- [x] Inspect DB output manually.
- [x] Seed SchneidersLaden preview data from a broad local crawl after explicit approval.
- [x] Seed New Groove preview data from a full local WooCommerce crawl after excluding used/preorder false positives.
- [x] Seed Elevator Sound preview data from a full official-domain WooCommerce crawl after excluding B-stock, ex-demo, preorder, accessory, and shared numeric-code false positives.

### Structural — reusable adapter spine

- [ ] Add Shopify product JSON adapter.
- [x] Add Signal Sounds BigCommerce metadata adapter.
- [x] Add SchneidersLaden Shopware metadata adapter.
- [ ] Add store/listing health states and admin-only diagnostics.
- [ ] Add stale-data policy and snapshot retention rule.
- [x] Add read methods through `SupabaseService` for current listing summaries.
- [ ] Add docs for adding a new store adapter.

### Polish — user-visible Price Hub seed

- [x] Ask for UX placement approval for module detail "Available at stores" block.
- [x] Render current verified listings on module detail.
- [ ] Keep `Search on` chips for unverified/untracked stores.
- [x] Add clear freshness/source labels.
- [x] Place Store prices directly under the module card and add colored availability status dots.
- [x] Add Store prices filtering/ordering controls with lowest-known-price default.
- [ ] Add sparse price history only after enough snapshots exist.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Free plan limits are exceeded | Start daily, capped, and monitor rows/runtime. Stop before broad rollout. |
| Edge Function timeout | Batch due listings; keep one invocation small; no browser automation. |
| Wrong product match | Require curated product URLs for snapshots; do not scrape search results into snapshots automatically. |
| Store parser breaks | Per-store kill switch, failure backoff, stale status. |
| Store API exposes placeholder zero prices | Treat zero module prices as unknown/suspicious and keep metadata for review; never display `0.00 EUR` as a real module price. |
| Signal Sounds lazy stock widget disagrees with metadata | Prefer SKU-based Randem store-location inventory over BigCommerce `og:availability`; select `SS Europe` for EU and `HQ` for UK. |
| Signal Sounds full crawl rate-limits per-product inventory checks | Batch Randem SKU availability after page normalization; fail closed to `unknown` when authoritative inventory is missing. |
| SchneidersLaden archived pages contain earlier generic in-stock text | Prioritize terminal archived/sold-out widget text over first-match availability text; normalize archived pages as `discontinued`. |
| SchneidersLaden descriptions mention preorder for external/manufacturer context | Prefer structured product availability and the buy widget over descriptive/link text after terminal unavailable text has been ruled out. |
| Panel variants have different availability | For now aggregate at module/store level by choosing the best available equal-score variant; preserve panel variant and alternates in `rawMeta` for future UI/history work. |
| Same store product URL matches multiple modules | Keep one listing per `(store_id, product_url)` and choose the best module deterministically; preserve alternate matched modules in `rawMeta` for review. |
| Legal/ToS issue | Check robots/ToS before enabling each store; prefer public APIs/affiliate feeds; attribute and link source. |
| Stale data damages trust | Always show checked time; hide/degrade stale rows. |
| Snapshot table grows forever | Add retention/compaction before expanding beyond pilot. |
| Production backend risk | Additive schema only; no RLS/policy changes without explicit approval; run advisors after schema drafts. |
| Schema-only tables have RLS disabled | Accepted only for this checkpoint because the user explicitly selected no RLS/policies yet; revisit before broader write surfaces or non-public data. |

---

## Validation strategy

Docs-only checkpoint:

- `node scripts/checks/check-docs.cjs`
- `git diff --check`

Implementation checkpoint, if approved later:

- Read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight before touching migrations.
- Draft local migration only first.
- Run Supabase advisors after schema draft.
- Run `pnpm updateBackendTypes` after approved schema changes.
- Add parser unit tests with fixed fixture strings for each adapter.
- Add worker helper tests for runtime-adjacent logic that can run without Deno/Supabase.
- Manually invoke the Edge Function before enabling cron.
- Confirm cron writes one snapshot and updates listing health.

---

## Approval gates

- [x] User approval to draft a local additive migration.
- [x] User approval to apply the additive schema-only migration remotely.
- [ ] User approval for any RLS/policy/GRANT changes.
- [ ] User approval to deploy the Edge Function.
- [ ] User approval to create the daily Supabase Cron job.
- [x] User approval for the user-visible module detail Store prices UI placement.

### Approval queue

- **Approval requested 2026-07-01T12:03+02:00:** May the next checkpoint apply `supabase/migrations/20260701115059_add_price_hub_pilot_tables.sql` to the remote Supabase project so the pilot tables and two store registry rows exist? This does not include RLS/policy/GRANT changes, Edge Function deployment, Cron creation, user-visible UI, or guessed `module_store_listings` rows. Default if not approved: keep the pilot local-only.
- **Approval recorded 2026-07-02T11:40+02:00:** User approved writing exactly one test SchneidersLaden price snapshot for module `4524` only.
- **Approval recorded 2026-07-02T14:30+02:00:** User approved applying a broader SchneidersLaden crawl dataset to the database so preview/local browsing can show real crawled prices and availability.

---

## Decision log

- 2026-07-01T11:08+02:00 — User requested an experimental pilot plan for store-by-store module price/availability tracking, with daily Supabase Edge Function execution if cost/Free-plan feasibility checks out.
- 2026-07-01T11:12+02:00 — Supabase organization `MAIN` is on the Free plan and Patcher project `sozmatmywjpstwidzlss` is active/healthy. Supabase Free includes 500,000 Edge Function invocations/month, 100 functions/project, 150s function wall-clock, 256 MB memory, 500 MB database, and 5 GB egress. A daily capped pilot should fit Free-plan limits.
- 2026-07-01T11:12+02:00 — Pilot environment recommendation: Supabase Cron invoking a DB-queued Edge Function once daily. Do not add a separate server or browser automation for the pilot.
- 2026-07-01T11:12+02:00 — Parser priority: start with WooCommerce Store API stores (Elevator Sound, New Groove), then Shopify JSON stores (Control, Found Sound, Synthshop), then Signal Sounds EU BigCommerce metadata.
- 2026-07-01T11:50+02:00 — MVP local-preparation layer drafted: local additive migration, table constants, WooCommerce-only Edge Function worker shape, and parser fixtures/tests. `module_store_listings` seed rows remain blocked on real module IDs plus verified canonical product URLs; the next approval gate is remote migration application.
- 2026-07-01T11:50+02:00 — Review findings addressed before handoff: WooCommerce fetches have a timeout, search result normalization fails closed instead of snapshotting a first-product fallback, and the worker fails closed if `PRICE_HUB_SNAPSHOT_TOKEN` is not configured.
- 2026-07-01T12:03+02:00 — Created verified checkpoint commit `3918cf03` for the local MVP preparation and stopped at the remote migration approval gate.
- 2026-07-01T13:16+02:00 — Local-only refinement extracted Deno-free snapshot worker helpers and Node tests for limit parsing, fail-closed auth, WooCommerce URL construction/slug fallback, failure backoff/stale threshold, and error message clipping. `recordFailure` now checks update errors and surfaces them in the listing result instead of silently ignoring them. No migration, RLS/policy/GRANT, Edge Function deploy, Cron, UI, push, or release was performed.
- 2026-07-01T13:16+02:00 — Created verified checkpoint commit `e5998b2d` for the local-only worker helper refinement. The next step remains blocked on remote migration approval.
- 2026-07-01T14:27+02:00 — Added a local-only `mode=probe` PoC path for the snapshot Edge Function. It is intentionally DB-free, requires explicit probe JSON input, returns the WooCommerce API URL plus normalized snapshot, and keeps deploy/migration/RLS/Cron/UI/push gates closed.
- 2026-07-01T14:27+02:00 — Review flagged arbitrary probe hosts as an SSRF risk; probe fetch targets are now restricted to HTTPS on the approved WooCommerce pilot hosts only.
- 2026-07-01T14:27+02:00 — Created verified checkpoint commit `2a04f353` for the no-database probe mode. The next step remains blocked on explicit deploy/push approval; remote migrations, RLS/policy/GRANT changes, Cron, and UI remain unapproved.
- 2026-07-02T09:38+02:00 — Added local-only crawler/matcher scripts for approved WooCommerce pilot stores. This checkpoint keeps Price Hub data discovery in local JSON files under `tmp/price-hub`, treats Supabase translation as a later decision, and never marks a product/module match as verified.
- 2026-07-02T09:38+02:00 — Review flagged zero-score generic module rows as a `matches.json` explosion risk; matcher now drops zero-score candidates and keeps ignored rows only when there was real positive signal.
- 2026-07-02T09:38+02:00 — Created verified checkpoint commit `e7e3bd1b` for the local catalog crawler/matcher. The next step remains local analysis of crawler output or explicit approval for any remote/Supabase/UI work.
- 2026-07-02T10:04+02:00 — Live New Groove inspection found real module products where the WooCommerce Store API returns `price`, `regular_price`, and `sale_price` as `0` with empty `price_html`. The normalizer now treats zero prices as unknown/suspicious (`priceAmountMinor: null`, `rawMeta.priceWasZero: true`) so Patcher never shows impossible `0.00 EUR` module prices.
- 2026-07-02T10:17+02:00 — Added Signal Sounds as two local-only stores: `signal-sounds-uk` (`signalsounds.com`, GBP) and `signal-sounds-eu` (`signalsounds.eu`, EUR). Both crawl product sitemap URLs and normalize BigCommerce product metadata, preserving separate price/availability observations per domain.
- 2026-07-02T10:33+02:00 — Added SchneidersLaden as a local-only Shopware metadata store. The crawler follows the allowed sitemap index to its gzipped URL set, skips non-product/category pages without price metadata, reports skipped broken product URLs, and normalizes EUR price plus stock text from product pages.
- 2026-07-02T11:36+02:00 — Signal Sounds availability metadata can be stale: Melotus Versio EU reported `og:availability=instock`, then the runtime widget rendered "Sorry, this item is out of stock". The local crawler now extracts SKU (`NSEE70` in the observed case), calls Randem Retail location inventory, and overrides availability using the storefront-specific warehouse quantity.
- 2026-07-02T11:43+02:00 — Review approved the Signal Sounds availability fix with no findings. A real-page local crawl against Melotus Versio EU returned `availability: out_of_stock`, `signalSoundsStoreExternalId: SS Europe`, and `signalSoundsInventoryQuantity: 0`; writing corrected snapshots to Supabase remains an explicit approval gate.
- 2026-07-02T11:40+02:00 — User approved and received one curated SchneidersLaden import for module `4524` (`ADDAC812VU`): product URL `https://schneidersladen.de/en/addac-systems-812v-led-voltage-meter`, `139.00 EUR`, initially marked `in_stock`, source `scraper`. This was not a broad Schneiders import.
- 2026-07-02T11:43+02:00 — User caught that the SchneidersLaden ADDAC812VU page is actually archived. The parser now scans availability by priority rather than first text position, so `Product is archived` / `Sorry folks` beats earlier generic `in stock` text. A corrected latest snapshot was appended with `availability = discontinued`.
- 2026-07-02T14:13+02:00 — User flagged panel variants for AJH Synth Finaliser R-EQ (`4263`): Silver is in stock while Black is preorder. The parser now records panel variants, the importer prefers the best available equal-score panel variant, and the latest `4263` snapshot records Silver as selected plus Black as an alternate in `rawMeta`.
- 2026-07-02T14:30+02:00 — Broader SchneidersLaden preview seed imported 501 deduped listing/snapshot rows from a 1500-product local crawl. The import surfaced a real schema constraint interaction: the same product URL can strongly match multiple modules, so importer output now deduplicates by normalized product URL after per-module selection and records alternate module candidates in snapshot metadata.
- 2026-07-02T14:30+02:00 — Module detail Store prices moved from below the secondary `Search on` area to directly under the primary module card. Availability pills now include colored status dots so full-screen desktop browsing can scan current stock state quickly.
- 2026-07-02T15:07+02:00 — User caught SchneidersLaden Nibbler (`4831`) as a false preorder. The actual page has `schema.org/InStock`, a green delivery block, and an enabled Add to cart button; the parser had matched `preorder` from a manufacturer link in the description. Shopware availability now prefers structured/buy-widget in-stock signals over descriptive preorder text, and a corrected latest snapshot marks Black in stock with Silver recorded as an in-stock alternate.
- 2026-07-02T15:09+02:00 — User granted autonomy to fully crawl the currently approved Signal Sounds EU and SchneidersLaden sources and correct stale DB data. The crawler now applies Randem inventory in batches rather than per product, accepts `storeName` as fallback for EU rows missing `storeExternalId`, treats shippable positive Randem rows as available, and marks missing authoritative Signal stock as `unknown`.
- 2026-07-02T15:09+02:00 — Full imports appended 1339 Signal EU snapshots and 1841 SchneidersLaden snapshots after skipping normalized-URL conflicts already linked to other modules. Finaliser R-EQ (`4263`) and Nibbler (`4831`) now show both stores in stock, while ADDAC812VU (`4524`) remains SchneidersLaden `discontinued`.
- 2026-07-02T18:25+02:00 — Elevator Sound official-domain crawl/import completed. `www.elevatorsound.com` returned 2887 normalized WooCommerce Store API products over 29 pages; after filtering with `--include-ignored-matches=false`, matcher output contained 1927 candidates, 1708 strong candidates, and 1077 accepted deduped import rows. The import upserted 1077 active Elevator Sound listings and appended 1077 snapshots without schema, RLS/policy/GRANT, Edge Function, Cron, push, or release changes.
- 2026-07-02T18:25+02:00 — Elevator Sound crawl inspection found condition/order/accessory pages (`B-Stock`, `Ex-Demo`, `pre-order`, `accessory`) that otherwise scored as strong exact matches, plus Tiptop 909-family false positives from shared numeric compact-code aliases. The matcher now detects hyphen/space noise terms and only uses bare compact-code aliases when the code contains letters, preserving `ADDAC812VU`-style matching while blocking shared numeric suffixes.
- 2026-07-02T18:29+02:00 — Runtime snapshot of `/modules/details/4263` confirms Elevator Sound renders in Store prices with `£380.00`, `Available now`, and `United Kingdom`, alongside four other store rows for comparison.
