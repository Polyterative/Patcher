<!-- Section: PRODUCT — Tier 1 / Experimental infrastructure pilot -->

#### MEDIUM: Price Hub — Experimental Store Snapshot Pilot

**Status:** MVP persistence/display checkpoint active. The additive schema has been applied remotely; corrected SchneidersLaden ADDAC812VU / Finaliser R-EQ / Nibbler snapshots plus Signal Sounds EU, SchneidersLaden, New Groove, Elevator Sound, Control, Found Sound, Rubadub, Detroit Modular, Nightlife Electronics, Clockface Modular, Moog Audio, Noisebug, Post Modular, Pusherman Productions, Thonk, After Later Audio, Patch Point, ALM / Busy Circuits, Instruo, WMD, Michigan Synth Works, RobotSpeak, Cicada Sound, Intellijel, Schlappi Engineering, Zlob Modular, Soundium, Nano Modules, and Dreadbox crawl imports are visible on module detail. Signal Sounds lazy stock detection, batched Randem inventory, shippable-location fallback, SchneidersLaden archived-page detection, Shopware structured-stock detection, Shopware panel-variant diagnostics, same-product match deduplication, memory-safe full-catalog matching, compact module-code matching, New Groove used/preorder/no-price cleanup, Elevator Sound B-stock/ex-demo/preorder/accessory filtering, Shopify used/consignment/preorder/accessory/status noise filtering, explicit Shopify discontinued-state handling, vendor-backed Shopify exact-title matching, direct-store brand hints, DIY/parts/apparel/pedal noise filtering, implausible price filtering, generic custom sitemap/product-metadata crawling, JSON-LD offer parsing, explicit shipping-origin labels, and module-detail status-dot/filter/order/search-fallback display have been fixed in the local crawler/importer/UI. Control uses the official Brooklyn/US Shopify storefront. Elevator Sound uses the official UK `.com` WooCommerce store after the previous `.eu` target failed DNS. Synthshop now uses Shopify `products.json`; Exploding Shed, Milk Audio Store, Machineroom, and Escape From Noise have smoke-tested custom sitemap/product-metadata crawlers but no remote imports yet. Thomann, Perfect Circuit, and Patchwerks remain deferred because no stable crawler-friendly public feed was found, requests were blocked/rate-limited, TLS was invalid, or bot responses were returned. No RLS/policy/GRANT change, Edge Function deploy, cron job, push, or release has been approved.

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
| Control | `shopify_product_json` | Official `www.ctrl-mod.com/products.json` returns Shopify product JSON with price, variant availability, vendor, handle, product type, tags, images, and SKU. Official about/shipping pages identify Control as a Brooklyn, New York brick-and-mortar/online store with New York pickup, so shipping origin is `US`, currency `USD`. The catalog includes used/consignment, pre-order, accessory, case, and panel hazards that must remain strong noise signals. | 2 — imported |
| Found Sound | `shopify_product_json` | Official Shopify `/collections/eurorack/products.json` returns AUD price, variant availability, vendor, numeric handle, product type, tags, images, and SKU. Official shipping policy lists in-store pickup at 110 Albert Street, Brunswick East, Victoria 3057 and worldwide shipping, so shipping origin is `AU`. The broader all-products JSON is condition-heavy and rate-limited; the Eurorack collection is the safer source. Found Sound marks many brand-new Eurorack rows as preorder, so preorder is preserved as availability rather than treated as match noise for this store. | 2 — imported |
| Rubadub | `shopify_product_json` | Official Shopify `/collections/eurorack/products.json` returns GBP price, variant availability, vendor, handle, product type, tags, images, and SKU for the Glasgow/UK retailer. Condition/order/accessory hazards are filtered through shared Shopify noise rules. | 2 — imported |
| Detroit Modular | `shopify_product_json` | Official Shopify `/collections/eurorack-modules/products.json` returns USD prices from the Detroit/US retailer. The guessed `/collections/eurorack/products.json` handle was empty; `eurorack-modules` is verified. Explicit `DISCONTINUED` titles normalize to `discontinued` instead of generic out of stock. | 2 — imported |
| Nightlife Electronics | `shopify_product_json` | Official Shopify `/collections/modular/products.json` returns CAD prices from the Canadian retailer. The narrower `/collections/eurorack/products.json` was valid but only yielded 67 products / 25 accepted rows, so `modular` is the better preview source. | 2 — imported |
| Clockface Modular | `shopify_product_json` | Official Shopify `/products.json` returns JPY prices from the Japan retailer. No simple Eurorack/module collection handle was exposed during quick collection probing, so the broad feed is filtered by the matcher. JPY values remain stored in display-compatible minor units because current UI formatting divides `price_amount_minor` by 100. | 2 — imported |
| Moog Audio | `shopify_product_json` | Official Shopify `/collections/modules/products.json` returns CAD prices from the Canadian retailer. The guessed `/collections/eurorack/products.json` handle was empty; `modules` is verified. Open-box, special-order, and no-longer-available statuses remain filtered or normalized before import. | 2 — imported |
| Noisebug | `shopify_product_json` | Official Shopify `/products.json` returns USD prices and availability from the US retailer. Full-catalog import is viable after shared Shopify/current-stock noise filtering. | 2 — imported |
| Post Modular | `woocommerce_store_api` | Official WooCommerce Store API returns GBP prices from the UK retailer. Importable coverage is sparse but clean after strong-match filtering. | 2 — imported |
| Pusherman Productions | `shopify_product_json` | Official Shopify `/products.json` returns GBP prices, but the catalog is DIY/parts-heavy. Only built/assembled strong rows are imported after variant-title and parts/potentiometer/panel-set/PCB noise filtering. | 2 — imported |
| Thonk | `woocommerce_store_api` | Official WooCommerce Store API returns GBP prices, but the catalog is DIY/kit-heavy. Only assembled module rows are imported after PCB/kitbag/parts/panel hazards are filtered; no-price source rows are skipped. | 2 — imported |
| After Later Audio | `shopify_product_json` | Official Shopify `/products.json` returns USD direct-store prices. Product titles often omit the manufacturer because the whole store is first-party, so Shopify `vendor` metadata is now trusted as manufacturer support for exact-title matching. | 2 — imported |
| Patch Point | `shopify_product_json` | Official Shopify `/products.json` returns EUR prices from the Berlin/Germany store. The broader catalog includes non-Eurorack and vintage items, but strong-match filtering keeps a small clean module subset. | 2 — imported |
| ALM / Busy Circuits | `shopify_product_json` | Official Shopify `/products.json` returns GBP direct-store prices. Titles use ALM product names and Shopify vendor `ALM`, so the crawler adds a direct-store `ALM Busy Circuits` brand hint for matcher support. Apparel, slipmat, pedal, and placeholder-price hazards are filtered before import. | 2 — imported |
| Instruo | `woocommerce_store_api` | Official WooCommerce Store API returns GBP direct-store prices from Instruo. Product names omit the manufacturer, so the crawler adds a direct-store `Instruo` brand hint for matcher support. | 2 — imported |
| WMD | `shopify_product_json` | Official Shopify `/products.json` returns USD direct-store prices. Product type/tags include modules plus apparel, accessories, and pedals; pedal/apparel/accessory hazards are excluded before import. | 2 — imported |
| Michigan Synth Works | `shopify_product_json` | Official Shopify `/products.json` returns USD direct-store prices for Michigan Synth Works and related module products. Strong-match filtering keeps a small price-bearing subset. | 2 — imported |
| RobotSpeak | `shopify_product_json` | Official Shopify `/products.json` returns USD prices from the San Francisco/US retailer. Broad-catalog matching stays behind shared used/accessory/order noise filtering and accepted 142 price-bearing rows. | 2 — imported |
| Cicada Sound | `shopify_product_json` | Official Shopify `/products.json` returns CAD prices from the Canadian retailer. Used/condition-heavy rows are filtered by shared Shopify noise rules; accepted import coverage is substantially stronger than the first-page used sample suggested. | 2 — imported |
| Intellijel | `woocommerce_store_api` | Official WooCommerce Store API returns USD direct-store prices from Intellijel. Product names often omit the manufacturer, so the crawler adds an `Intellijel` brand hint; B-stock/apparel/accessory rows remain filtered before import. | 2 — imported |
| Schlappi Engineering | `shopify_product_json` | Official Shopify `/products.json` returns USD direct-store prices. The direct-store `Schlappi Engineering` brand hint supports exact-title matching while keeping the small catalog easy to QA. | 2 — imported |
| Zlob Modular | `woocommerce_store_api` | Official WooCommerce Store API returns USD direct-store prices. The direct-store `Zlob Modular` brand hint supports matching, but strict no-price/implausible-price filtering means only one clean current module row was imported. | 2 — imported |
| Soundium | `shopify_product_json` | Official Shopify `/products.json` returns EUR prices from the Lithuania retailer. The broad catalog is synth-focused rather than Eurorack-focused, so only four strict price-bearing module/semi-modular rows were imported. | 2 — imported |
| Nano Modules | `woocommerce_store_api` | Official WooCommerce Store API returns EUR direct-store prices from Spain. Product names omit the manufacturer, so the crawler adds a direct-store `Nano Modules` brand hint and imports only strong price-bearing module rows. | 2 — imported |
| Dreadbox | `woocommerce_store_api` | Official WooCommerce Store API returns EUR direct-store prices from Greece. The crawler adds a direct-store `Dreadbox` brand hint and imports only strong price-bearing module/semi-modular rows. | 2 — imported |
| Synthshop | `shopify_product_json` | Official Shopify `products.json` works again from the local crawler with NOK prices. Smoke crawl wrote 250 normalized products in one page and match smoke found strong module candidates. | 2 — crawler supported |
| Exploding Shed | `custom` sitemap/product metadata | Official sitemap exposes product URLs such as `/befaco-bf-22/100133`; product pages expose usable product metadata with EUR prices and availability. Smoke crawl wrote 5 normalized products from 1281 discovered URLs. | 2 — crawler supported, not imported |
| Milk Audio Store | `custom` sitemap/product metadata + JSON-LD | Product sitemap index exposes localized `/it/shop/` product URLs. Product pages rely on JSON-LD offers for price/currency, so the generic metadata parser now reads JSON-LD. Used URL variants are excluded. Smoke crawl wrote 5 normalized products from 4366 discovered URLs. | 2 — crawler supported, not imported |
| Machineroom | `custom` sitemap/product metadata | WordPress sitemap index exposes `/product/` URLs; product pages expose `product:price:*` metadata with EUR prices. Smoke crawl wrote 5 normalized products from 529 discovered URLs. | 2 — crawler supported, not imported |
| Escape From Noise | `custom` sitemap/product metadata | Abicart sitemap exposes `/en/modular/` product URLs; product pages expose `product:price:*`, schema availability, and IDs. Generic metadata fetches require the crawler user-agent. Smoke crawl wrote 5 normalized products from 1134 discovered URLs. | 2 — crawler supported, not imported |

