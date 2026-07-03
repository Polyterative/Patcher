import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { normalizeBigCommerceProductPage } from '../../supabase/functions/_shared/price-hub/bigcommerce-metadata.ts';
import { normalizeShopifyProductJsonProduct } from '../../supabase/functions/_shared/price-hub/shopify-product-json.ts';
import { normalizeShopwareProductPage } from '../../supabase/functions/_shared/price-hub/shopware-metadata.ts';
import { readCliOptions as readCrawlCliOptions } from '../price-hub/crawl-local.ts';
import { crawlPriceHubStoreCatalog, crawlShopifyProductJsonCatalog, crawlWooCommerceStoreCatalog } from '../price-hub/catalog-crawler.ts';
import { readPriceHubScriptEnv } from '../price-hub/local-env.ts';
import { matchModulesToProducts } from '../price-hub/matcher.ts';
import { fetchModulesFromSupabase, readRefreshCliOptions } from '../price-hub/refresh-local.ts';
import { readApprovedPriceHubStore } from '../price-hub/store-configs.ts';

const clockfaceStore = readApprovedPriceHubStore('clockface-modular');
const controlStore = readApprovedPriceHubStore('control');
const animatoStore = readApprovedPriceHubStore('animato-audio');
const bigCityStore = readApprovedPriceHubStore('big-city-music');
const busyCircuitsStore = readApprovedPriceHubStore('busy-circuits');
const elevatorStore = readApprovedPriceHubStore('elevator-sound');
const foundSoundStore = readApprovedPriceHubStore('found-sound');
const instruoStore = readApprovedPriceHubStore('instruo');
const machineroomStore = readApprovedPriceHubStore('machineroom');
const martinPasStore = readApprovedPriceHubStore('martin-pas');
const milkAudioStore = readApprovedPriceHubStore('milk-audio-store');
const postmodularStore = readApprovedPriceHubStore('postmodular');
const signalUkStore = readApprovedPriceHubStore('signal-sounds-uk');
const signalEuStore = readApprovedPriceHubStore('signal-sounds-eu');
const schneidersStore = readApprovedPriceHubStore('schneidersladen');
const soundiumStore = readApprovedPriceHubStore('soundium');
const synthshopStore = readApprovedPriceHubStore('synthshop');
const technosynthStore = readApprovedPriceHubStore('technosynth');
const turnlabStore = readApprovedPriceHubStore('turnlab');
const whimsicalRapsStore = readApprovedPriceHubStore('whimsical-raps');

test('local crawl CLI defaults to full metadata crawls and accepted-match export', () => {
  const options = readCrawlCliOptions([]);

  assert.equal(options.maxProducts, undefined);
  assert.equal(options.includeIgnoredMatches, false);
});

test('local refresh CLI defaults to live import and can fetch module input from Supabase', () => {
  const options = readRefreshCliOptions(['--store=signal-sounds-uk'], {
    SUPABASE_ANON_KEY: 'anon-key',
  });

  assert.equal(options.dryRun, false);
  assert.equal(options.store, 'signal-sounds-uk');
  assert.equal(options.modulesPath, '');
  assert.equal(options.supabaseKey, 'anon-key');
  assert.equal(options.supabaseReadKey, 'anon-key');
});

test('local refresh CLI prefers service role over anon when both are available', () => {
  const options = readRefreshCliOptions(['--store=signal-sounds-uk'], {
    SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  });

  assert.equal(options.supabaseKey, 'service-role-key');
  assert.equal(options.supabaseReadKey, 'service-role-key');
});

