import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { normalizeBigCommerceProductPage } from '../../supabase/functions/_shared/price-hub/bigcommerce-metadata.ts';
import { normalizeShopwareProductPage } from '../../supabase/functions/_shared/price-hub/shopware-metadata.ts';
import { crawlPriceHubStoreCatalog, crawlWooCommerceStoreCatalog } from '../price-hub/catalog-crawler.ts';
import { matchModulesToProducts } from '../price-hub/matcher.ts';
import { readApprovedPriceHubStore } from '../price-hub/store-configs.ts';

const elevatorStore = readApprovedPriceHubStore('elevator-sound');
const signalUkStore = readApprovedPriceHubStore('signal-sounds-uk');
const signalEuStore = readApprovedPriceHubStore('signal-sounds-eu');
const schneidersStore = readApprovedPriceHubStore('schneidersladen');

function response(body) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    async json() {
      return body;
    },
  };
}

function textResponse(body) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    async text() {
      return body;
    },
  };
}

function bytesResponse(body) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    async arrayBuffer() {
      return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
    },
  };
}

function product({ id, name, slug, permalink }) {
  return {
    id,
    name,
    slug,
    permalink,
    prices: {
      price: '28900',
      currency_code: 'gbp',
    },
    is_in_stock: true,
    stock_status: 'instock',
    stock_availability: {
      text: 'In stock',
    },
    images: [{ src: 'https://www.elevatorsound.com/image.jpg' }],
  };
}

test('crawls WooCommerce catalog pages and stops on a short page', async () => {
  const requestedUrls = [];
  const pages = [
    [
      product({
        id: 1,
        name: 'Make Noise Maths',
        slug: 'make-noise-maths',
        permalink: 'https://www.elevatorsound.com/product/make-noise-maths/',
      }),
      product({
        id: 2,
        name: 'Mutable Instruments Plaits',
        slug: 'mutable-instruments-plaits',
        permalink: 'https://www.elevatorsound.com/product/mutable-instruments-plaits/',
      }),
    ],
    [
      product({
        id: 3,
        name: 'ALM Busy Circuits Pamela’s Pro Workout',
        slug: 'alm-busy-circuits-pamelas-pro-workout',
        permalink: 'https://www.elevatorsound.com/product/alm-busy-circuits-pamelas-pro-workout/',
      }),
    ],
  ];

  const crawl = await crawlWooCommerceStoreCatalog(elevatorStore, {
    perPage: 2,
    maxPages: 5,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      return response(pages[requestedUrls.length - 1] ?? []);
    },
  });

  assert.equal(crawl.products.length, 3);
  assert.equal(crawl.pagesFetched, 2);
  assert.deepEqual(requestedUrls.map((url) => new URL(url).search), ['?per_page=2&page=1', '?per_page=2&page=2']);
  assert.deepEqual(crawl.products[0], {
    priceAmountMinor: 28900,
    currency: 'GBP',
    availability: 'in_stock',
    productName: 'Make Noise Maths',
    productUrl: 'https://www.elevatorsound.com/product/make-noise-maths/',
    imageUrl: 'https://www.elevatorsound.com/image.jpg',
    rawMeta: {
      adapter: 'woocommerce_store_api',
      externalProductId: 1,
      slug: 'make-noise-maths',
      stockStatus: 'instock',
      stockText: 'In stock',
    },
  });
});

test('stops crawling at configured max pages even when pages are full', async () => {
  let calls = 0;
  const crawl = await crawlWooCommerceStoreCatalog(elevatorStore, {
    perPage: 1,
    maxPages: 2,
    fetchFn: async () => {
      calls += 1;
      return response([
        product({
          id: calls,
          name: `Make Noise Maths ${calls}`,
          slug: `make-noise-maths-${calls}`,
          permalink: `https://www.elevatorsound.com/product/make-noise-maths-${calls}/`,
        }),
      ]);
    },
  });

  assert.equal(calls, 2);
  assert.equal(crawl.products.length, 2);
  assert.equal(crawl.pagesFetched, 2);
});