### Defer initially

| Store | Reason to defer |
|---|---|
| Perfect Circuit | Fetch returned Cloudflare/403 during sampling. A seemingly accessible `media/sitemap_en.xml` probe returned a JPEG/bot response, not XML. Needs permission/API/affiliate route before automated checks. |
| Thomann | Probed again 2026-07-03: `robots.txt` disallows `/intl/`, search/catalog requests hit Cloudflare/429, sitemap fetches were challenged/rate-limited, and no stable public price/availability feed was found without browser automation. Important store, but defer until an allowed feed/API is available. |
| Music All In | Shopify `products.json` is reachable but rate-limited during the full crawl before stable output could be written; defer until a slower/backoff-friendly crawl is implemented. |
| Sonic Sales | WooCommerce Store API is reachable, but the full crawl produced zero safe module matches with the current matcher. |
| Modular Synth Lab | WooCommerce Store API is reachable, but the catalog is mostly parts/accessories/power/case hardware and produced zero importable price-bearing module rows. |
| Patchwerks | Public `patchwerks.com` / `www.patchwerks.com` TLS certificate is expired from curl/Node's trust path, `products.json` returns 404 when certificate verification is bypassed, and `patchwerks.myshopify.com/products.json` returns 401. Defer until TLS/API access is fixed. |
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
pnpm price-hub:crawl-local --store=found-sound --modules=path/to/modules.json --include-ignored-matches=false
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
- `control`: 3930 normalized Shopify products from `www.ctrl-mod.com/products.json` over 16 pages, 658 match candidates after full-catalog filtering, 630 strong candidates, 524 accepted import rows after deduplication, 524 upserted active listings, and 524 appended snapshots. Latest accepted availability distribution: 88 `in_stock` and 436 `out_of_stock`.
- `found-sound`: 2737 normalized Shopify products from the official Found Sound Eurorack collection over 11 pages, 1749 match candidates after full-catalog filtering, and 1100 accepted import rows after deduplication. A remote `stores` row was upserted, then the existing import-local path upserted 1100 active listings and appended 1100 snapshots. Latest accepted availability distribution: 39 `in_stock`, 1026 `preorder`, and 35 `out_of_stock`.
- `rubadub`: 837 normalized Shopify Eurorack collection products over 4 pages, 638 match candidates, and 454 accepted import rows. The import upserted 454 active listings and appended 454 snapshots. Latest accepted distribution: 224 `in_stock` and 230 `out_of_stock`.
- `detroit-modular`: 2348 normalized Shopify Eurorack Modules collection products over 10 pages, 2048 match candidates, and 1337 accepted import rows. The import upserted 1337 active listings and appended 1337 snapshots. Latest accepted distribution: 820 `in_stock`, 503 `out_of_stock`, and 14 `discontinued`.
- `nightlife-electronics`: 2115 normalized Shopify Modular collection products over 9 pages, 1770 match candidates, and 1141 accepted import rows. The import upserted 1141 active listings and appended 1141 snapshots. Latest accepted distribution: 1056 `in_stock` and 85 `out_of_stock`.
- `clockface-modular`: 1385 normalized Shopify products over 6 pages, 1135 match candidates, and 758 accepted import rows. The import upserted 758 active listings and appended 758 snapshots. Latest accepted distribution: 406 `in_stock` and 352 `out_of_stock`.
- `moog-audio`: 2428 normalized Shopify Modules collection products over 10 pages, 633 match candidates, and 421 accepted import rows. The import upserted 421 active listings and appended 421 snapshots. Latest accepted distribution: 420 `in_stock` and 1 `out_of_stock`.
- `noisebug`: 1297 normalized Shopify products over 6 pages, 784 match candidates after full-catalog filtering, and 504 accepted import rows. The import upserted 504 active listings and appended 504 snapshots. Latest accepted distribution: 362 `in_stock`, 138 `out_of_stock`, and 4 `discontinued`.
- `postmodular`: 1012 normalized WooCommerce Store API products over 11 pages, 26 match candidates after full-catalog filtering, and 14 accepted import rows. The import upserted 14 active listings and appended 14 snapshots. Latest accepted distribution: 7 `in_stock` and 7 `out_of_stock`.
- `pusherman-productions`: 375 normalized Shopify products over 2 pages, 2 match candidates after DIY/parts filtering, and 2 accepted import rows. Latest accepted distribution: 2 `in_stock`.
- `thonk`: 1365 normalized WooCommerce Store API products over 14 pages, 8 match candidates after DIY/parts filtering, and 3 accepted import rows. The first pass exposed a null-price assembled row; the importer now skips no-price products and the corrected latest Thonk rows all have GBP prices. Latest accepted distribution: 2 `in_stock` and 1 `out_of_stock`.
- `after-later-audio`: 124 normalized Shopify products over 1 page, 129 match candidates after vendor-backed exact-title matching, and 72 accepted import rows. Latest accepted distribution: 69 `in_stock` and 3 `out_of_stock`.
- `patch-point`: 241 normalized Shopify products over 1 page, 20 match candidates, and 15 accepted import rows. Latest accepted distribution: 8 `in_stock` and 7 `out_of_stock`.
- `busy-circuits`: 140 normalized Shopify products over 1 page, 57 match candidates after direct-store brand hints and noise filtering, and 37 accepted import rows. Latest accepted distribution: 36 `in_stock` and 1 `out_of_stock`.
- `instruo`: 40 normalized WooCommerce Store API products over 1 page, 41 match candidates after direct-store brand hints, and 35 accepted import rows. Latest accepted distribution: 31 `in_stock` and 4 `out_of_stock`.
- `wmdevices`: 89 normalized Shopify products over 1 page, 43 match candidates after apparel/accessory/pedal filtering, and 33 active accepted import rows after deactivating a WMD Geiger Counter pedal row. Latest accepted distribution: 27 `in_stock` and 6 `out_of_stock`.
- `michigan-synth-works`: 127 normalized Shopify products over 1 page, 36 match candidates, and 20 accepted import rows. Latest accepted distribution: 14 `in_stock` and 6 `out_of_stock`.
- Current latest coverage after the imports and no-price cleanup: 1368 Signal EU listings, 1872 SchneidersLaden listings, 699 New Groove active priced listings, 1077 Elevator Sound listings, 524 Control listings, 1100 Found Sound listings, 454 Rubadub listings, 1337 Detroit Modular listings, 1141 Nightlife Electronics listings, 758 Clockface Modular listings, 421 Moog Audio listings, 504 Noisebug listings, 14 Post Modular listings, 2 Pusherman Productions listings, 3 Thonk listings, 72 After Later Audio listings, 15 Patch Point listings, 37 ALM / Busy Circuits listings, 35 Instruo listings, 33 WMD listings, 20 Michigan Synth Works listings, and 12,860 active listings across 3,125 modules and 22 stores.
- Deep QA after the five-store follow-up: zero active listings without snapshots, zero active latest snapshots without price/currency, zero active duplicate store/product URLs, and zero suspect active rows in the new five stores for `pcb`, `kitbag`, `panel set`, `parts`, `potentiometer`, `used`, `pre-owned`, `open box`, `consignment`, `power adapter`, `stackcable`, `cover`, `manual`, or `guide`.
- A broader QA pass found 253 pre-existing New Groove active listings whose latest snapshots had `price_amount_minor = null`; these were deactivated because Price Hub active listings should represent price-bearing data. Future local imports skip source rows lacking usable price/currency.
- Corrected examples:
  - Finaliser R-EQ (`4263`) is `in_stock` at both Signal EU and SchneidersLaden.
  - ADDAC812VU (`4524`) remains `discontinued` at SchneidersLaden after compact module-code matching recovers the `ADDAC812VU` -> `812V` product match.
  - Nibbler (`4831`) is `in_stock` at both stores; Signal EU uses shippable Randem `HQ` quantity while preserving EU/HQ location diagnostics.
  - Make Noise 0-Coast (`4106`) no longer keeps the New Groove no-price row active; priced active rows remain from Clockface Modular, Control, Elevator Sound, Moog Audio, Nightlife Electronics, Rubadub, SchneidersLaden, Signal Sounds EU, and Signal Sounds UK.
  - Make Noise 0-CTRL (`2810`) has four active imported store listings: Signal Sounds EU, Signal Sounds UK, SchneidersLaden, and New Groove.
  - Finaliser R-EQ (`4263`) now has five visible store rows; Elevator Sound reports `£380.00`, `in_stock`, and `United Kingdom`.
  - Control overlap examples include `/modules/details/2096` (`AA.1`, `129.00 USD`, out of stock), `/modules/details/2810` (`0-CTRL`, `399.00 USD`, out of stock), `/modules/details/4106` (`0-Coast`, `499.00 USD`, out of stock), `/modules/details/4831` (`Nibbler`, `240.00 USD`, out of stock), and `/modules/details/7372` (`ASQ-1`, `399.00 USD`, in stock).
  - Found Sound overlap examples include `/modules/details/1109` (`∑42`, `279.00 AUD`, preorder), `/modules/details/1788` (`100 Grit`, `499.00 AUD`, preorder), `/modules/details/3545` (`1983`, `379.00 AUD`, preorder), `/modules/details/3778` (`[1]f`, `169.00 AUD`, preorder), `/modules/details/4831` (`Nibbler`, `439.00 AUD`, preorder), and `/modules/details/7372` (`ASQ-1`, `609.00 AUD`, preorder). `/modules/details/2810` intentionally has no Found Sound row because the matching product was only a `0-CTRL Power Adapter`.
  - Good Elevator Sound overlap routes for UI comparison include `/modules/details/101`, `/modules/details/116`, `/modules/details/169`, `/modules/details/171`, `/modules/details/249`, `/modules/details/2810`, `/modules/details/4106`, `/modules/details/4263`, `/modules/details/4831`, and `/modules/details/8142`.

