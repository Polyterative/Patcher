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
