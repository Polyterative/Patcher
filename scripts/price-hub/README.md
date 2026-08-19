# Price Hub local store adapter guide

This is the local-first workflow for adding a Price Hub store to the approved crawler/import set. Keep it local until the store has a clean smoke crawl, reviewed matches, and an explicit live-import approval path.

## 1. Choose the smallest safe adapter

Add the store to `store-configs.ts` only after checking that the source is an allowed public feed/API and that `baseUrl` is HTTPS. The approved config shape is:

- `slug`: kebab-case value added to `ApprovedPriceHubStoreSlug`.
- `name`: display name.
- `baseUrl`: canonical HTTPS store origin.
- `adapter`: `woocommerce_store_api`, `shopify_product_json`, `bigcommerce_metadata`, `shopware_metadata`, or `custom`.
- `catalogPath` when the default path is too broad or wrong: Shopify defaults to `/products.json`; custom metadata defaults to `/sitemap.xml`.
- `currencyHint` when the feed does not reliably expose currency.
- `productUrlPathIncludes` / `productUrlPathExcludes` for custom sitemap/HTML catalog filtering.
- `ignoredMatchNoiseTags` only when a store uses a tag as valid availability metadata, not product identity noise; Found Sound's `preorder` tag is the current example.
- `productBrandHint` only for first-party/direct stores whose product titles omit the manufacturer. This becomes explicit `rawMeta.brand` evidence for matching; do not use it as a broad guess.

Adapter preference:

1. `woocommerce_store_api` for reachable `/wp-json/wc/store/v1/products` catalogs.
2. `shopify_product_json` for Shopify `/products.json` or a narrower collection JSON.
3. `bigcommerce_metadata` or `shopware_metadata` when sitemap product pages expose usable metadata.
4. `custom` only when a sitemap or catalog page needs include/exclude filtering plus generic product metadata parsing.
5. Defer stores blocked by robots, Cloudflare/429, invalid TLS, bot responses, or no stable public feed/API.

## 2. Smoke crawl before matching

Use bounded crawls first so you can inspect source quality without writing data:

```sh
pnpm price-hub:crawl-local --store=<slug> --max-products=25 --out=tmp/price-hub
```

Review `tmp/price-hub/<slug>/products.json` for usable `productName`, `productUrl`, `priceAmountMinor`, `currency`, `availability`, and compact diagnostics in `rawMeta`. For custom sitemap stores, also watch the console for skipped metadata pages and discovered URL counts.

If the bounded crawl looks clean, run a larger dry crawl with module input to generate candidates:

```sh
PRICE_HUB_ENV_FILE=/path/to/local.env pnpm price-hub:crawl-local --store=<slug> --max-products=250 --modules=modules.json --out=tmp/price-hub
```

`--modules` must be a JSON array with `id`, `name`, and manufacturer fields. If you do not pass it to `refresh-local`, the script can fetch approved modules from Supabase using a read key from `.env`, `.env.local`, or `PRICE_HUB_ENV_FILE`.

## 3. Review matching noise

Open `matches.json` and check accepted `strong_candidate` rows before any import. Look for false positives from:

- used/open-box/consignment/ex-demo/B-stock pages;
- preorder/deposit/special-order pages that are not valid current-new-stock rows;
- accessories, cases, covers, stackcables, power adapters, manuals, guides, stickers, apparel, pedals;
- DIY/parts hazards such as PCB, panel sets, kitbags, potentiometers, sliders, Bourns parts;
- generic module names (`filter`, `mixer`, `vca`, `quad`, etc.) matching by accident.

Shared match thresholds and noise terms live in `store-configs.ts`. Prefer adding source-specific metadata to the store config first (`catalogPath`, URL include/exclude filters, `ignoredMatchNoiseTags`, `matchConfig`, or `productBrandHint`) before broadening global noise. Preorder is a valid availability state, so suppress it only when it is product identity noise for that store.

## 4. Dry-run the import path

Use `refresh-local` for the normal crawl + sanity checks + import planning path:

```sh
PRICE_HUB_ENV_FILE=/path/to/local.env pnpm price-hub:refresh-local --store=<slug> --dry-run --max-products=250 --out=tmp/price-hub
```

Dry-run should show non-zero products, match candidates, and import rows. It can also report how many missing active listings would be deactivated when a Supabase read key is available.

A standalone import dry-run is useful only when you already have reviewed files:

```sh
PRICE_HUB_ENV_FILE=/path/to/local.env pnpm price-hub:import-local --store=<slug> --products=tmp/price-hub/<slug>/products.json --matches=tmp/price-hub/<slug>/matches.json --dry-run
```

## 5. Live import gates

Do not live-import with broad or partial evidence. Live writes must use service-role/admin credentials and must never print or commit secrets.

- Put local credentials outside this checkout when possible and pass `PRICE_HUB_ENV_FILE=/path/to/local.env`.
- Live `refresh-local` and `import-local` default to `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_KEY`; anon/authenticated JWT keys are rejected for writes.
- Prefer `refresh-local` for live writes because it performs crawl sanity checks before importing.
- Broad `--store=all` imports fail closed when a crawl hits `--max-products`, max pages, or max sitemap files. Skipped metadata product pages are import warnings only; missing-listing deactivation protects skipped URLs before marking other unseen active listings stale.
- Explicit single-store bounded imports are allowed only with a warning; use them for small approved checkpoints, not final full-catalog activation.
- Disappearance deactivation runs only with full-catalog evidence: no `--max-products`, no explicit bounds, at least 25 observed product URLs, and at least 5 accepted import rows. Partial/bounded/low-coverage crawls skip deactivation. Standalone `import-local` requires `--full-catalog` before it can deactivate missing active listings.

After a live write, check summary counts and spot-check the UI/read path. If active listings are missing price/currency, duplicate product URLs, or obvious noise terms, stop and fix the crawler/matcher before expanding.

## 6. Store registry details

The database `stores` row needs `adapter_kind`, `base_url`, `currency_hint`, and a real shipping-origin `country_code`. Shipping origin means physical dispatch point, not sales region; do not use generic `EU` as a country. Verify official store/contact/shipping copy before adding the row. Keep currencies as ISO 4217 codes, and remember zero-decimal currencies still need currency-aware minor-unit handling before broader rollout.

## 7. Snapshot storage semantics (change-only writes)

`module_price_snapshots` stores **floating-endpoint segments**, not one row per crawl:

- A new row is inserted only when the observed `(price_amount_minor, currency, availability)` differs from the listing's latest snapshot, or when the listing has no snapshot yet.
- When the observation is unchanged, the importer instead bumps the latest row's `observed_at` in place (the "floating endpoint") and touches `module_store_listings.last_checked_at`. A stable price run is therefore exactly two rows: the segment start and its fresh endpoint.
- `raw_meta` is kept only on `module_store_listings.last_raw_meta` (latest evidence per listing); snapshot rows carry `raw_meta = '{}'` and new inserts must keep it empty.
- Readers must not assume regular sampling: history is sparse by design. `getModuleSparsePriceHistorySummary` handles collapsed segments; an aged-out segment start (> 60 d) with a fresh endpoint is the accepted trend-chip-loss case for long-stable single-listing modules.

The one-off 2026-08 backfill that converted historical data to this shape (archive → relocate `raw_meta` → collapse runs → strip → `VACUUM FULL`, 372,795 → 47,504 rows, DB 394 → 84 MB) is documented in `internaldocs/workflow/plans/price-hub-snapshot-compaction.md` (runbook + decision log). The pre-backfill `raw_meta` archive lives locally at `tmp/price-hub-raw-meta-archive-2026-08-19.jsonl` (gitignored); `archive-snapshot-raw-meta.ts` is the reusable exporter.

## 8. Approval boundaries

This guide covers local scripts and reviewed imports only. Do not deploy Edge Functions, enable Supabase Cron, change RLS/policies/grants, release, push, or switch production branches without explicit approval recorded in the active plan.