Shipping-origin rule:

- Store location badges are shipping origins, not sales regions. Do not show generic `EU`/region labels as if they were a physical dispatch point.
- Official Signal Sounds EU copy says the EU store delivers from its warehouse in Poland, so `signal-sounds-eu.country_code = PL`.
- Official Elevator Sound contact details place the active store in Bristol, United Kingdom; the crawler target is `elevator-sound` at `www.elevatorsound.com`, with `country_code = GB` and `currency_hint = GBP`.
- Official Control about/shipping pages identify Control as a synthesizer brick-and-mortar and online store in Brooklyn, New York, with New York local pickup; use `country_code = US` and `currency_hint = USD`.
- Official Found Sound shipping policy identifies Found Sound as a brick-and-mortar store with pickup at 110 Albert Street, Brunswick East, Victoria 3057, plus worldwide shipping; use `country_code = AU` and `currency_hint = AUD`.
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
- Shopify catalogs can hide import hazards in raw metadata rather than just titles/slugs. Control keeps `tags` and `productType` in `rawMeta`, and the matcher includes those fields when applying noise terms such as `used`, `consignment`, `pre-order`, `preorder`, `accessory`, `case`, and `panel`.
- Found Sound also uses Shopify JSON, but its official Eurorack collection marks many brand-new module rows as preorder while still being valid upcoming stock. The normalizer can suppress configured tags such as Found Sound's `preorder` from match-noise text while preserving `availability = preorder`; used/consignment rows, covers, stackcables, and `power adapter` accessories remain excluded from accepted imports.
- First-party/direct Shopify stores can omit the manufacturer from product titles because every product is their own brand. For exact title matches, Shopify `rawMeta.vendor`/brand/manufacturer metadata can provide manufacturer support; this keeps After Later Audio importable while still letting noise terms suppress panels, parts, and accessories.
- Some first-party/direct stores expose too little brand metadata or use abbreviations, such as ALM / Busy Circuits and Instruo. Store configs can add `productBrandHint`; the crawler stores that as compact `rawMeta.brand` so matcher support is explicit and source-specific rather than guessed globally.
- DIY-heavy stores require variant-title noise as well as title/slug/tag noise. Pusherman and Thonk imports exclude PCB, panel set, kitbag, parts, potentiometer, slide pot, slider, and Bourns hazards before rows can become active.
- Active imported listings should have usable prices. Local imports now skip source rows whose selected product lacks `priceAmountMinor` or `currency`, has a non-positive/too-low accessory-like price, or has an absurd placeholder price; historical snapshots can remain append-only, but such listings should not stay active.

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
- [x] Seed Control preview data from a full Shopify product JSON crawl after excluding used/consignment/preorder/accessory/panel hazards.
- [x] Seed Found Sound preview data from its official Shopify Eurorack collection after excluding used/consignment/accessory hazards while preserving preorder availability.
- [x] Seed Rubadub preview data from its official Shopify Eurorack collection after excluding condition/accessory/order hazards.
- [x] Seed Detroit Modular preview data from its official Shopify Eurorack Modules collection after preserving discontinued state.
- [x] Seed Nightlife Electronics preview data from its official Shopify Modular collection after verifying the narrower Eurorack collection was too sparse.
- [x] Seed Clockface Modular preview data from its official Shopify product JSON feed with JPY values kept display-compatible.
- [x] Seed Moog Audio preview data from its official Shopify Modules collection after excluding open-box/special-order/no-longer-available hazards.
- [x] Seed Noisebug preview data from its official Shopify product JSON feed after final QA.
- [x] Seed Post Modular preview data from its official WooCommerce Store API after final QA.
- [x] Seed Pusherman Productions preview data from its official Shopify product JSON feed after excluding DIY/parts hazards.
- [x] Seed Thonk preview data from its official WooCommerce Store API after excluding DIY/parts/no-price hazards.
- [x] Seed After Later Audio direct-store data from its official Shopify product JSON feed using vendor-backed exact-title matching.
- [x] Probe Thomann and defer until an allowed crawler-friendly feed/API is available.
- [x] Seed Patch Point preview data from its official Shopify product JSON feed after final QA.
- [x] Seed ALM / Busy Circuits preview data from its official Shopify product JSON feed using direct-store brand hints.
- [x] Seed Instruo preview data from its official WooCommerce Store API using direct-store brand hints.
- [x] Seed WMD preview data from its official Shopify product JSON feed after excluding apparel/accessory/pedal hazards.
- [x] Seed Michigan Synth Works preview data from its official Shopify product JSON feed after final QA.