test('crawls BigCommerce product sitemap and normalizes product metadata pages', async () => {
  const requestedUrls = [];
  const productUrl = 'https://www.signalsounds.com/alm-busy-circuits-pamela-s-workout-pro-eurorack-module';
  const ignoredCrossStoreUrl = 'https://signalsounds.eu/alm-busy-circuits-pamela-s-workout-pro-eurorack-module';
  const sitemap = `
    <urlset>
      <url><loc>${productUrl}</loc></url>
      <url><loc>${ignoredCrossStoreUrl}</loc></url>
    </urlset>
  `;

  const crawl = await crawlPriceHubStoreCatalog(signalUkStore, {
    maxProducts: 1,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      return url.includes('xmlsitemap.php')
        ? textResponse(sitemap)
        : textResponse(bigCommerceProductPage({
          name: 'ALM Busy Circuits Pamela&#039;s Pro Workout Eurorack Module',
          url: productUrl,
          price: '250',
          currency: 'GBP',
          availability: 'instock',
          image: 'https://cdn11.bigcommerce.com/s-mfjemmh3xf/products/25680/images/35625/pamela.jpg',
        }));
    },
  });

  assert.equal(crawl.products.length, 1);
  assert.equal(crawl.pagesFetched, 1);
  assert.equal(requestedUrls.length, 2);
  assert.equal(new URL(requestedUrls[0]).pathname, '/xmlsitemap.php');
  assert.equal(requestedUrls[1], productUrl);
  assert.deepEqual(crawl.products[0], {
    priceAmountMinor: 25000,
    currency: 'GBP',
    availability: 'unknown',
    productName: "ALM Busy Circuits Pamela's Pro Workout Eurorack Module",
    productUrl,
    imageUrl: 'https://cdn11.bigcommerce.com/s-mfjemmh3xf/products/25680/images/35625/pamela.jpg',
    rawMeta: {
      adapter: 'bigcommerce_metadata',
      sourceUrl: productUrl,
      slug: 'alm-busy-circuits-pamela-s-workout-pro-eurorack-module',
      ogAvailability: 'instock',
      priceAmount: '250',
      signalSoundsAvailabilitySource: 'missing_sku',
    },
  });
});

test('normalizes distinct Signal Sounds UK and EU BigCommerce prices', () => {
  const uk = normalizeBigCommerceProductPage(bigCommerceProductPage({
    name: "ALM Busy Circuits Pamela's Pro Workout Eurorack Module",
    url: 'https://www.signalsounds.com/alm-busy-circuits-pamela-s-workout-pro-eurorack-module',
    price: '250',
    currency: 'GBP',
    availability: 'instock',
  }), 'https://www.signalsounds.com/alm-busy-circuits-pamela-s-workout-pro-eurorack-module');
  const eu = normalizeBigCommerceProductPage(bigCommerceProductPage({
    name: "ALM Busy Circuits Pamela's Pro Workout Eurorack Module",
    url: 'https://signalsounds.eu/alm-busy-circuits-pamela-s-workout-pro-eurorack-module',
    price: '315',
    currency: 'EUR',
    availability: 'instock',
  }), 'https://signalsounds.eu/alm-busy-circuits-pamela-s-workout-pro-eurorack-module');

  assert.equal(uk.priceAmountMinor, 25000);
  assert.equal(uk.currency, 'GBP');
  assert.equal(eu.priceAmountMinor, 31500);
  assert.equal(eu.currency, 'EUR');
});

test('uses Signal Sounds Randem inventory instead of stale BigCommerce availability metadata', async () => {
  const requestedUrls = [];
  const productUrl = 'https://signalsounds.eu/noise-engineering-melotus-versio-eurorack-stereo-grnaular-processor-module-black';
  const sitemap = `<urlset><url><loc>${productUrl}</loc></url></urlset>`;

  const crawl = await crawlPriceHubStoreCatalog(signalEuStore, {
    maxProducts: 1,
    fetchFn: async (url, init) => {
      requestedUrls.push({ url, init });

      if (url.includes('xmlsitemap.php')) {
        return textResponse(sitemap);
      }

      if (url.includes('api.randemretail.online')) {
        return textResponse(JSON.stringify({
          perSKU: [
            {
              sku: 'NSEE70',
              storeExternalId: 'HQ',
              quantity: 0,
              inventoryTrackingType: 1,
              locationAllowShipping: true,
              productAllowShipping: true,
            },
            {
              sku: 'NSEE70',
              storeExternalId: 'SS Europe',
              quantity: 0,
              inventoryTrackingType: 1,
              locationAllowShipping: true,
              productAllowShipping: true,
            },
          ],
        }));
      }

      return textResponse(bigCommerceProductPage({
        name: 'Noise Engineering Melotus Versio Eurorack Stereo Granular Processor Module (Black)',
        url: productUrl,
        price: '425',
        currency: 'EUR',
        availability: 'instock',
        sku: 'NSEE70',
      }));
    },
  });

  assert.equal(crawl.products.length, 1);
  assert.equal(crawl.products[0].availability, 'out_of_stock');
  assert.equal(crawl.products[0].rawMeta.ogAvailability, 'instock');
  assert.equal(crawl.products[0].rawMeta.sku, 'NSEE70');
  assert.equal(crawl.products[0].rawMeta.signalSoundsAvailabilitySource, 'randem_location_api');
  assert.equal(crawl.products[0].rawMeta.signalSoundsStoreExternalId, 'SS Europe');
  assert.equal(crawl.products[0].rawMeta.signalSoundsInventoryQuantity, 0);
  assert.equal(requestedUrls[2].url, 'https://api.randemretail.online/public/api/location');
  assert.equal(requestedUrls[2].init.headers['x-randem-application-id'], '5a9c3766-6d6c-4237-8965-9968f2572106');
});