test('local refresh CLI can read service role credentials from local env files', () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'patcher-price-hub-env-'));
  try {
    writeFileSync(join(rootDir, 'package.json'), '{}');
    writeFileSync(join(rootDir, '.env'), [
      'SUPABASE_URL=https://env.example.supabase.co',
      'SUPABASE_SERVICE_ROLE_KEY=from-env',
    ].join('\n'));
    writeFileSync(join(rootDir, '.env.local'), 'SUPABASE_SERVICE_ROLE_KEY=from-local\n');

    const loadedEnv = readPriceHubScriptEnv({}, { rootDir });
    const options = readRefreshCliOptions(['--modules=modules.json'], loadedEnv);

    assert.equal(options.supabaseUrl, 'https://env.example.supabase.co');
    assert.equal(options.supabaseKey, 'from-local');
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('local refresh CLI keeps explicit process credentials ahead of local env files', () => {
  const rootDir = mkdtempSync(join(tmpdir(), 'patcher-price-hub-env-'));
  try {
    writeFileSync(join(rootDir, 'package.json'), '{}');
    writeFileSync(join(rootDir, '.env'), 'SUPABASE_SERVICE_ROLE_KEY=from-env\n');

    const loadedEnv = readPriceHubScriptEnv({ SUPABASE_SERVICE_ROLE_KEY: 'from-process' }, { rootDir });
    const options = readRefreshCliOptions(['--modules=modules.json'], loadedEnv);

    assert.equal(options.supabaseKey, 'from-process');
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('local refresh can fetch approved module matcher input with the Supabase read key', async () => {
  const ranges = [];
  const pages = [
    Array.from({ length: 500 }, (_, index) => ({
      id: index + 1,
      name: `Module ${index + 1}`,
      manufacturer: { name: `Manufacturer ${index + 1}` },
    })),
    [
      { id: 501, name: 'Plaits', manufacturer: [{ name: 'Mutable Instruments' }] },
    ],
  ];
  const supabase = {
    from(table) {
      assert.equal(table, 'modules');
      return {
        select(columns) {
          assert.equal(columns, 'id,name,manufacturer:manufacturerId(name)');
          return this;
        },
        eq(column, value) {
          assert.equal(column, 'isApproved');
          assert.equal(value, true);
          return this;
        },
        order(column, options) {
          assert.equal(column, 'id');
          assert.deepEqual(options, { ascending: true });
          return this;
        },
        async range(from, to) {
          ranges.push([from, to]);
          return {
            data: pages[ranges.length - 1] ?? [],
            error: null,
          };
        },
      };
    },
  };

  const modules = await fetchModulesFromSupabase(supabase);

  assert.deepEqual(ranges, [[0, 499], [500, 999]]);
  assert.equal(modules.length, 501);
  assert.deepEqual(modules[0], {
    id: 1,
    name: 'Module 1',
    manufacturerName: 'Manufacturer 1',
    manufacturer: { name: 'Manufacturer 1' },
  });
  assert.deepEqual(modules[500], {
    id: 501,
    name: 'Plaits',
    manufacturerName: 'Mutable Instruments',
    manufacturer: { name: 'Mutable Instruments' },
  });
});

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

function errorResponse(status, statusText) {
  return {
    ok: false,
    status,
    statusText,
    async json() {
      return {};
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

  test('crawls Shopify product JSON pages and normalizes Control product variants', async () => {
    const requestedUrls = [];
    const pages = [
      [
        shopifyProduct({
          id: 12502662938942,
          title: 'Blukac Fractalist - Fractal Waveform Generator',
          handle: 'blukac-fractalist-fractal-waveform-generator',
          vendor: 'Blukac',
          productType: 'Module',
          tags: ['Digital Oscillator', 'In Stock', 'width:12HP'],
          variants: [
            {
              id: 53843111805246,
              title: 'Default Title',
              sku: 'BLUKAC-FRACTALIST',
              available: true,
              price: '349.00',
            },
          ],
        }),
        shopifyProduct({
          id: 2,
          title: 'Make Noise Maths (Used)',
          handle: 'make-noise-maths-used',
          vendor: 'Make Noise',
          productType: 'Used Gear',
          tags: ['consignment'],
          variants: [{ id: 20, available: false, price: '250.00' }],
        }),
      ],
    ];

    const crawl = await crawlShopifyProductJsonCatalog(controlStore, {
      perPage: 2,
      maxPages: 3,
      fetchFn: async (url) => {
        requestedUrls.push(url);
        return response({ products: pages[requestedUrls.length - 1] ?? [] });
      },
    });

    assert.equal(crawl.products.length, 2);
    assert.equal(crawl.pagesFetched, 2);
    assert.deepEqual(requestedUrls.map((url) => new URL(url).search), ['?limit=2&page=1', '?limit=2&page=2']);
    assert.deepEqual(crawl.products[0], {
      priceAmountMinor: 34900,
      currency: 'USD',
      availability: 'in_stock',
      productName: 'Blukac Fractalist - Fractal Waveform Generator',
      productUrl: 'https://www.ctrl-mod.com/products/blukac-fractalist-fractal-waveform-generator',
      imageUrl: 'https://cdn.shopify.com/fractalist.jpg',
      rawMeta: {
        adapter: 'shopify_product_json',
        externalProductId: 12502662938942,
        slug: 'blukac-fractalist-fractal-waveform-generator',
        vendor: 'Blukac',
        productType: 'Module',
        tags: ['Digital Oscillator', 'In Stock', 'width:12HP'],
        variantCount: 1,
        selectedVariantId: 53843111805246,
        selectedVariantTitle: 'Default Title',
        selectedVariantSku: 'BLUKAC-FRACTALIST',
        selectedVariantAvailable: true,
        availableVariantIds: [53843111805246],
      },
    });
  });

  test('normalizes Shopify pre-order tags before variant availability', () => {
    const product = normalizeShopifyProductJsonProduct(shopifyProduct({
      title: 'Fractalist - Fractal Waveform Generator',
      handle: 'blukac-fractalist-fractal-waveform-generator',
      vendor: 'Blukac',
      productType: 'Module',
      tags: ['Pre-Order'],
      variants: [{ id: 1, available: true, price: '349.00' }],
    }), { baseUrl: 'https://www.ctrl-mod.com/', currencyHint: 'USD' });

    assert.equal(product.availability, 'preorder');
    assert.equal(product.priceAmountMinor, 34900);
    assert.equal(product.currency, 'USD');
  });

  test('keeps ignored Shopify match-noise tags available for availability', () => {
    const product = normalizeShopifyProductJsonProduct(shopifyProduct({
      title: 'WMD Voltera Metron Expander',
      handle: 'wmd-voltera-metron-expander',
      vendor: 'WMD',
      productType: 'NEW',
      tags: ['brand-new', 'preorder', 'shopfront', 'visible'],
      variants: [{ id: 1, available: true, price: '409.00' }],
    }), {
      baseUrl: 'https://foundsound.com.au/',
      currencyHint: 'AUD',
      ignoredMatchNoiseTags: ['preorder'],
    });

    assert.equal(product.availability, 'preorder');
    assert.equal(product.rawMeta.matchNoiseText, 'NEW brand-new shopfront visible');
    assert.deepEqual(product.rawMeta.ignoredMatchNoiseTags, ['preorder']);
  });

  test('normalizes Shopify discontinued text before variant availability', () => {
    const product = normalizeShopifyProductJsonProduct(shopifyProduct({
      title: 'Electrosmith 2144 LPF : Discontinued',
      handle: 'electrosmith-2144-lpf',
      vendor: 'Electrosmith',
      productType: 'Module',
      tags: ['status:no-longer-available'],
      variants: [{ id: 1, available: true, price: '119.00' }],
    }), { baseUrl: 'https://www.detroitmodular.com/', currencyHint: 'USD' });

    assert.equal(product.availability, 'discontinued');
    assert.equal(product.priceAmountMinor, 11900);
    assert.equal(product.currency, 'USD');
  });

  assert.equal(calls, 2);
  assert.equal(crawl.products.length, 2);
  assert.equal(crawl.pagesFetched, 2);
});

test('crawls Found Sound Shopify product JSON and treats preorder tags as preorder availability', async () => {
  const requestedUrls = [];
  const crawl = await crawlShopifyProductJsonCatalog(foundSoundStore, {
    perPage: 2,
    maxPages: 3,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      return response({
        products: requestedUrls.length === 1
          ? [
              shopifyProduct({
                id: 9302144450796,
                title: 'WMD Modbox MKII Dual LFO - 3 Phase & Skew, with S&H, Noise, and Turing Machine Eurorack Module',
                handle: '42592',
                vendor: 'WMD',
                productType: 'NEW',
                tags: ['brand-new', 'eurorack', 'preorder', 'shopfront', 'visible'],
                variants: [{ id: 1, title: 'Default Title', sku: '42592', available: true, price: '499.00' }],
              }),
            ]
          : [],
      });
    },
  });

  assert.equal(crawl.products.length, 1);
  assert.equal(new URL(requestedUrls[0]).pathname, '/collections/eurorack/products.json');
  assert.equal(crawl.products[0].priceAmountMinor, 49900);
  assert.equal(crawl.products[0].currency, 'AUD');
  assert.equal(crawl.products[0].availability, 'preorder');
  assert.equal(crawl.products[0].productUrl, 'https://foundsound.com.au/products/42592');
  assert.equal(crawl.products[0].rawMeta.matchNoiseText, 'NEW brand-new eurorack shopfront visible');
  assert.deepEqual(crawl.products[0].rawMeta.ignoredMatchNoiseTags, ['preorder']);
});

test('uses configured Shopify catalog paths and currency hints for new stores', async () => {
  const requestedUrls = [];
  const crawl = await crawlShopifyProductJsonCatalog(clockfaceStore, {
    perPage: 2,
    maxPages: 1,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      return response({
        products: [
          shopifyProduct({
            id: 100,
            title: 'Make Noise Maths Eurorack Module',
            handle: 'make-noise-maths',
            vendor: 'Make Noise',
            productType: 'Eurorack Module',
            tags: ['eurorack', 'module'],
            variants: [{ id: 101, title: 'Default Title', sku: 'MATHS', available: true, price: '77000' }],
          }),
        ],
      });
    },
  });

  assert.equal(new URL(requestedUrls[0]).pathname, '/products.json');
  assert.equal(crawl.products[0].currency, 'JPY');
  assert.equal(crawl.products[0].productUrl, 'https://clockfacemodular.com/products/make-noise-maths');
});

test('uses Synthshop Shopify product JSON with NOK currency metadata', async () => {
  const requestedUrls = [];
  const crawl = await crawlShopifyProductJsonCatalog(synthshopStore, {
    perPage: 1,
    maxPages: 1,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      return response({
        products: [
          shopifyProduct({
            id: 400,
            title: 'Make Noise Maths',
            handle: 'make-noise-maths',
            vendor: 'Make Noise',
            productType: 'Eurorack',
            tags: ['module'],
            variants: [{ id: 401, title: 'Default Title', sku: 'MATHS', available: true, price: '7299.00' }],
          }),
        ],
      });
    },
  });

  assert.equal(new URL(requestedUrls[0]).pathname, '/products.json');
  assert.equal(crawl.products[0].currency, 'NOK');
  assert.equal(crawl.products[0].priceAmountMinor, 729900);
  assert.equal(crawl.products[0].productUrl, 'https://synthshop.no/products/make-noise-maths');
});

test('uses Soundium Eurorack collection feed instead of the full Shopify catalog', async () => {
  const requestedUrls = [];
  const crawl = await crawlShopifyProductJsonCatalog(soundiumStore, {
    perPage: 1,
    maxPages: 1,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      return response({
        products: [
          shopifyProduct({
            id: 500,
            title: 'OXI Instruments Pipe MKII',
            handle: 'oxi-instruments-pipe-mkii',
            vendor: 'OXI Instruments',
            productType: 'Eurorack',
            tags: ['Eurorack'],
            variants: [{ id: 501, title: 'Default Title', sku: 'PIPE-MKII', available: true, price: '195.00' }],
          }),
        ],
      });
    },
  });

  assert.equal(new URL(requestedUrls[0]).pathname, '/collections/eurorack/products.json');
  assert.equal(crawl.products[0].currency, 'EUR');
  assert.equal(crawl.products[0].productUrl, 'https://soundium.lt/products/oxi-instruments-pipe-mkii');
});

test('uses added source-expansion Shopify product JSON configs', async () => {
  const cases = [
    {
      store: animatoStore,
      title: 'Buchla 259t Eurorack Module',
      handle: 'buchla-259t',
      vendor: 'Buchla',
      currency: 'HKD',
      productUrl: 'https://animatoaudio.com/products/buchla-259t',
    },
    {
      store: bigCityStore,
      title: '4ms Ensemble Oscillator Eurorack Module',
      handle: '4ms-ensemble-oscillator',
      vendor: '4ms',
      currency: 'USD',
      productUrl: 'https://bigcitymusic.com/products/4ms-ensemble-oscillator',
    },
    {
      store: whimsicalRapsStore,
      title: 'Just Friends',
      handle: 'just-friends',
      vendor: 'Whimsical Raps',
      currency: 'USD',
      productUrl: 'https://whimsicalraps.com/products/just-friends',
      brand: 'Whimsical Raps',
    },
  ];

  for (const {store, title, handle, vendor, currency, productUrl, brand} of cases) {
    const requestedUrls = [];
    const crawl = await crawlShopifyProductJsonCatalog(store, {
      perPage: 1,
      maxPages: 1,
      fetchFn: async (url) => {
        requestedUrls.push(url);
        return response({
          products: [
            shopifyProduct({
              id: 900,
              title,
              handle,
              vendor,
              productType: 'Eurorack Module',
              tags: ['eurorack', 'module'],
              variants: [{ id: 901, title: 'Default Title', sku: handle.toUpperCase(), available: true, price: '100.00' }],
            }),
          ],
        });
      },
    });

    assert.equal(new URL(requestedUrls[0]).pathname, '/products.json');
    assert.equal(crawl.products[0].currency, currency);
    assert.equal(crawl.products[0].productUrl, productUrl);
    if (brand) {
      assert.equal(crawl.products[0].rawMeta.brand, brand);
    }
  }
});

test('uses TechnoSynth WooCommerce Store API config', async () => {
  const requestedUrls = [];
  const crawl = await crawlWooCommerceStoreCatalog(technosynthStore, {
    perPage: 1,
    maxPages: 1,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      return response([
        {
          id: 700,
          name: 'Buchla 259t Eurorack Module',
          slug: 'buchla-259t',
          permalink: 'https://technosynth.com/product/buchla-259t/',
          prices: {
            price: '79900',
            currency_code: 'cad',
          },
          is_in_stock: false,
          stock_status: 'outofstock',
          stock_availability: {
            text: 'Out of stock',
          },
          categories: [{name: 'Eurorack'}],
          tags: [{name: 'Tiptop Audio &amp; Buchla'}],
          images: [{ src: 'https://technosynth.com/buchla.jpg' }],
        },
      ]);
    },
  });

  assert.equal(new URL(requestedUrls[0]).pathname, '/wp-json/wc/store/v1/products');
  assert.equal(crawl.products[0].currency, 'CAD');
  assert.equal(crawl.products[0].availability, 'out_of_stock');
  assert.equal(crawl.products[0].productUrl, 'https://technosynth.com/product/buchla-259t/');
  assert.equal(crawl.products[0].rawMeta.brand, 'Tiptop Audio & Buchla');
});