### Structural — reusable adapter spine

- [x] Add Shopify product JSON adapter.
- [x] Add Signal Sounds BigCommerce metadata adapter.
- [x] Add SchneidersLaden Shopware metadata adapter.
- [ ] Add store/listing health states and admin-only diagnostics.
- [ ] Add stale-data policy and snapshot retention rule.
- [x] Add read methods through `SupabaseService` for current listing summaries.
- [ ] Add docs for adding a new store adapter (per-store crawl/import walkthrough + noise-term guidance).
- [ ] Move worker adapter dispatch into `snapshot-store-listings` (`switch(store.adapter_kind)`) so Shopify, BigCommerce, and Shopware listings can eventually refresh via cron; reuse `_shared/price-hub/*` normalizers instead of duplicating parsing. Alternatively, if the local importer stays canonical indefinitely, rename the function to `snapshot-woocommerce-listings` and stop implying it's the universal snapshotter in the plan. *(added 2026-07-03)*
- [ ] Reconcile local importer `next_check_at = now()` with the worker's daily/backoff schedule so turning cron on doesn't produce a 13k-row backlog against a 20/day cap. Stagger `next_check_at` across the next day/week using a hash of `listing_id`, or use `LEAST(last_checked_at + interval '1 day', now())` in the worker's due filter. *(added 2026-07-03)*
- [ ] Add snapshot retention/compaction (daily-for-30d + weekly-for-1y, or "keep only changed snapshots + weekly checkpoints") before broader rollout. Move stable per-listing diagnostics (`priceHubAlternateMatchedModules`, `signalSoundsInventoryLocations`, etc.) from `module_price_snapshots.raw_meta` to `module_store_listings` so snapshots stay skinny. *(added 2026-07-03)*
- [ ] Move `NOISE_TERMS` and the magic 0.86 / 0.72 score thresholds in `matcher.ts` to per-store configuration in `store-configs.ts`. Preorder is a legitimate availability state — penalise it only when it appears in title/handle, not when it appears as a tag. *(added 2026-07-03)*
- [ ] Split `scripts/price-hub/catalog-crawler.ts` (currently 880 lines, approaching the 1000-line layering error) into per-adapter modules (`crawlers/woo.ts`, `crawlers/shopify.ts`, `crawlers/bigcommerce.ts`, `crawlers/shopware.ts`), and split I/O from pure logic in `import-local-snapshots.ts` (currently 745 lines, layering warning). *(added 2026-07-03)*