test('keeps Signal Sounds inventory unknown when tracking metadata is missing', async () => {
  const productUrl = 'https://signalsounds.eu/noise-engineering-melotus-versio-eurorack-stereo-granular-processor-module-silver';
  const crawl = await crawlPriceHubStoreCatalog(signalEuStore, {
    maxProducts: 1,
    fetchFn: async (url) => {
      if (url.includes('xmlsitemap.php')) {
        return textResponse(`<urlset><url><loc>${productUrl}</loc></url></urlset>`);
      }

      if (url.includes('api.randemretail.online')) {
        return textResponse(JSON.stringify({
          perSKU: [
            {
              sku: 'NSEE71',
              storeName: 'SS Europe',
              quantity: 0,
            },
          ],
        }));
      }

      return textResponse(bigCommerceProductPage({
        name: 'Noise Engineering Melotus Versio Eurorack Stereo Granular Processor Module (Silver)',
        url: productUrl,
        price: '425',
        currency: 'EUR',
        availability: 'instock',
        sku: 'NSEE71',
      }));
    },
  });

  assert.equal(crawl.products[0].availability, 'unknown');
  assert.equal(crawl.products[0].rawMeta.signalSoundsAvailabilitySource, 'randem_location_api');
  assert.equal(crawl.products[0].rawMeta.signalSoundsStoreExternalId, 'SS Europe');
  assert.equal(crawl.products[0].rawMeta.signalSoundsInventoryQuantity, 0);
});

test('uses shippable Signal Sounds inventory from alternate Randem locations', async () => {
  const productUrl = 'https://signalsounds.eu/schlappi-engineering-nibbler-eurorack-digital-shift-register-module-silver/';
  const crawl = await crawlPriceHubStoreCatalog(signalEuStore, {
    maxProducts: 1,
    fetchFn: async (url) => {
      if (url.includes('xmlsitemap.php')) {
        return textResponse(`<urlset><url><loc>${productUrl}</loc></url></urlset>`);
      }

      if (url.includes('api.randemretail.online')) {
        return textResponse(JSON.stringify({
          perSKU: [
            {
              sku: 'SCHL10',
              storeName: 'SS Europe',
              storeExternalId: 'SS Europe',
              quantity: 0,
              inventoryTrackingType: 1,
              locationAllowShipping: true,
              productAllowShipping: true,
            },
            {
              sku: 'SCHL10',
              storeName: 'Retail',
              storeExternalId: 'HQ',
              quantity: 2,
              inventoryTrackingType: 1,
              locationAllowShipping: true,
              productAllowShipping: true,
            },
          ],
        }));
      }

      return textResponse(bigCommerceProductPage({
        name: 'Schlappi Engineering Nibbler Eurorack Digital Shift Register Module (Silver)',
        url: productUrl,
        price: '265',
        currency: 'EUR',
        availability: 'instock',
        sku: 'SCHL10',
      }));
    },
  });

  assert.equal(crawl.products[0].availability, 'in_stock');
  assert.equal(crawl.products[0].rawMeta.signalSoundsStoreExternalId, 'HQ');
  assert.equal(crawl.products[0].rawMeta.signalSoundsInventoryQuantity, 2);
  assert.deepEqual(crawl.products[0].rawMeta.signalSoundsInventoryLocations, [
    { storeExternalId: 'SS Europe', storeName: 'SS Europe', quantity: 0, shippingAllowed: true },
    { storeExternalId: 'HQ', storeName: 'Retail', quantity: 2, shippingAllowed: true },
  ]);
});