test('uses Postmodular maker taxonomy as WooCommerce brand metadata', async () => {
  const crawl = await crawlWooCommerceStoreCatalog(postmodularStore, {
    perPage: 1,
    maxPages: 1,
    fetchFn: async () => response([
      {
        id: 701,
        name: 'MOON',
        sku: 'Landscape_.MOON',
        slug: 'moon',
        permalink: 'https://postmodular.co.uk/modules/moon/',
        prices: {
          price: '34400',
          currency_code: 'gbp',
        },
        is_in_stock: true,
        stock_status: 'instock',
        stock_availability: null,
        brands: [],
        categories: [{ name: 'Landscape', slug: 'landscape', link: 'https://postmodular.co.uk/makers/landscape/' }],
        tags: [{ name: 'Passive analogue drum synth', slug: 'passive-analogue-drum-synth', link: 'https://postmodular.co.uk/types/passive-analogue-drum-synth/' }],
        images: [{ src: 'https://postmodular.co.uk/moon.jpg' }],
      },
    ]),
  });

  assert.equal(crawl.products[0].currency, 'GBP');
  assert.equal(crawl.products[0].availability, 'in_stock');
  assert.equal(crawl.products[0].rawMeta.brand, 'Landscape');
});

test('crawls metadata stores past 100 products when maxProducts is omitted', async () => {
  const productUrls = Array.from(
    { length: 105 },
    (_, index) => `https://machineroom.com.ua/product/test-module-${index}/`,
  );

  const crawl = await crawlPriceHubStoreCatalog(machineroomStore, {
    metadataConcurrency: 25,
    fetchFn: async (url) => {
      if (url.endsWith('/sitemap_index.xml')) {
        return textResponse('<sitemapindex><sitemap><loc>https://machineroom.com.ua/product-sitemap.xml</loc></sitemap></sitemapindex>');
      }
      if (url.endsWith('/product-sitemap.xml')) {
        return textResponse(`<urlset>${productUrls.map((productUrl) => `<url><loc>${productUrl}</loc></url>`).join('')}</urlset>`);
      }

      const index = productUrls.indexOf(url);
      assert.notEqual(index, -1);
      return textResponse(productMetadataPage({
        name: `Test Module ${index}`,
        url,
        price: '199.00',
        currency: 'EUR',
        availability: 'instock',
      }));
    },
  });

  assert.equal(crawl.products.length, 105);
  assert.equal(crawl.totalProductUrls, 105);
  assert.equal(crawl.hitMaxProducts, false);
});