### MVP hardening — post-review 2026-07-03

Additive to the pilot; do not require broader UX changes. Correctness and safety first, then structural gaps.

- [ ] **P0 (blocked on user approval):** Enable RLS on `stores`, `module_store_listings`, and `module_price_snapshots`; revoke INSERT/UPDATE/DELETE/TRUNCATE from `anon` and `authenticated`; keep `service_role` writes; add a permissive `for select using (true)` policy so public read paths keep working. Pair with `SET search_path = public` on `tg_price_hub_set_updated_at` to clear the `function_search_path_mutable` advisor warning.
- [ ] Extend the FX map (`AUD`, `CAD`, `JPY` at minimum, plus any future store currency) in both `module-price-listings-card.utils.ts` and `module-price-summary.utils.ts`; then consolidate the two duplicates into one shared module labelled as an estimate only.
- [ ] Make Shopify/BigCommerce/Shopware `parseDecimalPriceMinor` currency-aware so zero-decimal currencies (JPY, KRW, HUF, ISK, VND, CLP) are stored as true minor units. Backfill the 758 existing Clockface Modular rows in one migration; drop the frontend `/100` cancellation once storage is correct.
- [ ] Add a stale/freshness rule to the module detail Store prices card: badge or hide rows whose `last_checked_at` is older than a documented threshold (start with 14 days) and surface "Last seen" instead of a current price. Match the plan's stated Trust rules and wire `cacheBust(['priceHub'])` from the importer so the frontend cache invalidates after a fresh import.
- [ ] After every completed full-catalog crawl, mark previously-active listings whose product URL is no longer present as `active = false` (with a "not-seen-since" reason), gated by minimum pages/products so a partial crawl cannot wipe a store.