test('crawls Shopware gzip sitemap and skips category pages without product metadata', async () => {
  const requestedUrls = [];
  const sitemapUrl = 'https://schneidersladen.de/en/sitemap/salesChannel/test-sitemap.xml.gz';
  const categoryUrl = 'https://schneidersladen.de/en/eurorack-modular-3u';
  const brokenProductUrl = 'https://schneidersladen.de/en/broken-product-page';
  const productUrl = 'https://schneidersladen.de/en/make-noise-maths-2-silver';
  const sitemapIndex = `<sitemapindex><sitemap><loc>${sitemapUrl}</loc></sitemap></sitemapindex>`;
  const productSitemap = `
    <urlset>
      <url><loc>${categoryUrl}</loc></url>
      <url><loc>${brokenProductUrl}</loc></url>
      <url><loc>${productUrl}</loc></url>
    </urlset>
  `;

  const crawl = await crawlPriceHubStoreCatalog(schneidersStore, {
    maxProducts: 1,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      if (url.endsWith('/sitemap.xml')) {
        return textResponse(sitemapIndex);
      }

      if (url.endsWith('.xml.gz')) {
        return bytesResponse(gzipSync(productSitemap));
      }

      return textResponse(url === productUrl
        ? shopwareProductPage({
          name: 'Make Noise Maths 2 (Silber) - SchneidersLaden',
          url: productUrl,
          price: '329',
          currency: 'EUR',
          productId: '019364372943708b8d06c198957c90c7',
          image: 'https://schneidersladen.de/media/make-noise-maths.webp',
        })
        : '<html><meta property="og:title" content="Eurorack Modular 3U"></html>');
    },
  });

  assert.equal(crawl.products.length, 1);
  assert.equal(crawl.skippedProducts, 1);
  assert.deepEqual(crawl.skippedProductUrls, [brokenProductUrl]);
  assert.deepEqual(requestedUrls, [
    'https://schneidersladen.de/en/sitemap.xml',
    sitemapUrl,
    brokenProductUrl,
    productUrl,
  ]);
  assert.deepEqual(crawl.products[0], {
    priceAmountMinor: 32900,
    currency: 'EUR',
    availability: 'in_stock',
    productName: 'Make Noise Maths 2 (Silber) - SchneidersLaden',
    productUrl,
    imageUrl: 'https://schneidersladen.de/media/make-noise-maths.webp',
    rawMeta: {
      adapter: 'shopware_metadata',
      sourceUrl: productUrl,
      externalProductId: '019364372943708b8d06c198957c90c7',
      slug: 'make-noise-maths-2-silver',
      panelVariant: 'silver',
      ogAvailability: null,
      pageAvailabilityText: 'In stock',
      priceAmount: '329',
    },
  });
});

test('normalizes archived SchneidersLaden Shopware product pages as discontinued', () => {
  const product = normalizeShopwareProductPage(shopwareProductPage({
    name: 'ADDAC - 812V LED Voltage Meter - SchneidersLaden',
    url: 'https://schneidersladen.de/en/addac-systems-812v-led-voltage-meter',
    price: '139',
    currency: 'EUR',
    productId: '01936435ff4873a0ab2b9db8c6da52bb',
    body: '<p class="delivery-information delivery-archived">Product is archived.</p><button disabled>Sorry folks!</button>',
  }), 'https://schneidersladen.de/en/addac-systems-812v-led-voltage-meter');

  assert.equal(product.priceAmountMinor, 13900);
  assert.equal(product.currency, 'EUR');
  assert.equal(product.availability, 'discontinued');
  assert.equal(product.rawMeta.pageAvailabilityText, 'Product is archived');
});

