# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut). Future agents read this to avoid relitigating settled questions.

---

## Active

Price Hub — Experimental Store Snapshot Pilot

Plan: [price-hub-experimental-store-snapshot-pilot.md](./plans/price-hub-experimental-store-snapshot-pilot.md)
Status: **MVP persistence/display checkpoint completed; local crawler/import expansion active. The additive Price Hub schema is applied remotely without RLS/policy/GRANT changes, supported stores are registered, Signal Sounds EU, SchneidersLaden, New Groove, and Elevator Sound have full local-crawl imports visible as append-only snapshots, and key examples (`4263`, `4524`, `4831`, `4106`, `2810`) now show corrected latest availability/listings. Module detail renders Store prices directly under the module card with availability status dots, designer-aligned filter/order controls, lowest-price default ordering, relative freshness labels, and explicit shipping-origin country labels. Elevator Sound uses its official UK `.com` WooCommerce store after the previous `.eu` target failed DNS. The local crawler remains local-first; Edge Function deploy, Supabase Cron, RLS/policy/GRANT changes, push, and release remain unapproved.**
Staged: 2026-07-01T11:47+02:00

#### Why this is next

- The user explicitly requested beginning the loop on the Price Hub experimental store snapshot pilot.
- The MVP has safe local-only work available before the remote migration/RLS/deploy/cron/UI approval gates.

#### Safety gate

- Before any schema / migration / RPC work, read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight.
- Local additive migration drafts are approved by the 2026-07-01 loop prompt.
- Remote schema-only application is approved and completed for Price Hub pilot tables.
- Do not change RLS/policies/GRANTs, deploy Edge Functions, create Supabase Cron jobs, run non-approved broad automated imports, switch branches, release, or push.
- Keep the next work local-first unless the user approves another explicit gate.

#### Layer checklist

- [x] Select Price Hub plan for this loop by explicit user request.
- [x] Read the plan and schema-change preflight.
- [x] Draft additive local migration for `stores`, `module_store_listings`, and `module_price_snapshots`.
- [x] Add safe TypeScript/backend wiring for local MVP preparation.
- [x] Create `snapshot-store-listings` Edge Function shape with WooCommerce Store API adapter only.
- [x] Add parser normalization tests and fixtures.
- [x] Extract local-only snapshot worker helper logic for Node-testable limit parsing, auth, WooCommerce URL building, failure backoff/stale state, and error clipping.
- [x] Add local-only `mode=probe` request parsing for the Edge Function so WooCommerce adapter work can be validated without Supabase env, client creation, or database reads/writes.
- [x] Add local-only catalog crawler + matcher scripts for approved WooCommerce pilot stores, writing JSON under `tmp/price-hub`.
- [x] Normalize zero WooCommerce module prices as unknown/suspicious instead of valid `0.00 EUR` prices.
- [x] Add local-only Signal Sounds BigCommerce sitemap/product-metadata crawler for UK and EU store variants.
- [x] Add local-only SchneidersLaden Shopware sitemap/product-metadata crawler.
- [x] Apply additive Price Hub schema remotely without RLS/policy/GRANT changes.
- [x] Import initial curated Signal Sounds UK/EU snapshots for Melotus Versio and Shuttle Control.
- [x] Add Supabase latest-price listing read path bounded to one latest snapshot per listing.
- [x] Add module detail Store prices card with store, price, availability, freshness, outbound link, and shipping/country code.
- [x] Fix Signal Sounds lazy availability detection in the local crawler by preferring the Randem store-location inventory API over stale BigCommerce `og:availability`.
- [x] Seed a SchneidersLaden preview dataset from a 1500-product local crawl: 501 deduped listings/snapshots imported, with latest availability distribution of 238 `in_stock`, 40 `out_of_stock`, 22 `preorder`, and 202 `discontinued`.
- [x] Move the Store prices card directly under the module card on module detail and add availability status dots.
- [x] Recrawl Signal Sounds EU and SchneidersLaden completely, then import corrected append-only snapshots.
- [x] Add Store prices filter/order controls, default lowest-price ordering, and relative freshness labels.
- [x] Expand the approved local-crawl/import path to New Groove and correct Italian used/preorder false positives before keeping the data active.
- [x] Replace generic store-region display with specific shipping-origin labels from official store evidence.
- [x] Import Elevator Sound from its official UK WooCommerce Store API after excluding B-stock, ex-demo, preorder, accessory, and shared numeric-code false positives.
- [x] Delegate review, validate, and stop before remote migration/RLS/deploy/cron/UI gates.

#### Approval queue

