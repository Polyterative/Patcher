<!-- Section: PRODUCT — Tier 1 / Price Hub expansion -->

#### HIGH: Price Hub — Store Source Expansion Crawl

**Status:** Completed 2026-07-03. Investigated additional direct retailer and marketplace sources for Price Hub coverage. The first safe local slice adds public no-login product-feed configs for Big City Music, Whimsical Raps, TechnoSynth, and Animato Audio; sitemap/search-only candidates are documented as deferred until page-parser QA.

**Why:** Price Hub is more useful when Patcher can compare availability and pricing across a broad set of modular retailers, not only the initial pilot stores.

**Final objective:** expand the approved Price Hub source registry and crawler coverage for additional stores where public, stable, policy-compatible product data can be collected without browser automation, credentials, or bypassing access controls.

---

## Scope

Investigate each target source below for a safe Price Hub integration path:

| Region | Source |
|---|---|
| Global | Modular Grid |
| Global | Reverb |
| USA | Analogue Haven |
| USA | Big City Music |
| USA | Chicago Synth Exchange |
| USA | Control Voltage |
| USA | MeMe Antenna |
| USA | Midwest Modular |
| USA | Mission Synths |
| USA | Modular 8 |
| USA | monome |
| USA | The Sound Parcel |
| USA | Perfect Circuit |
| USA | Prymaxe |
| USA | Sunset Synths |
| USA | Switched On |
| USA | Synth City |
| USA | Vintage King |
| USA | Whimsical Raps |
| Europe | Acapulco Modular |
| Europe | Analogue Zone |
| Europe | Blip |
| Europe | JAM |
| Europe | Loops & Bits |
| Europe | Martin Pas |
| Europe | Modular Square |
| Europe | Pyramid Sounds |
| Europe | Raw Voltage |
| Europe | Sound of You |
| Europe | The Synthesizer Network |
| Europe | Turnlab |
| United Kingdom | Blicken Synths |
| United Kingdom | Cymru Beats |
| United Kingdom | Juno |
| United Kingdom | London Modular |
| United Kingdom | matttech modular |
| Canada | Axe and You Shall Receive |
| Canada | Rhythmiqx |
| Canada | Technopolis |
| Canada | TechnoSynth |
| China | Animato Audio |
| Japan | Tokyo Tape Music Center |
| Australia | patchcable |
| Australia | Steep Street |
| New Zealand | Synthesizer NZ |
| Mexico | Holawave |

---

## Layers

### MVP — feasibility pass

- [x] Identify canonical domain, country, currency, and store platform for every target source.
- [x] Check public crawl affordances: `robots.txt`, sitemap, product JSON, WooCommerce Store API, Shopify `products.json`, BigCommerce/Shopware metadata, JSON-LD offers, or other static metadata.
- [x] Classify each source as `importable`, `crawler-supported but needs QA`, `search-link only`, `blocked`, or `not a direct retailer`.
- [x] Record exact blockers for non-importable sources, including status codes, bot/challenge pages, TLS failures, missing prices, missing availability, marketplace/API constraints, or non-retailer scope.

### Structural — crawler/config support

- [x] Add approved source configs for every source with a stable no-login product feed.
- [x] Reuse existing adapters before adding new adapter logic.
- [x] Add narrow collection/sitemap selectors where broad catalogs create used, accessory, DIY, or non-module noise.
- [x] Add source-specific matcher hints only when the catalog proves titles omit manufacturer names or use consistent aliases.
- [ ] Keep all schema/API changes additive and stop for explicit approval before any Supabase migration, RLS, policy, deploy, cron, or backend-breaking change.

### Polish — local QA and documentation

- [x] Run local smoke crawls for added sources and capture accepted/rejected row counts.
- [x] Add or update focused crawler tests for new adapter behavior or source-specific filtering.
- [x] Update the active Price Hub plan with the new source statuses and any deferred sources.
- [x] Leave search-link-only candidates documented separately from Price Hub tracked sources.

---

## File-level checklist

- [x] `scripts/price-hub/store-configs.ts` — add importable source configs.
- [x] `scripts/price-hub/catalog-crawler.ts` — reuse or extend adapter dispatch only when needed.
- [x] `supabase/functions/_shared/price-hub/*` — reused existing shared crawler helpers without adding new parser surfaces.
- [x] `scripts/tests/price-hub-local-crawler.test.mjs` — cover new parsing/filtering behavior.
- [x] `internaldocs/workflow/plans/price-hub-experimental-store-snapshot-pilot.md` — keep the broad target-source status matrix in this archived expansion plan rather than duplicating the full list into the active pilot.