### Polish — user-visible Price Hub seed

- [x] Ask for UX placement approval for module detail "Available at stores" block.
- [x] Render current verified listings on module detail.
- [ ] Keep `Search on` chips for unverified/untracked stores. **Prioritized 2026-07-03:** the current UI hides these stores entirely once at least one verified listing exists, which regresses the previous search-only surface.
- [x] Add clear freshness/source labels.
- [x] Place Store prices directly under the module card and add colored availability status dots.
- [x] Add Store prices filtering/ordering controls with lowest-known-price default.
- [ ] Add sparse price history only after enough snapshots exist. **Prioritized 2026-07-03:** 24,323 snapshots already collected across 22+ stores; a 30-day sparkline per listing is now high-signal.
- [ ] Add a "report wrong product" affordance per row that writes to a new `module_store_listing_flags` table so the matcher can improve from real user signal.
- [ ] Extend `STORE_HERO_COLORS` to every seeded store (currently only 5 of 27 have a color; the rest render the default grey), or derive a stable color from the store slug hash.

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
| Shopify catalogs include condition/product-type hazards | Preserve Shopify tags/product type in raw metadata and apply noise filtering across title, handle, tags, and product type before full-catalog import. |
| Shopify catalog fetches are rate-limited differently by client | Use the local curl-backed fetch helper for Shopify JSON; urllib was rate-limited on Rubadub while curl retrieved the same public endpoint successfully. |
| Shopify status tags are availability, not product identity | Normalize explicit discontinued/no-longer-available text to `discontinued`, and filter open-box/special-order/opening-soon hazards before broad imports unless a store-specific rule says otherwise. |
| Active rows have no usable price | Treat no-price source rows as non-importable for active Price Hub listings; keep historical snapshots append-only but deactivate existing active no-price listings during QA. |
| Manufacturer/direct stores omit brand names from titles | Use explicit per-store `productBrandHint` only for known first-party sources; do not globally assume titles without brands are safe. |
| Public catalog blocks/rate-limits crawling | Defer stores like Thomann when available paths hit robots/Cloudflare/429 restrictions and no stable public feed/API exists. |
| Legal/ToS issue | Check robots/ToS before enabling each store; prefer public APIs/affiliate feeds; attribute and link source. |
| Stale data damages trust | Always show checked time; hide/degrade stale rows. |
| Snapshot table grows forever | Add retention/compaction before expanding beyond pilot. |
| Production backend risk | Additive schema only; no RLS/policy changes without explicit approval; run advisors after schema drafts. |
| Schema-only tables have RLS disabled | Accepted only for this checkpoint because the user explicitly selected no RLS/policies yet; revisit before broader write surfaces or non-public data. |
| Anon key currently has full DML on Price Hub tables (RLS off + default `public.*` grants) | **Escalated 2026-07-03:** UI is now public with real data (13,391 active listings, 24,323 snapshots). Anyone with the anon key can INSERT/UPDATE/DELETE/TRUNCATE `stores`, `module_store_listings`, `module_price_snapshots`. Fix requires explicit user approval to enable RLS, revoke DML from anon/authenticated, keep service_role writes, and add a permissive public read policy. Tracked in the approval queue. |
| Worker adapter dispatch does not match imported adapter mix | The `snapshot-store-listings` Edge Function currently filters `stores.adapter_kind = 'woocommerce_store_api'`, but ~72% of active listings are Shopify / BigCommerce / Shopware. Even if cron were enabled, non-WooCommerce rows would never refresh. Either extend the worker to dispatch by `adapter_kind` using the shared `_shared/price-hub/*` normalizers, or continue treating the local importer as the canonical refresh path and rename/scope the worker accordingly. |
| Zero-decimal currencies stored 100× too large | Shopify Clockface Modular (JPY) rows are stored as `price_amount_minor` = major × 100, which happens to display correctly only because the frontend also divides by 100. Any downstream consumer (analytics, currency conversion, admin dashboard) will read JPY (and future KRW/HUF/ISK/VND/CLP) at 100× the real price. Fix by making `parseDecimalPriceMinor` currency-aware and backfilling the 758 Clockface rows. |
| Non-EUR/USD/GBP/CHF listings silently dropped from sorting and market-price rollup | `CURRENCY_TO_EUR_RATE` in `module-price-listings-card.utils.ts` and `module-price-summary.utils.ts` omits AUD/CAD/JPY, so ~2,700 listings (Found Sound AUD, Moog/Nightlife/Cicada CAD, Clockface JPY) render a price cell but are treated as "unpriced" for sort ordering, "cheapest known", "best now", and recent-market-price weighting. Fix by extending the FX map and consolidating the two duplicates into one shared module. |
| Stale/freshness policy documented but not enforced on read | `getModulePriceListings` returns all `active` rows regardless of `verification_status` or `last_checked_at` age, and the card only shows `Checked X ago`. Since nothing refreshes automatically today, every row will drift toward stale without any UI signal. Add a stale-threshold badge (e.g. `> 14 days`) and hide-current-price behavior for stale rows. |
| Product disappearance from store catalog is invisible | The importer only deactivates rows whose current snapshot is priceless or absurd. If a full catalog crawl no longer contains a previously-imported product URL, the row stays `active` and `verified` forever. Fix by comparing imported product URLs to `active` listings after a completed full-catalog crawl and marking the diff `active = false` (gated by "the crawl actually covered the catalog"). |

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