test('marks metadata crawls as truncated when an explicit product cap is reached', async () => {
  const productUrls = [
    'https://machineroom.com.ua/product/test-module-a/',
    'https://machineroom.com.ua/product/test-module-b/',
    'https://machineroom.com.ua/product/test-module-c/',
  ];

  const crawl = await crawlPriceHubStoreCatalog(machineroomStore, {
    maxProducts: 1,
    metadataConcurrency: 6,
    fetchFn: async (url) => {
      if (url.endsWith('/sitemap_index.xml')) {
        return textResponse('<sitemapindex><sitemap><loc>https://machineroom.com.ua/product-sitemap.xml</loc></sitemap></sitemapindex>');
      }
      if (url.endsWith('/product-sitemap.xml')) {
        return textResponse(`<urlset>${productUrls.map((productUrl) => `<url><loc>${productUrl}</loc></url>`).join('')}</urlset>`);
      }

      assert.equal(url, productUrls[0]);
      return textResponse(productMetadataPage({
        name: 'Test Module A',
        url,
        price: '199.00',
        currency: 'EUR',
        availability: 'instock',
      }));
    },
  });

  assert.equal(crawl.products.length, 1);
  assert.equal(crawl.totalProductUrls, 1);
  assert.equal(crawl.hitMaxProducts, true);
});

test('applies configured direct-store brand hints to crawled products', async () => {
  const shopifyCrawl = await crawlShopifyProductJsonCatalog(busyCircuitsStore, {
    perPage: 1,
    maxPages: 1,
    fetchFn: async () => response({
      products: [
        shopifyProduct({
          id: 200,
          title: 'Tangle Quartet',
          handle: 'alm009',
          vendor: 'ALM',
          productType: 'Module',
          tags: [],
          variants: [{ id: 201, title: 'Default Title', sku: 'ALM009', available: true, price: '165.00' }],
        }),
      ],
    }),
  });
  const wooCrawl = await crawlWooCommerceStoreCatalog(instruoStore, {
    perPage: 1,
    maxPages: 1,
    fetchFn: async () => response([
      product({
        id: 300,
        name: 'tàin',
        slug: 'tain',
        permalink: 'https://www.instruomodular.com/product/tain/',
      }),
    ]),
  });

  assert.equal(shopifyCrawl.products[0].rawMeta.brand, 'ALM Busy Circuits');
  assert.equal(wooCrawl.products[0].rawMeta.brand, 'Instruo');
});

test('retries rate-limited Shopify product JSON pages', async () => {
  let calls = 0;
  const crawl = await crawlShopifyProductJsonCatalog(foundSoundStore, {
    perPage: 250,
    maxPages: 1,
    fetchFn: async () => {
      calls += 1;
      return calls === 1
        ? errorResponse(429, 'Too Many Requests')
        : response({ products: [] });
    },
  });

  assert.equal(calls, 2);
  assert.equal(crawl.products.length, 0);
});

test('matcher omits Shopify condition and status hazards from broad imports', () => {
  const modules = [
    { id: 'maths-id', name: 'Maths', manufacturerName: 'Make Noise' },
    { id: 'quad-vca-id', name: 'Quad VCA', manufacturerName: 'Intellijel' },
    { id: 'drum-farm-id', name: 'Drum Farm', manufacturerName: 'Knobula' },
    { id: 'oberhausen-id', name: 'Oberhausen', manufacturerName: 'ST Modular' },
    { id: 'plinky-id', name: 'Plinky Eurorack Expander', manufacturerName: 'Making Sound Machines' },
    { id: 'trommelmaschine-id', name: 'Trommelmaschine', manufacturerName: 'ST Modular' },
    { id: 'geiger-id', name: 'Geiger Counter', manufacturerName: 'WMD' },
    { id: 'mfx-id', name: 'MFX', manufacturerName: 'ALM Busy Circuits' },
    { id: 'pams-id', name: "Pamela's Disco", manufacturerName: 'ALM Busy Circuits' },
  ];
  const products = [
    {
      ...normalizedProduct('Make Noise Maths Open Box', 'make-noise-maths-open-box'),
      rawMeta: { adapter: 'shopify_product_json', slug: 'make-noise-maths-open-box', tags: ['Open_Box', 'eurorack'] },
    },
    {
      ...normalizedProduct('Intellijel Quad VCA', 'intellijel-quad-vca'),
      rawMeta: { adapter: 'shopify_product_json', slug: 'intellijel-quad-vca', tags: ['status:no-longer-available'] },
    },
    {
      ...normalizedProduct('Knobula Drum Farm Eurorack Drum Module', 'knobula-drum-farm'),
      rawMeta: { adapter: 'shopify_product_json', slug: 'knobula-drum-farm', tags: ['status:special-order'] },
    },
    {
      ...normalizedProduct('ST Modular Oberhausen', 'st-modular-oberhausen'),
      rawMeta: { adapter: 'shopify_product_json', slug: 'st-modular-oberhausen', productType: 'Eurorack module', selectedVariantTitle: 'pcb/panel set' },
    },
    {
      ...normalizedProduct('Making Sound Machines Plinky Eurorack Expander Kitbag', 'making-sound-machines-plinky-expander-kitbag'),
      rawMeta: { adapter: 'woocommerce_store_api', slug: 'making-sound-machines-plinky-expander-kitbag' },
    },
    {
      ...normalizedProduct('BOURNS B100K Slide Pot for Trommelmaschine', 'bourns-b100k-slide-pot-for-trommelmaschine'),
      rawMeta: { adapter: 'shopify_product_json', slug: 'bourns-b100k-slide-pot-for-trommelmaschine', productType: 'PARTS', tags: ['Bourns', 'Parts', 'Potentiometers', 'Slider'] },
    },
    {
      ...normalizedProduct('Geiger Counter', 'geiger-counter'),
      rawMeta: { adapter: 'shopify_product_json', slug: 'geiger-counter', vendor: 'WMD', productType: 'Pedal', tags: ['distortion'] },
    },
    {
      ...normalizedProduct('MFX Pedal', 'alm-sb001'),
      rawMeta: { adapter: 'shopify_product_json', slug: 'alm-sb001', vendor: 'ALM', brand: 'ALM Busy Circuits', productType: 'Pedal', tags: [] },
    },
    {
      ...normalizedProduct("Pamela's Disco Slipmat", 'alm-disco-slipmat'),
      rawMeta: { adapter: 'shopify_product_json', slug: 'alm-disco-slipmat', vendor: 'ALM', brand: 'ALM Busy Circuits', productType: '', tags: [] },
    },
  ];

  const matches = matchModulesToProducts(modules, products, { includeIgnored: false });

  assert.equal(matches.length, 0);
});