---

## Acceptance criteria

- [x] Every target source has a documented status and evidence-backed reason.
- [x] Every safely crawlable source has either an approved config or a specific follow-up blocker.
- [x] No source is added if it requires login, credentialed APIs, bypassing bot protections, prohibited scraping, or browser automation.
- [x] Local smoke crawl output demonstrates that added sources produce normalized products and plausible module matches.
- [x] Targeted tests cover any new parser/filtering behavior.
- [x] No Supabase migration, RLS/policy, Edge Function deploy, cron job, push, or release is performed without explicit human approval.

---

## Validation strategy

- Run targeted local crawler smoke commands for each newly added source.
- Run the focused Price Hub crawler tests that cover changed parsing/filtering code.
- Run `pnpm lint` after code changes.
- Run `node scripts/checks/check-docs.cjs` after workflow-doc changes.

---

## Source status matrix

| Source | Domain | Country | Currency | Platform/feed | Status | Evidence / blocker |
|---|---|---:|---:|---|---|---|
| Modular Grid | modulargrid.net | Global | EUR | custom community database | not a direct retailer | Homepage and robots.txt are public, but products.json, WooCommerce Store API, and sitemap.xml return 404. Blocker: Community database, not a direct retailer with first-party sellable offers. |
| Reverb | reverb.com | Global | USD | marketplace | blocked | robots.txt is public, but homepage, products.json, WooCommerce Store API, and sitemap.xml returned 403. Blocker: Marketplace with access controls/API constraints; do not crawl without an approved API path. |
| Analogue Haven | analoguehaven.com | United States | USD | static catalog | crawler-supported but needs QA | robots.txt and sitemap.xml returned 200; products.json and WooCommerce Store API returned 404. Blocker: Sitemap/static pages need product-page QA for price and availability extraction before import. |
| Big City Music | bigcitymusic.com | United States | USD | Shopify `products.json` | importable | robots.txt identifies Shopify and products.json returned 200 with product JSON including module titles. |
| Chicago Synth Exchange | chicagosynth.exchange | United States | USD | unknown | search-link only | Likely domains did not resolve during public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| Control Voltage | controlvoltage.net | United States | USD | Lightspeed | crawler-supported but needs QA | Homepage and sitemap.xml returned 200; products.json and WooCommerce Store API returned 404. Blocker: Sitemap/page parser needs QA for embedded price and availability metadata. |
| MeMe Antenna | memeantenna.com | United States | USD | unknown | blocked | Homepage returned 403 and robots/products/sitemap probes returned 500. Blocker: Public metadata endpoints are unavailable from local probe. |
| Midwest Modular | midwestmodular.com | United States | USD | BigCommerce | crawler-supported but needs QA | Homepage and robots.txt returned 200 with BigCommerce patterns; no Shopify or WooCommerce feed detected. Blocker: BigCommerce sitemap/page support needs QA before tracked import. |
| Mission Synths | missionsynths.com | United States | USD | unknown | blocked | robots.txt returned `Disallow: /`; product feed probes returned 404. Blocker: Robots policy disallows crawling. |
| Modular 8 | modular8.com | United States | USD | WordPress | not a direct retailer | Homepage/title describe a performance space and pro-audio destination; sitemap lists posts/pages/portfolio rather than store product data. Blocker: No direct retailer product catalog found. |
| monome | monome.org | United States | USD | custom direct brand store | search-link only | Homepage returned 200 but robots.txt, products.json, WooCommerce Store API, and sitemap.xml returned 404. Blocker: Direct brand pages do not expose a stable catalog feed with prices/availability. |
| The Sound Parcel | thesoundparcel.co | United States | USD | Squarespace | crawler-supported but needs QA | robots.txt and sitemap.xml returned 200; products.json and WooCommerce Store API returned 404. Blocker: Squarespace sitemap/page parser needs QA for price and availability metadata. |
| Perfect Circuit | perfectcircuit.com | United States | USD | Shopify behind challenge | blocked | Homepage, robots.txt, products.json, WooCommerce Store API, and sitemap.xml returned 403 Cloudflare challenge HTML. Blocker: Bot-protection challenge; do not bypass. |
| Prymaxe | prymaxe.com | United States | USD | unknown | blocked | HTTPS fetches for homepage, robots.txt, products.json, WooCommerce Store API, and sitemap.xml failed from the local probe. Blocker: No stable public metadata endpoint found. |
| Sunset Synths | sunsetsynths.com | United States | USD | unknown | blocked | HTTPS fetches for homepage, robots.txt, products.json, WooCommerce Store API, and sitemap.xml failed from the local probe. Blocker: No stable public metadata endpoint found; canonical domain needs manual QA. |
| Switched On | switchedonaustin.com | United States | USD | Shopify | blocked | robots.txt returned 200 but Shopify storefront and products.json returned 402 `Unavailable Shop`. Blocker: Shopify storefront unavailable. |
| Synth City | reverb.com/shop/synth-city | United States | USD | marketplace shop | search-link only | The only verified public presence found was a Reverb shop; no independent direct-retailer feed was confirmed. Blocker: Marketplace shop is not a stable direct retailer product feed. |
| Vintage King | vintageking.com | United States | USD | Magento | crawler-supported but needs QA | Homepage, robots.txt, and sitemap.xml returned 200; products.json and WooCommerce Store API returned 404. Blocker: Magento sitemap/page parser needs QA and Eurorack filtering to avoid broad pro-audio noise. |
| Whimsical Raps | whimsicalraps.com | United States | USD | Shopify `products.json` | importable | robots.txt identifies Shopify and products.json returned 200 with product JSON. |
| Acapulco Modular | acapulcomodular.com | Spain | EUR | unknown | search-link only | Likely domain did not resolve during public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| Analogue Zone | analoguezone.com | Hungary | EUR | Shopify behind challenge | blocked | Homepage, robots.txt, products.json, WooCommerce Store API, and sitemap.xml returned 403 Cloudflare challenge HTML. Blocker: Bot-protection challenge; do not bypass. |
| Blip | blipshop.eu | Portugal | EUR | unknown | search-link only | Official domain could not be confidently verified with minimal public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| JAM | juno.co.uk | United Kingdom | GBP | retailer marketplace | blocked | Same probed domain as Juno returned 403 Cloudflare challenge HTML on homepage and metadata endpoints. Blocker: Canonical source appears ambiguous with Juno; bot-protection prevents safe crawl. |
| Loops & Bits | loopsandbits.com | Germany | EUR | unknown | search-link only | Likely domain did not resolve during public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| Martin Pas | martinpas.com | Netherlands | EUR | custom storefront | crawler-supported but needs QA | Homepage, robots.txt, and sitemap.xml returned 200; products.json and WooCommerce Store API returned 404. Blocker: Sitemap/page parser needs QA for product metadata and modular filtering. |
| Modular Square | modularsquare.com | France | EUR | Shopify behind challenge | blocked | Homepage, robots.txt, products.json, WooCommerce Store API, and sitemap.xml returned 403 Cloudflare challenge HTML. Blocker: Bot-protection challenge; do not bypass. |
| Pyramid Sounds | pyramidsounds.com | France | EUR | repurposed domain | not a direct retailer | Research pass found the homepage repurposed to non-synth content rather than a modular retailer. Blocker: Not a usable direct retailer catalog for Price Hub. |
| Raw Voltage | rawvoltage.wien | Austria | EUR | unknown | search-link only | Likely domains did not resolve or timed out during public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| Sound of You | signalsounds.eu | Europe | EUR | BigCommerce | crawler-supported but needs QA | soundofyou.eu Eurorack path redirects to signalsounds.eu; research found BigCommerce storefront metadata and robots patterns. Blocker: BigCommerce sitemap/page support needs QA before tracked import. |
| The Synthesizer Network | thesynthesizernetwork.com | Europe | EUR | unknown | search-link only | Likely domain did not resolve during public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| Turnlab | turnlab.be | Belgium | EUR | Lightspeed | crawler-supported but needs QA | Homepage, robots.txt, and sitemap.xml returned 200; products.json and WooCommerce Store API returned 404. Blocker: Lightspeed sitemap/page parser needs QA for price and availability metadata. |
| Blicken Synths | blickensynths.co.uk | United Kingdom | GBP | unknown | blocked | Homepage and metadata endpoints returned 403. Blocker: Public metadata endpoints are blocked from local probe. |
| Cymru Beats | cymrubeats.com | United Kingdom | GBP | unknown | search-link only | Likely domains did not resolve during public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| Juno | juno.co.uk | United Kingdom | GBP | custom retailer with product sitemaps | crawler-supported but needs QA | Research pass found robots.txt exposing product sitemap index and product XML files. Blocker: Product sitemap parser needs QA and modular-category narrowing. |
| London Modular | londonmodular.co.uk | United Kingdom | GBP | brochure site | not a direct retailer | Homepage is samples, enquiries, and Patreon links rather than a product catalog. Blocker: No direct retailer product catalog found. |
| matttech modular | matttechmodular.co.uk | United Kingdom | GBP | unknown | search-link only | Likely domain did not resolve during public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| Axe and You Shall Receive | axeandyoushallreceive.com | Canada | CAD | guitar-focused retailer | not a direct retailer | Homepage/title focus on boutique and vintage guitar effects, guitars, and amps rather than modular/synth retail. Blocker: Not a modular/synth retailer catalog for Price Hub. |
| Rhythmiqx | rhythmiqx.ca | Canada | CAD | Shopify | blocked | robots.txt returned 200 but Shopify storefront and products.json returned 402 `Unavailable Shop`. Blocker: Shopify storefront unavailable. |
| Technopolis | technopolis.tv | Canada | CAD | blog | not a direct retailer | Research pass found blog/sitemap content only, with no product feed or store catalog endpoints. Blocker: Not a direct retailer product catalog. |
| TechnoSynth | technosynth.com | Canada | CAD | WooCommerce Store API | importable | robots.txt and WooCommerce Store API returned 200 with product JSON including Buchla module data. |
| Animato Audio | animatoaudio.com | Hong Kong | HKD | Shopify `products.json` | importable | robots.txt identifies Shopify and products.json returned 200 with product JSON. |
| Tokyo Tape Music Center | tokyotapemusiccenter.com | Japan | JPY | unknown | search-link only | Likely .com and .jp domains did not resolve during public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| patchcable | patchcable.com.au | Australia | AUD | unknown | search-link only | Likely domain failed to fetch during public checks. Blocker: Canonical direct-retailer domain needs manual confirmation before crawl work. |
| Steep Street | steepstreet.com.au | Australia | AUD | unknown | blocked | Research pass found homepage returned 401 and products.json returned 404. Blocker: Site is inaccessible without an approved public catalog feed. |
| Synthesizer NZ | synthesizer.nz | New Zealand | NZD | Shopify/custom | crawler-supported but needs QA | Homepage, robots.txt, and sitemap.xml returned 200; products.json and WooCommerce Store API returned 404. Blocker: Sitemap/page parser needs QA for product metadata and availability. |
| Holawave | holawave.store | Mexico | MXN | unknown | blocked | HTTPS fetches for homepage, robots.txt, products.json, WooCommerce Store API, and sitemap.xml failed from the local probe. Blocker: No stable public metadata endpoint found. |