- **Approval requested 2026-07-03T00:00+02:00 (P0):** May the next checkpoint enable RLS on `stores`, `module_store_listings`, and `module_price_snapshots`, revoke INSERT/UPDATE/DELETE/TRUNCATE from `anon` and `authenticated` (keeping `service_role` writes for the importer), add a `for select using (true)` policy so public read paths keep working, and `SET search_path = public` on `tg_price_hub_set_updated_at`? Rationale: the pilot is now public-facing with 13,391 active listings and 24,323 snapshots; without RLS anyone with the anon key can wipe or forge the entire Price Hub dataset. Default if not approved: keep the current no-RLS posture and hold every subsequent Price Hub checkpoint until this gate resolves.
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
- 2026-07-02T18:53+02:00 — Control was selected as the next easiest store based on live probes. `www.ctrl-mod.com/products.json` is a straightforward Shopify catalog; Found Sound also has Shopify JSON but its first sample and product taxonomy are heavily used/condition oriented; Synthshop `products.json` failed TLS handshakes from this environment. Control official pages identify the store as Brooklyn, New York / US.
- 2026-07-02T18:53+02:00 — Added `shopify_product_json` local-crawler support and Control normalization. The normalizer records USD prices from decimal Shopify variant prices, product URL from handle, availability from variants unless pre-order tags/titles are present, image URL, vendor, product type, tags, selected variant ID/title/SKU, and available variant IDs.
- 2026-07-02T18:53+02:00 — Control full crawl/import completed without schema/RLS/policy/GRANT/deploy/Cron/push/release changes. `products.json` returned 3930 normalized products over 16 pages; matcher output contained 658 candidates and 630 strong candidates; importer accepted 524 deduped rows, upserted 524 active listings, and appended 524 snapshots. Latest accepted distribution is 88 `in_stock` and 436 `out_of_stock`.
- 2026-07-02T19:17+02:00 — Found Sound was selected after Control based on live probes. `https://foundsound.com.au/products.json` works but is broad, condition-heavy, and rate-limited; the official `https://foundsound.com.au/collections/eurorack/products.json` surface is narrower and returned 2737 normalized Eurorack products over 11 pages. Synthshop remained blocked by TLS/connection failures from this environment.
- 2026-07-02T19:17+02:00 — Official Found Sound shipping policy says the store is a brick-and-mortar shop with pickup at 110 Albert Street, Brunswick East, Victoria 3057 and worldwide shipping, so the remote/local store row uses `country_code = AU`, `currency_hint = AUD`, and adapter `shopify_product_json`.
- 2026-07-02T19:17+02:00 — Found Sound full crawl/import completed without schema/RLS/policy/GRANT/deploy/Cron/push/release changes. The matcher output contained 1749 candidates; importer accepted 1100 deduped strong rows after excluding used/consignment/accessory hazards, upserted 1100 active listings, and appended 1100 snapshots through the existing import-local path. Latest accepted distribution is 39 `in_stock`, 1026 `preorder`, and 35 `out_of_stock`.
- 2026-07-02T19:17+02:00 — Found Sound hazard handling differs from Control: Found Sound uses the configured `preorder` tag as match-noise suppression only, so valid upcoming-stock rows stay importable while preserving `availability = preorder`. Used/consignment rows, covers, stackcables, and `power adapter` accessories still fall below importable status.
- 2026-07-02T19:49+02:00 — Elevator Sound back-order correction: module `2100` exposed that WooCommerce can report `is_in_stock: true` while `stock_availability.text` says `Available on back-order`. The parser now treats `backorder`, `back-order`, and `back order` in stock status/text/class as `backorder` before considering in-stock flags.
- 2026-07-02T19:49+02:00 — After the parser fix, the Elevator catalog recrawl normalized `https://www.elevatorsound.com/product/intellijel-multi-fx-1u/` as `backorder`; 539 latest Elevator snapshots with back-order evidence were corrected by appending new `backorder` snapshots. Runtime `/modules/details/2100` now shows Elevator Sound as `Backorder`.
- 2026-07-02T19:54+02:00 — Superseded during follow-up QA: availability classification preserves explicit Shopify preorder tags even when those tags are ignored for match-noise scoring. Do not convert Found Sound preorder catalog entries into available-now rows solely because a selected Shopify variant is available.
- 2026-07-02T21:38+02:00 — Added five more official Shopify-backed stores to the local crawler/import path and database registry without UI, schema, RLS/policy/GRANT, deploy, Cron, push, or release changes: Rubadub (`GB`/`GBP`), Detroit Modular (`US`/`USD`), Nightlife Electronics (`CA`/`CAD`), Clockface Modular (`JP`/`JPY`), and Moog Audio (`CA`/`CAD`).
- 2026-07-02T21:38+02:00 — Store discovery choices: Rubadub uses `/collections/eurorack/products.json`; Detroit Modular uses `/collections/eurorack-modules/products.json` because `/collections/eurorack/products.json` was empty; Nightlife Electronics uses `/collections/modular/products.json` because the narrower Eurorack collection only produced 25 accepted rows; Clockface Modular uses broad `/products.json` because no simple module collection handle was exposed; Moog Audio uses `/collections/modules/products.json` because the guessed Eurorack collection was empty.
- 2026-07-02T21:38+02:00 — Imported append-only snapshots/listings for the five stores after dry-runs: Rubadub 454, Detroit Modular 1337, Nightlife Electronics 1141, Clockface Modular 758, and Moog Audio 421. Current active coverage is 12,378 active imported store listings across 3,058 distinct modules.
- 2026-07-02T21:38+02:00 — Shopify crawler reliability and correctness fixes from the five-store run: use curl for Shopify JSON fetches because urllib hit 429s where curl succeeded, make Shopify catalog path/currency/noise config store-specific, expand matcher noise for open-box/special-order/opening-soon/no-longer-available hazards, and normalize Shopify discontinued/no-longer-available text to explicit `discontinued` availability.
- 2026-07-03T10:55+02:00 — User asked for five more store crawlers/imports and explicitly prioritized correct database data over UI. Added RobotSpeak, Cicada Sound, Intellijel, Schlappi Engineering, and Zlob Modular to the approved local crawler list and remote store registry without UI, schema, RLS/policy/GRANT, deploy, Cron, push, or release changes.
- 2026-07-03T10:55+02:00 — Imported append-only snapshots/listings for the five stores after one-by-one crawls and dry-runs: RobotSpeak 142, Cicada Sound 293, Intellijel 85, Schlappi Engineering 10, and Zlob Modular 1. Active Price Hub coverage is now 13,391 active listings across 3,170 distinct modules and 27 active stores.
- 2026-07-03T10:55+02:00 — Database QA after the five-store run found zero active missing latest snapshots, zero active latest rows without price/currency, and zero active duplicate store/product URLs for the new stores. Zlob remains intentionally sparse because the importer rejects low/no-price direct-store rows unless they are clean price-bearing module observations.
- 2026-07-03T11:11+02:00 — User clarified that the next follow-up should be more centered in Europe. Mainland retailer probing found Soundium as a stable Shopify-backed Lithuania retailer, while Music All In rate-limited before stable output, Sonic Sales produced zero safe module matches, Modular Synth Lab produced zero importable rows from a parts-heavy WooCommerce catalog, and multiple larger mainland shops returned 403/404/empty/non-crawler-friendly responses.
- 2026-07-03T11:11+02:00 — Imported append-only snapshots/listings for three clean mainland-Europe feeds after dry-runs: Soundium 4, Nano Modules 14, and Dreadbox 9. Database QA found zero active missing latest snapshots, zero active latest rows without price/currency, and zero active duplicate product URLs for the three stores. Active Price Hub coverage is now 13,418 active listings across 3,170 distinct modules and 30 active stores.
- 2026-07-03T12:00+02:00 — Deep technical review of the Price Hub feature completed (docs-only, no code changes). Live Supabase inspection confirmed the three Price Hub tables have RLS disabled with `anon`+`authenticated` holding full DML — escalated as the P0 approval item. Correctness gaps identified: (a) `CURRENCY_TO_EUR_RATE` in `module-price-listings-card.utils.ts` and its duplicate in `module-price-summary.utils.ts` omit AUD/CAD/JPY, silently dropping ~2,700 listings from price sort and market-price rollup; (b) `parseDecimalPriceMinor` is not currency-aware, so JPY (and future KRW/HUF/ISK/VND/CLP) rows are stored 100× too large and only render correctly because the frontend also divides by 100; (c) no stale-threshold enforcement on read even though Trust rules document one; (d) products removed from a store's catalog stay `active` forever; (e) the `snapshot-store-listings` Edge Function is hardcoded to `adapter_kind = 'woocommerce_store_api'` so ~72% of current listings would never refresh if cron were enabled; (f) local importer sets `next_check_at = now()` for every row, which would produce a 13k-row backlog against the worker's 20/day cap; (g) `cacheBust(['priceHub'])` is wired for but never called; (h) `catalog-crawler.ts` (880 lines) is near the 1000-line layering error and `import-local-snapshots.ts` (745 lines) is already past the 500-line warning. Integrated as MVP hardening + extended Structural + prioritized Polish checklists, plus new Risks rows and the P0 approval-queue entry above. No code was touched.
- 2026-07-03T12:52+02:00 — Audited the remaining right-column retailer fallbacks after Store prices/search integration. Added Synthshop through Shopify `products.json` (`NOK`), and added a generic `custom` recursive sitemap/product-metadata crawler for Exploding Shed, Milk Audio Store, Machineroom, and Escape From Noise. The generic path reuses product metadata tags, adds JSON-LD offer parsing for Milk Audio, sends the crawler user-agent for metadata pages, and supports store-level URL include/exclude filters. Smoke crawls wrote normalized products for all five; match smoke found candidates for Synthshop, Escape From Noise, Milk Audio Store, and Exploding Shed. Machineroom produced normalized products in the 25-product smoke but no early candidates, so it needs broader QA before import. Perfect Circuit remains blocked by Cloudflare/bot responses, Thomann by robots/Cloudflare/429/no stable feed, and Patchwerks by expired TLS plus no accessible Shopify JSON endpoint.