test('matcher keeps Found Sound preorders but omits used consignment and cover hazards', () => {
  const products = [
    {
      ...normalizedProduct('WMD Modbox MKII Dual LFO Eurorack Module', '42592'),
      availability: 'preorder',
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: '42592',
        productType: 'NEW',
        tags: ['brand-new', 'eurorack', 'preorder'],
        matchNoiseText: 'NEW brand-new eurorack',
        ignoredMatchNoiseTags: ['preorder'],
      },
    },
    {
      ...normalizedProduct('Befaco 1U STMix Eurorack Mixer Module', '42424'),
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: '42424',
        productType: 'USED',
        tags: ['consignment', 'second-hand', 'eurorack'],
      },
    },
    {
      ...normalizedProduct('Decksaver Oxi Instruments Oxi One MK2 Cover', '40924'),
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: '40924',
        productType: 'NEW',
        tags: ['brand-new', 'keyboard-and-synth-covers'],
      },
    },
    {
      ...normalizedProduct('Make Noise 0-CTRL Power Adapter', '9928'),
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: '9928',
        productType: 'NEW',
        tags: ['brand-new', 'eurorack'],
        matchNoiseText: 'NEW brand-new eurorack',
      },
    },
    {
      ...normalizedProduct('Tiptop Audio Mr. Shorty 12cm Orange Stackcable (each)', '40617'),
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: '40617',
        productType: 'NEW',
        tags: ['brand-new', 'eurorack'],
        matchNoiseText: 'NEW brand-new eurorack',
      },
    },
  ];
  const modules = [
    { id: 'modbox-id', name: 'Modbox MKII', manufacturerName: 'WMD' },
    { id: 'stmix-id', name: '1U STMix', manufacturerName: 'Befaco' },
    { id: 'oxi-one-id', name: 'Oxi One MK2', manufacturerName: 'Oxi Instruments' },
    { id: 'zero-ctrl-id', name: '0-CTRL', manufacturerName: 'Make Noise' },
    { id: 'm-id', name: 'M', manufacturerName: 'Tiptop Audio' },
  ];

  const matches = matchModulesToProducts(modules, products, { includeIgnored: false });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].moduleId, 'modbox-id');
  assert.equal(matches[0].productUrl, 'https://store.test/product/42592/');
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

  test('crawls recursive custom product sitemaps and normalizes metadata pages', async () => {
    const requestedUrls = [];
    const productUrl = 'https://machineroom.com.ua/product/erica-synths-black-sequencer/';
    const ignoredPageUrl = 'https://machineroom.com.ua/page/about/';

    const crawl = await crawlPriceHubStoreCatalog(machineroomStore, {
      maxProducts: 1,
      fetchFn: async (url) => {
        requestedUrls.push(url);
        if (url.endsWith('/sitemap_index.xml')) {
          return textResponse(`<sitemapindex><sitemap><loc>https://machineroom.com.ua/product-sitemap1.xml</loc></sitemap></sitemapindex>`);
        }
        if (url.endsWith('/product-sitemap1.xml')) {
          return textResponse(`<urlset><url><loc>${ignoredPageUrl}</loc></url><url><loc>${productUrl}</loc></url></urlset>`);
        }

        return textResponse(productMetadataPage({
          name: 'Black Sequencer - MachineRoom',
          url: productUrl,
          price: '550',
          currency: 'EUR',
          availability: 'instock',
        }));
      },
    });

    assert.equal(crawl.products.length, 1);
    assert.deepEqual(requestedUrls, [
      'https://machineroom.com.ua/sitemap_index.xml',
      'https://machineroom.com.ua/product-sitemap1.xml',
      productUrl,
    ]);
    assert.equal(crawl.products[0].rawMeta.adapter, 'custom');
    assert.equal(crawl.products[0].priceAmountMinor, 55000);
    assert.equal(crawl.products[0].currency, 'EUR');
    assert.equal(crawl.products[0].availability, 'in_stock');
    assert.equal(crawl.products[0].productName, 'Black Sequencer');
  });

  test('normalizes JSON-LD product offers for custom metadata stores', async () => {
    const productUrl = 'https://www.milkaudiostore.com/it/shop/noise-engineering-horologic-solum-silver/';
    const crawl = await crawlPriceHubStoreCatalog(milkAudioStore, {
      maxProducts: 1,
      fetchFn: async (url) => {
        if (url.endsWith('/product-sitemap_index.xml')) {
          return textResponse(`<sitemapindex><sitemap><loc>https://www.milkaudiostore.com/sitemaps/it/product-sitemap_it.xml</loc></sitemap></sitemapindex>`);
        }
        if (url.endsWith('/sitemaps/it/product-sitemap_it.xml')) {
          return textResponse(`<urlset><url><loc>${productUrl}</loc></url></urlset>`);
        }

        return textResponse(jsonLdProductPage({
          name: 'Noise Engineering Horologic Solum (Silver)',
          url: productUrl,
          price: '129.00',
          currency: 'EUR',
          availability: 'https://schema.org/InStock',
          image: 'https://www.milkaudiostore.com/horologic.jpg',
          sku: 'NE-HS-SILVER',
          brand: 'Noise Engineering',
        }));
      },
    });

    assert.equal(crawl.products.length, 1);
    assert.equal(crawl.products[0].rawMeta.adapter, 'custom');
    assert.equal(crawl.products[0].priceAmountMinor, 12900);
    assert.equal(crawl.products[0].currency, 'EUR');
    assert.equal(crawl.products[0].availability, 'in_stock');
    assert.equal(crawl.products[0].productName, 'Noise Engineering Horologic Solum (Silver)');
    assert.equal(crawl.products[0].imageUrl, 'https://www.milkaudiostore.com/horologic.jpg');
    assert.equal(crawl.products[0].rawMeta.sku, 'NE-HS-SILVER');
    assert.equal(crawl.products[0].rawMeta.brand, 'Noise Engineering');
  });

  test('detects Milk Audio order-only product badges as backorder availability', async () => {
    const productUrl = 'https://www.milkaudiostore.com/it/shop/2hp-3-1-black/';
    const crawl = await crawlPriceHubStoreCatalog(milkAudioStore, {
      maxProducts: 1,
      fetchFn: async (url) => {
        if (url.endsWith('/product-sitemap_index.xml')) {
          return textResponse(`<sitemapindex><sitemap><loc>https://www.milkaudiostore.com/sitemaps/product-sitemap_it.xml</loc></sitemap></sitemapindex>`);
        }
        if (url.endsWith('/sitemaps/product-sitemap_it.xml')) {
          return textResponse(`<urlset><url><loc>${productUrl}</loc></url></urlset>`);
        }

        return textResponse(jsonLdProductPage({
          name: '2hp 3:1 Black',
          url: productUrl,
          price: '94.50',
          currency: 'EUR',
          image: 'https://www.milkaudiostore.com/2hp-3-1-black.jpg',
          brand: '2hp',
          body: `
            <li class="tag me-2 mb-1 text-uppercase">Su ordinazione</li>
            <button id="buttonAddToCart" type="button">Aggiungi al carrello</button>
          `,
        }));
      },
    });

    assert.equal(crawl.products.length, 1);
    assert.equal(crawl.products[0].availability, 'backorder');
    assert.equal(crawl.products[0].rawMeta.pageAvailabilityText, 'Su ordinazione');
  });

  test('detects Milk Audio available product badges as in-stock availability', async () => {
    const productUrl = 'https://www.milkaudiostore.com/it/shop/2hp-buff-black/';
    const crawl = await crawlPriceHubStoreCatalog(milkAudioStore, {
      maxProducts: 1,
      fetchFn: async (url) => {
        if (url.endsWith('/product-sitemap_index.xml')) {
          return textResponse(`<sitemapindex><sitemap><loc>https://www.milkaudiostore.com/sitemaps/product-sitemap_it.xml</loc></sitemap></sitemapindex>`);
        }
        if (url.endsWith('/sitemaps/product-sitemap_it.xml')) {
          return textResponse(`<urlset><url><loc>${productUrl}</loc></url></urlset>`);
        }

        return textResponse(jsonLdProductPage({
          name: '2hp Buff Black',
          url: productUrl,
          price: '62.20',
          currency: 'EUR',
          image: 'https://www.milkaudiostore.com/2hp-buff-black.jpg',
          brand: '2hp',
          body: `
            <noscript>Disponibile pagamento rateale con Alma</noscript>
            <li class="tag me-2 mb-1 text-uppercase">Disponibile</li>
            <button id="buttonAddToCart" type="button">Aggiungi al carrello</button>
          `,
        }));
      },
    });

    assert.equal(crawl.products.length, 1);
    assert.equal(crawl.products[0].availability, 'in_stock');
    assert.equal(crawl.products[0].rawMeta.pageAvailabilityText, 'Disponibile');
  });

  test('uses custom metadata product brand tags and strips catalog SKU suffixes', async () => {
    const productUrl = 'https://www.exploding-shed.com/333modules-4xlfo/100425';
    const crawl = await crawlPriceHubStoreCatalog(readApprovedPriceHubStore('exploding-shed'), {
      maxProducts: 1,
      fetchFn: async (url) => {
        if (url.endsWith('/sitemap.xml')) {
          return textResponse(`<urlset><url><loc>${productUrl}</loc></url></urlset>`);
        }

        return textResponse(productMetadataPage({
          name: '333modules - 4xLFO | 100425',
          url: productUrl,
          price: '101.15',
          currency: 'EUR',
          availability: 'In stock',
          body: '<meta property="product:brand" content="333modules">',
        }));
      },
    });

    assert.equal(crawl.products.length, 1);
    assert.equal(crawl.products[0].productName, '333modules - 4xLFO');
    assert.equal(crawl.products[0].rawMeta.brand, '333modules');
  });

  test('strips Escape From Noise store suffix from custom product titles', async () => {
    const productUrl = 'https://escapefromnoise.com/en/modular/2hp-31.html';
    const crawl = await crawlPriceHubStoreCatalog(readApprovedPriceHubStore('escape-from-noise'), {
      maxProducts: 1,
      fetchFn: async (url) => {
        if (url.endsWith('/sitemap.xml')) {
          return textResponse(`<urlset><url><loc>${productUrl}</loc></url></urlset>`);
        }

        return textResponse(productMetadataPage({
          name: '2HP 3:1 - Escape from Noise',
          url: productUrl,
          price: '67.80',
          currency: 'EUR',
          availability: 'http://schema.org/OutOfStock',
        }));
      },
    });

    assert.equal(crawl.products.length, 1);
    assert.equal(crawl.products[0].productName, '2HP 3:1');
    assert.equal(crawl.products[0].availability, 'out_of_stock');
  });

  test('uses Martin Pas modular category products and strips storefront suffixes', async () => {
    const productUrl = 'https://www.martinpas.com/products/make-noise/0-coast';
    const crawl = await crawlPriceHubStoreCatalog(martinPasStore, {
      maxProducts: 1,
      fetchFn: async (url) => {
        if (url.endsWith('/categories/modular-systems')) {
          return textResponse(`
            <html>
              <a href="/products/make-noise">Make Noise brand page</a>
              <a href="${productUrl}">0-Coast</a>
            </html>
          `);
        }

        return textResponse(`
          <!doctype html>
          <html>
            <head>
              <meta property="og:url" content="${productUrl}">
              <meta property="og:title" content="0-Coast by Make Noise | Shop 0-Coast desktop and synthesizers | Martin Pas">
              <meta property="og:image" content="https://www.martinpas.com/0-coast.jpg">
              <script type="application/ld+json">
                ${JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'Product',
                  name: '0-Coast by Make Noise | Shop 0-Coast desktop and synthesizers | Martin Pas',
                  url: productUrl,
                  image: 'https://www.martinpas.com/0-coast.jpg',
                  brand: { '@type': 'Brand', name: 'Make Noise' },
                  productID: 'MN-0COAST',
                  offers: {
                    '@type': 'Offer',
                    price: null,
                    priceCurrency: 'EUR',
                    availability: 'https://schema.org/InStock',
                  },
                })}
              </script>
            </head>
            <body>
              <script>self.__next_f.push([1, '{"price":55500,"reducedPrice":49900}'])</script>
            </body>
          </html>
        `);
      },
    });

    assert.equal(crawl.products.length, 1);
    assert.equal(crawl.products[0].currency, 'EUR');
    assert.equal(crawl.products[0].priceAmountMinor, 49900);
    assert.equal(crawl.products[0].availability, 'in_stock');
    assert.equal(crawl.products[0].productName, '0-Coast');
    assert.equal(crawl.products[0].rawMeta.brand, 'Make Noise');
  });

  test('crawls configured custom category pages for Turnlab product links', async () => {
    const productUrl = 'https://www.turnlab.be/make-noise-maths-2.html';
    const pageTwoUrl = 'https://www.turnlab.be/keys-synths/synths/modular-synths/eurorack/page2.html';
    const requestedUrls = [];
    const crawl = await crawlPriceHubStoreCatalog(turnlabStore, {
      maxProducts: 1,
      fetchFn: async (url) => {
        requestedUrls.push(url);
        if (url.endsWith('/eurorack/')) {
          return textResponse(`
            <html>
              <a href="{{link}}">Template placeholder</a>
              <a href="${pageTwoUrl}">2</a>
              <a href="https://www.turnlab.be/service/about/">About</a>
            </html>
          `);
        }
        if (url === pageTwoUrl) {
          return textResponse(`<html><a href="${productUrl}">Make Noise Maths</a></html>`);
        }

        return textResponse(`
          <!doctype html>
          <html>
            <head>
              <meta property="og:url" content="${productUrl}?source=facebook">
              <meta property="og:title" content="Make Noise Maths">
              <meta itemprop="priceCurrency" content="EUR">
              <meta itemprop="price" content="299.00">
              <meta itemprop="brand" content="Make Noise">
            </head>
            <body>
              <form action="https://www.turnlab.be/cart/add/123/" method="post">
                <a title="Add to cart">Add to cart</a>
              </form>
            </body>
          </html>
        `);
      },
    });

    assert.equal(crawl.products.length, 1);
    assert.deepEqual(requestedUrls, [
      'https://www.turnlab.be/keys-synths/synths/modular-synths/eurorack/',
      pageTwoUrl,
      productUrl,
    ]);
    assert.equal(crawl.products[0].currency, 'EUR');
    assert.equal(crawl.products[0].priceAmountMinor, 29900);
    assert.equal(crawl.products[0].availability, 'in_stock');
    assert.equal(crawl.products[0].productUrl, productUrl);
    assert.equal(crawl.products[0].rawMeta.brand, 'Make Noise');
  });

  test('detects Turnlab popup add-to-cart state as in stock', async () => {
    const productUrl = 'https://www.turnlab.be/make-noise-maths-2.html';
    const crawl = await crawlPriceHubStoreCatalog(turnlabStore, {
      maxProducts: 1,
      fetchFn: async (url) => {
        if (url.endsWith('/eurorack/')) {
          return textResponse(`<html><a href="${productUrl}">Make Noise Maths 2</a></html>`);
        }

        return textResponse(`
          <!doctype html>
          <html>
            <head>
              <meta property="og:url" content="${productUrl}">
              <meta property="og:title" content="Make Noise Maths 2">
              <meta itemprop="priceCurrency" content="EUR">
              <meta itemprop="price" content="329.00">
              <meta itemprop="brand" content="Make Noise">
            </head>
            <body>
              <span class="subtitle-product-popup">
                <i class="sutitle-product-popup-icon green fa fa-check"></i> Add to cart
              </span>
            </body>
          </html>
        `);
      },
    });

    assert.equal(crawl.products.length, 1);
    assert.equal(crawl.products[0].availability, 'in_stock');
    assert.equal(crawl.products[0].rawMeta.pageAvailabilityText, 'In stock');
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

test('preserves Signal Sounds out-of-stock page text when Randem inventory is missing', async () => {
  const productUrl = 'https://www.signalsounds.com/acl-audio-interface-eurorack-module';
  const crawl = await crawlPriceHubStoreCatalog(signalUkStore, {
    maxProducts: 1,
    fetchFn: async (url) => {
      if (url.includes('xmlsitemap.php')) {
        return textResponse(`<urlset><url><loc>${productUrl}</loc></url></urlset>`);
      }

      if (url.includes('api.randemretail.online')) {
        return textResponse(JSON.stringify({ perSKU: [] }));
      }

      return textResponse(bigCommerceProductPage({
        name: 'ACL Audio Interface Eurorack Module',
        url: productUrl,
        price: '408',
        currency: 'GBP',
        availability: 'instock',
        sku: 'ACL01',
        body: '<div class="buy-widget">Out of stock</div>',
      }));
    },
  });

  assert.equal(crawl.products.length, 1);
  assert.equal(crawl.products[0].availability, 'out_of_stock');
  assert.equal(crawl.products[0].rawMeta.ogAvailability, 'instock');
  assert.equal(crawl.products[0].rawMeta.pageAvailabilityText, 'Out of stock');
  assert.equal(crawl.products[0].rawMeta.signalSoundsAvailabilitySource, 'randem_location_api_missing');
  assert.equal(crawl.products[0].rawMeta.signalSoundsStoreExternalId, 'HQ');
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

test('stops Shopware product fetches once capped output is satisfied', async () => {
  const requestedUrls = [];
  const sitemapUrl = 'https://schneidersladen.de/en/sitemap/salesChannel/large-sitemap.xml.gz';
  const productUrl = 'https://schneidersladen.de/en/make-noise-maths-2-silver';
  const unfetchedProductUrls = Array.from({ length: 5000 }, (_, index) => `https://schneidersladen.de/en/unfetched-product-${index}`);
  const productSitemap = `
    <urlset>
      <url><loc>${productUrl}</loc></url>
      ${unfetchedProductUrls.map((url) => `<url><loc>${url}</loc></url>`).join('')}
    </urlset>
  `;

  const crawl = await crawlPriceHubStoreCatalog(schneidersStore, {
    maxProducts: 1,
    metadataConcurrency: 6,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      if (url.endsWith('/sitemap.xml')) {
        return textResponse(`<sitemapindex><sitemap><loc>${sitemapUrl}</loc></sitemap></sitemapindex>`);
      }

      if (url.endsWith('.xml.gz')) {
        return bytesResponse(gzipSync(productSitemap));
      }

      assert.equal(url, productUrl);
      return textResponse(shopwareProductPage({
        name: 'Make Noise Maths 2 (Silber) - SchneidersLaden',
        url: productUrl,
        price: '329',
        currency: 'EUR',
        productId: '019364372943708b8d06c198957c90c7',
      }));
    },
  });

  assert.equal(crawl.products.length, 1);
  assert.equal(crawl.totalProductUrls, 1);
  assert.deepEqual(requestedUrls, [
    'https://schneidersladen.de/en/sitemap.xml',
    sitemapUrl,
    productUrl,
  ]);
});

test('dedupes Shopware sitemap URLs before fetching product pages', async () => {
  const requestedUrls = [];
  const sitemapUrl = 'https://schneidersladen.de/en/sitemap/salesChannel/duplicate-sitemap.xml.gz';
  const firstProductUrl = 'https://schneidersladen.de/en/make-noise-maths-2-silver';
  const secondProductUrl = 'https://schneidersladen.de/en/intellijel-quad-vca';
  const productSitemap = `
    <urlset>
      <url><loc>${firstProductUrl}</loc></url>
      <url><loc>${firstProductUrl}</loc></url>
      <url><loc>${secondProductUrl}</loc></url>
    </urlset>
  `;

  const crawl = await crawlPriceHubStoreCatalog(schneidersStore, {
    maxProducts: 2,
    metadataConcurrency: 6,
    fetchFn: async (url) => {
      requestedUrls.push(url);
      if (url.endsWith('/sitemap.xml')) {
        return textResponse(`<sitemapindex><sitemap><loc>${sitemapUrl}</loc></sitemap></sitemapindex>`);
      }

      if (url.endsWith('.xml.gz')) {
        return bytesResponse(gzipSync(productSitemap));
      }

      return textResponse(shopwareProductPage({
        name: url === firstProductUrl ? 'Make Noise Maths 2 (Silber) - SchneidersLaden' : 'Intellijel Quad VCA - SchneidersLaden',
        url,
        price: url === firstProductUrl ? '329' : '189',
        currency: 'EUR',
        productId: url === firstProductUrl ? '019364372943708b8d06c198957c90c7' : '019364372943708b8d06c198957c90c8',
      }));
    },
  });

  assert.equal(crawl.products.length, 2);
  assert.equal(crawl.totalProductUrls, 2);
  assert.deepEqual(requestedUrls, [
    'https://schneidersladen.de/en/sitemap.xml',
    sitemapUrl,
    firstProductUrl,
    secondProductUrl,
  ]);
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

test('matcher uses Shopify vendor metadata as manufacturer support', () => {
  const products = [
    {
      ...normalizedProduct('Tangle Quartet', 'products/tangle-quartet'),
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: 'tangle-quartet',
        vendor: 'ALM Busy Circuits',
        productType: 'Module',
        tags: ['eurorack'],
      },
    },
    {
      ...normalizedProduct('Maths black panel kit', 'make-noise-maths-black-panel-kit'),
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: 'make-noise-maths-black-panel-kit',
        vendor: 'Make Noise',
        productType: 'Accessory',
        tags: ['panel'],
      },
    },
  ];
  const modules = [
    { id: 'tangle-id', name: 'Tangle Quartet', manufacturerName: 'ALM Busy Circuits' },
    { id: 'maths-id', name: 'Maths', manufacturerName: 'Make Noise' },
  ];

  const matches = matchModulesToProducts(modules, products, { includeIgnored: false });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].moduleId, 'tangle-id');
  assert.equal(matches[0].status, 'strong_candidate');
  assert.equal(matches[0].reasons.includes('manufacturer phrase found in product brand'), true);
  assert.equal(matches[0].reasons.includes('vendor-backed exact module title'), true);
});

test('matcher treats ALM product vendor metadata as ALM Busy Circuits manufacturer support', () => {
  const matches = matchModulesToProducts([
    { id: 'fmco-id', name: 'FMco', manufacturerName: 'ALM Busy Circuits' },
  ], [
    {
      ...normalizedProduct('ALM FMco VCO & Voice Eurorack Module', 'alm-fmco-vco-voice-eurorack-module'),
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: 'alm-fmco-vco-voice-eurorack-module',
        vendor: 'ALM',
        productType: 'Eurorack Module',
        tags: ['eurorack'],
      },
    },
  ], { includeIgnored: false });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].moduleId, 'fmco-id');
  assert.equal(matches[0].status, 'strong_candidate');
  assert.equal(matches[0].score >= 0.86, true);
  assert.equal(matches[0].reasons.includes('manufacturer phrase found in product brand'), true);
  assert.equal(matches[0].reasons.includes('vendor-backed exact module title'), true);
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