test('records Shopware panel variants in product metadata', () => {
  const silver = normalizeShopwareProductPage(shopwareProductPage({
    name: 'AJH Synth - Finaliser R-EQ (Silver) - SchneidersLaden',
    url: 'https://schneidersladen.de/en/ajh-synth-finaliser-r-eq-silver',
    price: '479',
    currency: 'EUR',
    productId: '0193643641757078ac2bcac02ef22368',
  }), 'https://schneidersladen.de/en/ajh-synth-finaliser-r-eq-silver');
  const black = normalizeShopwareProductPage(shopwareProductPage({
    name: 'AJH Synth - Finaliser R-EQ (Black) - SchneidersLaden',
    url: 'https://schneidersladen.de/en/ajh-synth-finaliser-r-eq-black',
    price: '479',
    currency: 'EUR',
    productId: '01936437121171bc997926248d79489c',
    body: '<span>PreOrder</span>',
  }), 'https://schneidersladen.de/en/ajh-synth-finaliser-r-eq-black');

  assert.equal(silver.rawMeta.panelVariant, 'silver');
  assert.equal(black.rawMeta.panelVariant, 'black');
  assert.equal(black.availability, 'preorder');
});

test('prefers Shopware structured in-stock state over descriptive preorder links', () => {
  const product = normalizeShopwareProductPage(shopwareProductPage({
    name: 'Schlappi Engineering Nibbler (Schwarz) - SchneidersLaden',
    url: 'https://schneidersladen.de/en/schlappi-engineering-nibbler-black',
    price: '239',
    currency: 'EUR',
    productId: '0193643674e7732983303b6769cb0837',
    body: `
      <link itemprop="availability" href="http://schema.org/InStock">
      <p class="delivery-information delivery-available">
        <span class="delivery-status-indicator bg-green"></span>
        In stock
      </p>
      <button class="btn btn-primary btn-buy" title="Add to cart" aria-label="Add to cart">Add to cart</button>
      <a href="https://schlappiengineering.com/products/nibbler-preorder">Nibbler @Schlappi Engineering</a>
    `,
  }), 'https://schneidersladen.de/en/schlappi-engineering-nibbler-black');

  assert.equal(product.availability, 'in_stock');
  assert.equal(product.rawMeta.pageAvailabilityText, 'In stock');
});

test('prefers Shopware structured in-stock state over hidden unavailable variant text', () => {
  const product = normalizeShopwareProductPage(shopwareProductPage({
    name: 'Shakmat Modular - Bishop’s Miscellany mk2 - SchneidersLaden',
    url: 'https://schneidersladen.de/en/shakmat-modular-bishop-s-miscellany-mk2',
    price: '269',
    currency: 'EUR',
    productId: '0193643f8091716bbb38de9fdcc05ec8',
    body: `
      <link itemprop="availability" href="http://schema.org/InStock">
      <p class="delivery-information delivery-available">
        <span class="delivery-status-indicator bg-green"></span>
        In stock
      </p>
      <button class="btn btn-primary btn-buy" title="Add to cart" aria-label="Add to cart">Add to cart</button>
      <small class="visually-hidden">(This option is currently unavailable.)</small>
    `,
  }), 'https://schneidersladen.de/en/shakmat-modular-bishop-s-miscellany-mk2');

  assert.equal(product.availability, 'in_stock');
  assert.equal(product.rawMeta.pageAvailabilityText, 'In stock');
});

test('normalizes primary Shopware unavailable delivery state as out of stock', () => {
  const product = normalizeShopwareProductPage(shopwareProductPage({
    name: 'Make Noise - Maths - SchneidersLaden',
    url: 'https://schneidersladen.de/en/make-noise-maths',
    price: '329',
    currency: 'EUR',
    productId: '019364372943708b8d06c198957c90c7',
    body: `
      <p class="delivery-information delivery-not-available">
        Currently not available
      </p>
      <button class="btn btn-primary btn-buy" disabled>Currently not available</button>
    `,
  }), 'https://schneidersladen.de/en/make-noise-maths');

  assert.equal(product.availability, 'out_of_stock');
  assert.equal(product.rawMeta.pageAvailabilityText, 'Currently not available');
});

test('normalizes SchneidersLaden Shopware product metadata', () => {
  const product = normalizeShopwareProductPage(shopwareProductPage({
    name: 'Neuzeit Instruments - Drop - SchneidersLaden',
    url: 'https://schneidersladen.de/en/neuzeit-instruments-drop',
    price: '799',
    currency: 'EUR',
    productId: '0196aaa2b1d37081ba909d6c00c14701',
  }), 'https://schneidersladen.de/en/neuzeit-instruments-drop');

  assert.equal(product.priceAmountMinor, 79900);
  assert.equal(product.currency, 'EUR');
  assert.equal(product.availability, 'in_stock');
  assert.equal(product.rawMeta.adapter, 'shopware_metadata');
});