- **Approval recorded 2026-07-01T11:47+02:00:** User approved safe local docs, local migration drafts, local function code, parser tests, and frontend/backend code preparation for the Price Hub MVP.
- **Approval requested 2026-07-01T12:03+02:00:** May the next checkpoint apply `supabase/migrations/20260701115059_add_price_hub_pilot_tables.sql` to the remote Supabase project so the pilot tables and two store registry rows exist? This does not include RLS/policy/GRANT changes, Edge Function deployment, Cron creation, user-visible UI, or guessed `module_store_listings` rows. Default if not approved: keep the pilot local-only.
- **Approval recorded 2026-07-02T10:42+02:00:** User approved moving from crawler output to database persistence and module-detail UI for crawled local prices.
- **Approval recorded 2026-07-02T10:46+02:00:** User selected schema-only remote application: apply schema, but do not add RLS/policies yet.
- **Approval recorded 2026-07-02T11:40+02:00:** User approved writing exactly one test SchneidersLaden price snapshot for module `4524` only.
- **Approval recorded 2026-07-02T14:30+02:00:** User approved applying a broader SchneidersLaden crawl dataset to the database for local/preview browsing.
- **Approval recorded 2026-07-02T15:55+02:00:** User granted autonomy to continue implementing additional importers/stores beyond Signal Sounds and SchneidersLaden, provided the work is tested and made correct before treating the store as working.
- **Not approved:** RLS/policy/GRANT changes, Edge Function deployment, Supabase Cron creation, push, and release.

#### Validation strategy

- Targeted parser tests for WooCommerce Store API normalization.
- Targeted snapshot worker helper tests for local-only runtime-adjacent logic.
- Docs gate: `node scripts/checks/check-docs.cjs` and `git diff --check`.
- Implementation checkpoint: targeted parser tests, then `pnpm lint` if local code changes are broader than docs.

#### Decision log

