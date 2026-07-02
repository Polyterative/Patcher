import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import {
  chooseWooCommerceProduct,
  normalizeWooCommerceStoreApiProduct,
  slugFromUrl,
} from '../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';

const fixtureBase = new URL('./fixtures/woocommerce-store-api/', import.meta.url);

async function readFixture(name) {
  return JSON.parse(await readFile(new URL(name, fixtureBase), 'utf8'));
}

test('normalizes in-stock WooCommerce Store API product prices and metadata', async () => {
  const product = await readFixture('elevator-sound-in-stock.json');

  const normalized = normalizeWooCommerceStoreApiProduct(product);

  assert.deepEqual(normalized, {
    priceAmountMinor: 28900,
    currency: 'GBP',
    availability: 'in_stock',
    productName: 'Make Noise Maths',
    productUrl: 'https://www.elevatorsound.com/product/make-noise-maths/',
    imageUrl: 'https://www.elevatorsound.com/wp-content/uploads/maths.jpg',
    rawMeta: {
      adapter: 'woocommerce_store_api',
      externalProductId: 12254,
      slug: 'make-noise-maths',
      stockStatus: 'instock',
      stockText: 'In stock',
    },
  });
});

test('normalizes sale price currency and backorder state', async () => {
  const product = await readFixture('new-groove-sale-backorder.json');

  const normalized = normalizeWooCommerceStoreApiProduct(product);

  assert.equal(normalized.priceAmountMinor, 17900);
  assert.equal(normalized.currency, 'EUR');
  assert.equal(normalized.availability, 'backorder');
  assert.equal(normalized.imageUrl, null);
});

test('normalizes hyphenated WooCommerce back-order text before in-stock flags', () => {
  const normalized = normalizeWooCommerceStoreApiProduct({
    id: 24561,
    name: 'Intellijel Multi FX 1U Eurorack Effects Module',
    slug: 'intellijel-multi-fx-1u',
    permalink: 'https://www.elevatorsound.com/product/intellijel-multi-fx-1u/',
    prices: {
      price: '12500',
      currency_code: 'GBP'
    },
    is_in_stock: true,
    stock_status: null,
    stock_availability: {
      text: 'Available on back-order',
      class: 'available-on-backorder'
    },
    images: []
  });

  assert.equal(normalized.availability, 'backorder');
  assert.equal(normalized.rawMeta.stockText, 'Available on back-order');
  assert.equal(normalized.rawMeta.stockClass, 'available-on-backorder');
});

test('preserves WooCommerce taxonomy terms for matching and noise filtering', () => {
  const normalized = normalizeWooCommerceStoreApiProduct({
    id: 16168,
    name: 'Buchla 259t',
    slug: 'buchla-259t',
    permalink: 'https://technosynth.com/produit/buchla-259t/',
    prices: {
      price: '72900',
      currency_code: 'CAD'
    },
    is_in_stock: true,
    stock_status: null,
    stock_availability: {
      text: 'En stock',
      class: 'in-stock'
    },
    categories: [
      {name: 'Eurorack'},
      {name: 'VCO'}
    ],
    tags: [
      {name: 'Tiptop Audio &amp; Buchla'}
    ],
    images: []
  });

  assert.equal(normalized.rawMeta.brand, 'Tiptop Audio & Buchla');
  assert.deepEqual(normalized.rawMeta.tags, ['Eurorack', 'VCO', 'Tiptop Audio & Buchla']);
});

test('uses WooCommerce maker taxonomy categories as brand metadata', () => {
  const normalized = normalizeWooCommerceStoreApiProduct({
    id: 123,
    name: 'MOON',
    sku: 'Landscape_.MOON',
    slug: 'moon',
    permalink: 'https://postmodular.co.uk/modules/moon/',
    prices: {
      price: '34400',
      currency_code: 'GBP'
    },
    is_in_stock: true,
    stock_status: 'instock',
    stock_availability: null,
    brands: [],
    categories: [
      { name: 'Landscape', slug: 'landscape', link: 'https://postmodular.co.uk/makers/landscape/' }
    ],
    tags: [
      { name: 'Passive analogue drum synth', slug: 'passive-analogue-drum-synth', link: 'https://postmodular.co.uk/types/passive-analogue-drum-synth/' }
    ],
    images: []
  });

  assert.equal(normalized.rawMeta.brand, 'Landscape');
  assert.deepEqual(normalized.rawMeta.tags, ['Landscape', 'Passive analogue drum synth']);
});

test('treats zero WooCommerce prices as unknown suspicious data', async () => {
  const product = await readFixture('new-groove-zero-price.json');

  const normalized = normalizeWooCommerceStoreApiProduct(product);

  assert.equal(normalized.priceAmountMinor, null);
  assert.equal(normalized.currency, 'EUR');
  assert.equal(normalized.availability, 'in_stock');
  assert.equal(normalized.rawMeta.priceWasZero, true);
  assert.equal(normalized.rawMeta.priceHtmlEmpty, true);
});

test('matches WooCommerce search results by permalink', async () => {
  const elevatorProduct = await readFixture('elevator-sound-in-stock.json');
  const newGrooveProduct = await readFixture('new-groove-sale-backorder.json');

  const chosen = chooseWooCommerceProduct(
    [elevatorProduct, newGrooveProduct],
    'https://newgroove.it/product/mutable-instruments-plaits/?utm_source=ignored',
  );

  assert.equal(chosen?.id, 9312);
});

test('does not guess a product when WooCommerce search results do not match', async () => {
  const elevatorProduct = await readFixture('elevator-sound-in-stock.json');

  const chosen = chooseWooCommerceProduct(
    [elevatorProduct],
    'https://newgroove.it/product/not-the-same-module/',
  );

  assert.equal(chosen, null);
});

test('extracts canonical slug from product URLs', () => {
  assert.equal(slugFromUrl('https://www.elevatorsound.com/product/make-noise-maths/'), 'make-noise-maths');
  assert.equal(slugFromUrl('not a url'), null);
});