test('matcher returns strong candidates for exact manufacturer and module names', () => {
  const [candidate] = matchModulesToProducts([
    { id: 'maths-id', name: 'Maths', manufacturerName: 'Make Noise' },
  ], [normalizedProduct('Make Noise Maths', 'make-noise-maths')]);

  assert.equal(candidate.moduleId, 'maths-id');
  assert.equal(candidate.status, 'strong_candidate');
  assert.equal(candidate.score >= 0.86, true);
  assert.equal(candidate.reasons.includes('manufacturer phrase found in product name'), true);
  assert.equal(candidate.reasons.includes('module phrase found in product name'), true);
});

test('matcher supports manufacturer object and combined slug matching', () => {
  const [candidate] = matchModulesToProducts([
    { id: 'plaits-id', name: 'Plaits', manufacturer: { name: 'Mutable Instruments' } },
  ], [normalizedProduct('MI macro oscillator', 'mutable-instruments-plaits')]);

  assert.equal(candidate.moduleId, 'plaits-id');
  assert.equal(candidate.status, 'review_candidate');
  assert.equal(candidate.reasons.includes('combined manufacturer and module slug found'), true);
});

test('matcher penalizes noisy accessory false positives', () => {
  const [candidate] = matchModulesToProducts([
    { id: 'maths-id', name: 'Maths', manufacturerName: 'Make Noise' },
  ], [normalizedProduct('Make Noise Maths black panel kit', 'make-noise-maths-black-panel-kit')]);

  assert.equal(candidate.status, 'ignored');
  assert.equal(candidate.score < 0.72, true);
  assert.equal(candidate.reasons.some((reason) => reason.startsWith('noise penalty:')), true);
});

test('generic module names require manufacturer support', () => {
  const [candidate] = matchModulesToProducts([
    { id: 'mix-id', name: 'Mix', manufacturerName: 'ALM Busy Circuits' },
  ], [normalizedProduct('Four channel mix utility', 'four-channel-mix-utility')]);

  assert.equal(candidate.status, 'ignored');
  assert.equal(candidate.score <= 0.35, true);
  assert.equal(candidate.reasons.includes('generic module name requires manufacturer support'), true);
});

test('matcher drops zero-score generic module rows instead of emitting every product', () => {
  const candidates = matchModulesToProducts([
    { id: 'vca-id', name: 'VCA', manufacturerName: 'ALM Busy Circuits' },
  ], [
    normalizedProduct('Make Noise Maths', 'make-noise-maths'),
    normalizedProduct('Mutable Instruments Plaits', 'mutable-instruments-plaits'),
    normalizedProduct('Random patch cables', 'random-patch-cables'),
  ]);

  assert.deepEqual(candidates, []);
});

test('matcher can omit ignored positive-score rows for full catalog runs', () => {
  const products = [normalizedProduct('Make Noise Maths black panel kit', 'make-noise-maths-black-panel-kit')];
  const modules = [{ id: 'maths-id', name: 'Maths', manufacturerName: 'Make Noise' }];

  assert.equal(matchModulesToProducts(modules, products).length, 1);
  assert.deepEqual(matchModulesToProducts(modules, products, { includeIgnored: false }), []);
});

test('matcher omits New Groove preorder and used variants during full catalog runs', () => {
  const products = [
    normalizedProduct('Make Noise 0-Coast (prenotazione)', 'make-noise-0-coast-prenotazione'),
    normalizedProduct('Make Noise 0-Coast (usato)', 'make-noise-0-coast-usato'),
    normalizedProduct('Make Noise 0-Coast', 'make-noise-0-coast'),
  ];
  const modules = [{ id: '0-coast-id', name: '0-Coast', manufacturerName: 'Make Noise' }];

  const matches = matchModulesToProducts(modules, products, { includeIgnored: false });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].productUrl, 'https://store.test/product/make-noise-0-coast/');
});