## Local smoke crawl evidence

Command: `node --experimental-strip-types` import of `scripts/price-hub/catalog-crawler.ts` over importable configs only.

| Source | Feed | Accepted | Rejected | Sample accepted rows |
|---|---|---:|---:|---|
| Big City Music | Shopify `products.json` | 55 | 195 | `4ms Ensemble Oscillator (Black)`, `4ms Pod20 Powered Eurorack Case`, `Cwejman S1 mk2 synthesizer` |
| Whimsical Raps | Shopify `products.json` | 11 | 1 | `Generic Device`, `SILHOUETTE`, `slashes` |
| TechnoSynth | WooCommerce Store API | 8 | 92 | `DWO3 Dual Oscillator`, `SMX3 Matrix Mixer`, `Ensemble Oscillator (noir)` |
| Animato Audio | Shopify `products.json` | 76 | 174 | `MultiWAVE 8-Channel Dual Wavetable Oscillator`, `QXG Quad Stereo Gate Low Pass Gate and Mixer`, `DMNO 8-Voice Analog-Hybrid Synthesizer` |

Deferred sitemap/page-parser candidates are intentionally not added as tracked import feeds in this slice because they need product-page QA for JSON-LD/price/availability extraction and stronger catalog filtering before they can meet the safe-source bar.

---

## Decision log

- 2026-07-03 — Created as a standalone Price Hub expansion task so the crawler investigation can proceed source-by-source without changing the active pilot's existing acceptance scope.
- 2026-07-03T12:57+02:00 — Child session started from an older worktree and recreated the requested docs there; final integration into `develop` ports the compatible stores into the existing Price Hub crawler/config shape.
- 2026-07-03T13:20+02:00 — Added only sources with confirmed public no-login product feeds: Big City Music, Whimsical Raps, TechnoSynth, and Animato Audio. Deferred sitemap-only and search-link-only candidates until page-parser QA; blocked challenge/403/robots-disallowed/unreachable sources instead of bypassing controls.