test('matcher omits pre-owned and frontpanel variants during full catalog runs', () => {
  const products = [
    normalizedProduct('Doepfer A-111-3 Precision VCO Eurorack Module (Pre-owned)', 'doepfer-a-111-3-precision-vco-eurorack-module-pre-owned'),
    normalizedProduct('XAOC Devices Batumi II Black Frontpanel', 'xaoc-devices-batumi-ii-black-frontpanel'),
    normalizedProduct('Doepfer A-111-3 Precision VCO Eurorack Module', 'doepfer-a-111-3-precision-vco-eurorack-module'),
  ];
  const modules = [
    { id: 'vco-id', name: 'A-111-3', manufacturerName: 'Doepfer' },
    { id: 'batumi-id', name: 'Batumi II', manufacturerName: 'XAOC Devices' },
  ];

  const matches = matchModulesToProducts(modules, products, { includeIgnored: false });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].moduleId, 'vco-id');
  assert.equal(matches[0].productUrl, 'https://store.test/product/doepfer-a-111-3-precision-vco-eurorack-module/');
});

test('matcher omits Shopify used and consignment products from raw metadata', () => {
  const products = [
    {
      ...normalizedProduct('Make Noise Maths', 'make-noise-maths-used'),
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: 'make-noise-maths-used',
        productType: 'Used Gear',
        tags: ['consignment'],
      },
    },
    {
      ...normalizedProduct('Make Noise Maths', 'make-noise-maths'),
      rawMeta: {
        adapter: 'shopify_product_json',
        slug: 'make-noise-maths',
        productType: 'Module',
        tags: ['In Stock'],
      },
    },
  ];
  const modules = [{ id: 'maths-id', name: 'Maths', manufacturerName: 'Make Noise' }];

  const matches = matchModulesToProducts(modules, products, { includeIgnored: false });

  assert.equal(matches.length, 1);
  assert.equal(matches[0].productUrl, 'https://store.test/product/make-noise-maths/');
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

test('matcher does not treat HP width text as compact module code aliases', () => {
  const matches = matchModulesToProducts([
    { id: 'blank-panel-id', name: 'Blank Panel 2HP', manufacturerName: 'Verbos Electronics' },
  ], [
    {
      ...normalizedProduct('Black Box 42HP', 'verbos-electronics-black-box-42hp'),
      rawMeta: { adapter: 'custom', slug: 'black-box-42hp', brand: 'Verbos Electronics' },
    },
  ], { includeIgnored: false });

  assert.equal(matches.length, 0);
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

function shopifyProduct({ id = 1, title, handle, vendor, productType, tags, variants }) {
  return {
    id,
    title,
    handle,
    vendor,
    product_type: productType,
    tags,
    variants,
    images: [{ src: 'https://cdn.shopify.com/fractalist.jpg' }],
  };
}

function bigCommerceProductPage({ name, url, price, currency, availability, image = 'https://cdn.test/image.jpg', sku = null, body = '' }) {
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
      <body>${body}</body>
    </html>
  `;
}

function productMetadataPage({ name, url, price, currency, availability, image = 'https://cdn.test/image.jpg', body = '' }) {
  return `
    <!doctype html>
    <html>
      <head>
        <title>${name}</title>
        <meta property="product:price:amount" content="${price}">
        <meta property="product:price:currency" content="${currency}">
        <meta property="product:availability" content="${availability}">
        <meta property="og:url" content="${url}">
        <meta property="og:title" content="${name}">
        <meta property="og:image" content="${image}">
      </head>
      <body>${body}</body>
    </html>
  `;
}

function jsonLdProductPage({ name, url, price, currency, availability, image, sku, brand, body = '' }) {
  return `
    <!doctype html>
    <html>
      <head>
        <script type="application/ld+json">
          ${JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Product',
            name,
            url,
            image,
            sku,
            ...(brand ? { additionalProperty: [{ '@type': 'PropertyValue', name: 'pa_brand', value: brand }] } : {}),
            offers: {
              '@type': 'Offer',
              price,
              priceCurrency: currency,
              availability,
            },
          })}
        </script>
      </head>
      <body>${body}</body>
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