test('matcher omits Elevator Sound b-stock ex-demo preorder and accessory variants during full catalog runs', () => {
  const products = [
    normalizedProduct('Rossum Electro-Music Evolution Eurorack VCF Module [Ex-Demo]', 'rossum-electro-music-evolution-eurorack-vcf-module-ex-demo'),
    normalizedProduct('2hp Kick Eurorack Drum Module (Silver)', '2hp-kick-eurorack-drum-module-pre-order'),
    normalizedProduct('Instruo Nibbler Eurorack Module Preorder', 'instruo-nibbler-preorder'),
    normalizedProduct('Intellijel Metropolix Backpack Interface Accessory', 'intellijel-metropolix-backpack-interface-accessory'),
    normalizedProduct('Michigan Synth Works F8R Fader Eurorack Control Module [B-Stock]', 'michigan-synth-works-f8r-fader-eurorack-control-module-b-stock'),
    normalizedProduct('Rossum Electro-Music Evolution Eurorack VCF Module', 'rossum-electro-music-evolution-eurorack-vcf-module'),
  ];
  const modules = [
    { id: 'evolution-id', name: 'Evolution', manufacturerName: 'Rossum Electro-Music' },
    { id: 'kick-id', name: 'Kick', manufacturerName: '2hp' },
    { id: 'nibbler-id', name: 'Nibbler', manufacturerName: 'Instruo' },
    { id: 'metropolix-id', name: 'Metropolix', manufacturerName: 'Intellijel' },
    { id: 'f8r-id', name: 'F8R', manufacturerName: 'Michigan Synth Works' },
  ];

  const matches = matchModulesToProducts(modules, products, { includeIgnored: false });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].moduleId, 'evolution-id');
  assert.equal(matches[0].productUrl, 'https://store.test/product/rossum-electro-music-evolution-eurorack-vcf-module/');
});

test('matcher supports compact manufacturer-prefixed module codes', () => {
  const matches = matchModulesToProducts([
    { id: 4524, name: 'ADDAC812VU', manufacturerName: 'ADDAC System' },
  ], [
    normalizedProduct('ADDAC - 812V LED Voltage Meter - SchneidersLaden', 'addac-systems-812v-led-voltage-meter'),
  ], { includeIgnored: false });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].moduleId, '4524');
  assert.equal(matches[0].status, 'strong_candidate');
  assert.ok(matches[0].reasons.includes('manufacturer-supported module code alias found'));
});

test('matcher does not treat shared numeric suffixes as compact code aliases', () => {
  const matches = matchModulesToProducts([
    { id: 'bd909-id', name: 'BD909', manufacturerName: 'Tiptop Audio' },
    { id: 'sd909-id', name: 'SD909', manufacturerName: 'Tiptop Audio' },
  ], [
    normalizedProduct('Tiptop Audio SD909 Snare Eurorack Drum Module', 'tiptop-audio-sd909-snare-eurorack-drum-module'),
  ], { includeIgnored: false });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].moduleId, 'sd909-id');
});

function normalizedProduct(productName, slug) {
  return {
    priceAmountMinor: 10000,
    currency: 'EUR',
    availability: 'in_stock',
    productName,
    productUrl: `https://store.test/product/${slug}/`,
    imageUrl: null,
    rawMeta: {
      adapter: 'woocommerce_store_api',
      externalProductId: slug,
      slug,
      stockStatus: 'instock',
      stockText: 'In stock',
    },
  };
}

function bigCommerceProductPage({ name, url, price, currency, availability, image = 'https://cdn.test/image.jpg', sku = null }) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>${name} at Signal Sounds</title>
        <meta property="product:price:amount" content="${price}">
        <meta property="product:price:currency" content="${currency}">
        <meta property="og:url" content="${url}">
        <meta property="og:title" content="${name}">
        <meta property="og:image" content="${image}">
        <meta property="og:availability" content="${availability}">
        ${sku ? `<script>var BCData = {"product_attributes":{"sku":"${sku}","instock":true}};</script>` : ''}
      </head>
    </html>
  `;
}

function shopwareProductPage({ name, url, price, currency, productId, image = 'https://schneidersladen.de/media/product.webp', body = '<span>In stock</span>' }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta property="og:url" content="${url}">
        <meta property="og:title" content="${name}">
        <meta property="og:image" content="${image}">
        <meta property="product:price:amount" content="${price}">
        <meta property="product:price:currency" content="${currency}">
        <meta itemprop="priceCurrency" content="${currency}">
        <meta itemprop="price" content="${price}">
        <meta itemprop="productID" content="${productId}">
      </head>
      <body>${body}</body>
    </html>
  `;
}