- 2026-07-01T11:47+02:00 — User requested beginning the loop on the Price Hub experimental store snapshot pilot, MVP only.
- 2026-07-01T11:47+02:00 — Local-only approval is limited to docs, migration draft, Edge Function code, parser tests, and safe TypeScript/backend preparation. Remote migration/RLS/deploy/cron/UI gates remain blocked pending explicit confirmation.
- 2026-07-01T11:50+02:00 — Drafted local-only Price Hub schema, table-name registration, WooCommerce Store API snapshot worker shape, and parser fixtures/tests. `module_store_listings` seed rows were intentionally omitted because they require real module IDs and canonical product URLs.
- 2026-07-01T11:50+02:00 — Review findings addressed: WooCommerce fetches now have a per-request timeout, search result normalization no longer guesses the first product when URL/slug matching fails, and the worker fails closed if `PRICE_HUB_SNAPSHOT_TOKEN` is not configured.
- 2026-07-01T12:03+02:00 — Created verified checkpoint commit `3918cf03` for the local MVP preparation and stopped at the remote migration approval gate.
- 2026-07-01T13:16+02:00 — Continued local-only refinement without migrations/deploys: extracted pure snapshot worker helpers for Node tests, added worker helper coverage, and kept the existing remote migration/RLS/deploy/cron/UI approval gate unchanged.
- 2026-07-01T13:16+02:00 — Created verified checkpoint commit `e5998b2d` for the local-only worker helper refinement. The next step remains blocked on remote migration approval.
- 2026-07-01T14:27+02:00 — User approved a no-database proof-of-concept probe to see whether the Edge Function does meaningful WooCommerce Store API work. Probe mode remains local-only and still requires the fail-closed bearer token, but must not read Supabase env vars, create a Supabase client, read/write tables, deploy, cron, migrate, or add UI.
- 2026-07-01T14:27+02:00 — Review flagged arbitrary probe hosts as an SSRF risk; probe fetch targets are now restricted to HTTPS on the approved WooCommerce pilot hosts only.
- 2026-07-01T14:27+02:00 — Created verified checkpoint commit `2a04f353` for the no-database probe mode. The next step remains blocked on explicit deploy/push approval; remote migrations, RLS/policy/GRANT changes, Cron, and UI remain unapproved.
- 2026-07-02T09:38+02:00 — Added a local-only crawler/matcher MVP for approved WooCommerce stores (`elevator-sound`, `new-groove`). It writes `products.json` and optional `matches.json` to `tmp/price-hub/<storeSlug>/`, does not verify matches, and keeps all remote Supabase/deploy/Cron/UI gates closed.
- 2026-07-02T09:38+02:00 — Review flagged zero-score generic module rows as a `matches.json` explosion risk; matcher now drops zero-score candidates and keeps ignored rows only when there was real positive signal.
- 2026-07-02T09:38+02:00 — Created verified checkpoint commit `e7e3bd1b` for the local catalog crawler/matcher. The next step remains local analysis of crawler output or explicit approval for any remote/Supabase/UI work.
- 2026-07-02T10:04+02:00 — Live New Groove inspection found real module products where the WooCommerce Store API returns `price`, `regular_price`, and `sale_price` as `0`; some product responses also expose empty `price_html`. The parser now normalizes those rows to `priceAmountMinor: null` plus compact metadata such as `rawMeta.priceWasZero: true` so the crawler reports suspicious missing prices instead of impossible free modules.
- 2026-07-02T10:17+02:00 — Added Signal Sounds as two local-only BigCommerce metadata stores: `signal-sounds-uk` uses `signalsounds.com`/GBP, and `signal-sounds-eu` uses `signalsounds.eu`/EUR. The crawler reads product sitemap URLs, then product-page metadata (`product:price:*`, `og:*`) so the two storefronts can retain distinct prices and availability.
- 2026-07-02T10:33+02:00 — Added SchneidersLaden as a local-only Shopware metadata store. The crawler follows the allowed sitemap index to its gzipped URL set, skips category/non-product pages without price metadata, reports broken product URLs skipped during the crawl, and normalizes EUR price plus stock text from product pages.
- 2026-07-02T11:15+02:00 — Applied the additive Price Hub pilot schema remotely with no RLS/policy/GRANT changes, regenerated backend types, and manually preserved known local typegen corrections for `user_module_acquisitions` and defaulted `public_id` insert fields.
- 2026-07-02T11:15+02:00 — Imported four curated Signal Sounds snapshots: Melotus Versio and Shuttle Control across UK/GBP and EU/EUR storefronts. Snapshot rows are append-only, while `module_store_listings` keeps the current canonical product URL per module/store.
- 2026-07-02T11:15+02:00 — Added module-detail Store prices UI near Search on. The read path uses a bounded embedded Supabase query with `module_price_snapshots.limit=1`, so the UI fetches the latest snapshot only and does not pull historical price rows.
- 2026-07-02T11:15+02:00 — Supabase inspection confirmed the new Price Hub tables currently have RLS disabled, matching the user-approved schema-only gate. This is acceptable for this checkpoint but must be revisited before any broader write surface or sensitive data is added.
- 2026-07-02T11:36+02:00 — Signal Sounds EU can render native BigCommerce metadata as `instock` and then lazily replace it with a third-party stock widget showing out of stock. The local crawler now extracts the product SKU and queries Randem Retail's public location inventory API with the Signal Sounds application id, selecting `SS Europe` for `signal-sounds-eu` and `HQ` for `signal-sounds-uk`; this inventory result overrides stale `og:availability` and is recorded in compact `rawMeta`.
- 2026-07-02T11:43+02:00 — Review approved the Signal Sounds availability fix with no findings. Validation covered Price Hub parser/local crawler/import tests, lint, build, and a real-page local crawl proving Melotus Versio EU now normalizes to `out_of_stock` from Randem quantity `0`.
- 2026-07-02T11:40+02:00 — User clarified that crawled SchneidersLaden results should be visible when imported. Wrote one approved curated listing/snapshot only: module `4524` (`ADDAC812VU`) → SchneidersLaden `ADDAC - 812V LED Voltage Meter`, `139.00 EUR`, initially marked `in_stock`; broad Schneiders imports remain unapproved.
- 2026-07-02T11:43+02:00 — User caught that SchneidersLaden's ADDAC812VU page is archived and unavailable. Fixed the Shopware metadata parser to prioritize terminal unavailable page text (`Product is archived`, `Sorry folks`, sold/out-of-stock messages) over earlier generic `in stock` text, and appended a corrected latest snapshot for module `4524` with `availability = discontinued`.
- 2026-07-02T14:13+02:00 — User flagged panel variants after importing AJH Synth Finaliser R-EQ (`4263`): SchneidersLaden has Silver in stock and Black in preorder/unavailable for immediate purchase. Parser now records `rawMeta.panelVariant`, importer chooses the best available variant when a module/store has multiple equal-score panel variants, and selected snapshots record `priceHubVariantAmbiguity`, `priceHubPanelVariants`, and alternate matched products for diagnostics. The latest `4263` snapshot points to Silver in stock and records Black as preorder.
- 2026-07-02T14:30+02:00 — User asked to execute the broader strategy autonomously so preview/local browsing shows crawled availability. A SchneidersLaden crawl over 1500 normalized products found 501 importable deduped listing/snapshot rows after removing same-URL multi-module conflicts; 46 selected rows now record `priceHubProductMatchAmbiguity` with alternate modules in `rawMeta`.
- 2026-07-02T14:30+02:00 — Imported the 501 SchneidersLaden preview rows via Supabase CLI Management API because no local service-role key was present. No schema, RLS, policy, GRANT, Edge Function, Cron, push, or release changes were made.
- 2026-07-02T15:07+02:00 — User caught SchneidersLaden Nibbler (`4831`) showing preorder while both Black and Silver pages are actually buyable. The Shopware parser now treats structured product availability (`schema.org/InStock`), `delivery-available` text, or an enabled `Add to cart` buy button as authoritative over stray `preorder` words in product descriptions/external links, while archived/out-of-stock terminal text still wins. A corrected latest snapshot was appended for `4831` with Black selected `in_stock` and Silver recorded as an in-stock alternate panel variant.
- 2026-07-02T15:09+02:00 — User granted autonomy to fully crawl the currently approved Signal Sounds EU and SchneidersLaden sources and correct stale DB data. The original per-product Randem approach hit rate limits on full catalogs, so the local crawler now applies Signal Sounds availability in batch after product-page normalization. Signal metadata is fail-closed: products without authoritative Randem rows become `unknown` rather than trusting stale `og:availability`.
- 2026-07-02T15:09+02:00 — Full-catalog imports appended 1339 Signal Sounds EU snapshots and 1841 SchneidersLaden snapshots after skipping normalized-URL conflicts already linked to other modules. Current latest listing coverage for these two stores is 1368 Signal EU listings and 1872 SchneidersLaden listings, covering 2288 distinct modules.
- 2026-07-02T15:09+02:00 — Corrected key examples: Finaliser R-EQ (`4263`) is in stock at both stores, ADDAC812VU (`4524`) remains discontinued at SchneidersLaden, and Nibbler (`4831`) is in stock at both stores. Signal EU now treats shippable Randem inventory from alternate locations as available when the EU page itself shows buyable stock.
- 2026-07-02T15:42+02:00 — Store prices UI now supports Show/Order controls with default lowest-known-price ordering, keeps filtered-empty states inside the card, and uses app-standard relative freshness labels (`Checked X ago`) instead of absolute dates.
- 2026-07-02T16:10+02:00 — Elevator Sound EU was selected as the simplest next WooCommerce adapter target, but both `www.elevatorsound.eu` and `elevatorsound.eu` failed DNS resolution during crawler/probe attempts. Manual official-site verification found `www.elevatorsound.com` is the reachable WooCommerce Store API endpoint and lists Elevator Sound at 74 Stokes Croft, Bristol, UK, so the store target was corrected to `elevator-sound`, `GB`, `GBP`.
- 2026-07-02T16:22+02:00 — New Groove full crawl/import is active: 5887 WooCommerce Store API products produced 1580 strong non-suspicious matches and 942 accepted import rows after deduplication. The importer appended corrected latest snapshots, deactivated three previously active used/preorder listing URLs, and left 952 New Groove listings active.
- 2026-07-02T16:22+02:00 — New Groove uses the WooCommerce zero-price rule: some real rows, including Make Noise 0-Coast (`4106`), expose empty/zero API price fields, so snapshots preserve availability while storing price as unknown rather than `0.00 EUR`. Italian `usato`, `occasione`, `prenotazione`, and `preordine` terms are now strong noise signals and are excluded from full-catalog imports.
- 2026-07-02T17:39+02:00 — Store country badges now represent shipping origin, not a vague sales region. Official Signal Sounds EU copy says EU orders ship from the warehouse in Poland, so the remote `stores` row and local seed now use `PL` instead of `EU`; the UI renders the physical origin country name and treats any future generic `EU` code as `Shipping origin needs review`.
- 2026-07-02T18:25+02:00 — Elevator Sound full official-domain crawl imported successfully: `www.elevatorsound.com` WooCommerce Store API returned 2887 normalized products over 29 pages; after matcher fixes, the run produced 1927 match candidates, 1708 strong candidates, and 1077 accepted deduped rows. The import upserted 1077 active listings and appended 1077 snapshots for `elevator-sound`.
- 2026-07-02T18:25+02:00 — Elevator Sound exposed two matcher hazards before import: `[B-Stock]` / `[Ex-Demo]` / `pre-order` / `accessory` product variants still scored strongly, and compact-code aliases let Tiptop `BD909`/`CP909`/`HATS909` rows match an `SD909` page through the shared numeric suffix `909`. The matcher now detects hyphen/space noise terms and only uses bare compact code aliases when the code contains letters, preserving matches such as `ADDAC812VU` -> `812V` while blocking shared numeric suffixes.
- 2026-07-02T18:29+02:00 — Runtime snapshot `/modules/details/4263` shows Elevator Sound first in Store prices at `£380.00`, `Available now`, and `United Kingdom`, alongside Signal Sounds UK/EU, SchneidersLaden, and New Groove for comparison.
