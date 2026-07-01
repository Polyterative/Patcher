import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  assertSnapshotWorkerAuthorized,
  backoffDaysForFailureCount,
  buildFailureUpdate,
  buildWooCommerceStoreApiUrl,
  normalizeErrorMessage,
  parseProbeListingInput,
  readSnapshotLimit,
  readSnapshotWorkerMode,
  SnapshotWorkerInputError,
} from '../../supabase/functions/_shared/price-hub/snapshot-worker.ts';

const baseListing = {
  product_url: 'https://www.elevatorsound.com/product/make-noise-maths/?utm_source=ignored',
  external_product_id: null,
  external_handle: null,
  failure_count: 0,
  verification_status: 'verified',
  stores: {
    base_url: 'https://www.elevatorsound.com/shop/',
  },
};

test('reads snapshot limit with default lower bound and hard cap', () => {
  assert.equal(readSnapshotLimit('https://worker.test/snapshot-store-listings'), 20);
  assert.equal(readSnapshotLimit('https://worker.test/snapshot-store-listings?limit=0'), 1);
  assert.equal(readSnapshotLimit('https://worker.test/snapshot-store-listings?limit=-9'), 1);
  assert.equal(readSnapshotLimit('https://worker.test/snapshot-store-listings?limit=7'), 7);
  assert.equal(readSnapshotLimit('https://worker.test/snapshot-store-listings?limit=999'), 20);
  assert.equal(readSnapshotLimit('https://worker.test/snapshot-store-listings?limit=7.5'), 20);
  assert.equal(readSnapshotLimit('https://worker.test/snapshot-store-listings?limit=abc'), 20);
});

test('detects local-only probe mode from the request URL', () => {
  assert.equal(readSnapshotWorkerMode('https://worker.test/snapshot-store-listings'), 'scheduled');
  assert.equal(readSnapshotWorkerMode('https://worker.test/snapshot-store-listings?mode=probe'), 'probe');
});

test('parses probe input into DB-free listing shape', () => {
  const input = parseProbeListingInput({
    storeBaseUrl: ' https://www.elevatorsound.com/shop/ ',
    productUrl: 'https://www.elevatorsound.com/product/make-noise-maths/',
    externalProductId: 12254,
    externalHandle: ' make-noise-maths ',
  });

  assert.deepEqual(input, {
    product_url: 'https://www.elevatorsound.com/product/make-noise-maths/',
    external_product_id: '12254',
    external_handle: 'make-noise-maths',
    failure_count: 0,
    verification_status: 'candidate',
    stores: {
      base_url: 'https://www.elevatorsound.com/shop/',
    },
  });
});

test('rejects invalid probe input instead of guessing defaults', () => {
  assert.throws(() => parseProbeListingInput(null), SnapshotWorkerInputError);
  assert.throws(() => parseProbeListingInput({ productUrl: 'https://example.test/product' }), /storeBaseUrl/);
  assert.throws(() => parseProbeListingInput({ storeBaseUrl: 'https://example.test' }), /productUrl/);
  assert.throws(() => parseProbeListingInput({
    storeBaseUrl: 'file:///not-http',
    productUrl: 'https://example.test/product',
  }), /https/);
  assert.throws(() => parseProbeListingInput({
    storeBaseUrl: 'https://127.0.0.1',
    productUrl: 'https://example.test/product',
  }), /approved pilot store host/);
  assert.throws(() => parseProbeListingInput({
    storeBaseUrl: 'https://example.test',
    productUrl: 'https://example.test/product',
  }), /approved pilot store host/);
  assert.throws(() => parseProbeListingInput({
    storeBaseUrl: 'https://www.elevatorsound.com',
    productUrl: 'not a url',
  }), /absolute HTTP\(S\) URL/);
  assert.throws(() => parseProbeListingInput({
    storeBaseUrl: 'https://www.elevatorsound.com',
    productUrl: 'https://example.test/product',
    externalHandle: {},
  }), /externalHandle/);
});

test('builds WooCommerce Store API product URL from external product id first', () => {
  const url = buildWooCommerceStoreApiUrl({
    ...baseListing,
    external_product_id: '  sku/123  ',
    external_handle: 'ignored-slug',
  });

  assert.equal(url, 'https://www.elevatorsound.com/wp-json/wc/store/v1/products/sku%2F123');
});

test('builds WooCommerce Store API search URL from external handle', () => {
  const url = new URL(buildWooCommerceStoreApiUrl({
    ...baseListing,
    external_handle: 'make-noise-maths',
  }));

  assert.equal(url.origin, 'https://www.elevatorsound.com');
  assert.equal(url.pathname, '/wp-json/wc/store/v1/products');
  assert.equal(url.searchParams.get('slug'), 'make-noise-maths');
  assert.equal(url.searchParams.get('per_page'), '5');
});

test('builds WooCommerce Store API search URL from product URL slug safely', () => {
  const url = new URL(buildWooCommerceStoreApiUrl(baseListing));

  assert.equal(url.searchParams.get('slug'), 'make-noise-maths');
  assert.equal(url.searchParams.get('per_page'), '5');
});

test('omits WooCommerce slug when product URL has no safe slug', () => {
  const url = new URL(buildWooCommerceStoreApiUrl({
    ...baseListing,
    product_url: 'not a url',
  }));

  assert.equal(url.searchParams.get('slug'), null);
  assert.equal(url.searchParams.get('per_page'), '5');
});

test('auth token check fails closed when missing or mismatched', () => {
  assert.doesNotThrow(() => assertSnapshotWorkerAuthorized('secret-token', 'Bearer secret-token'));
  assert.throws(() => assertSnapshotWorkerAuthorized(undefined, 'Bearer secret-token'), /Missing PRICE_HUB_SNAPSHOT_TOKEN/);
  assert.throws(() => assertSnapshotWorkerAuthorized('', 'Bearer secret-token'), /Missing PRICE_HUB_SNAPSHOT_TOKEN/);
  assert.throws(() => assertSnapshotWorkerAuthorized('secret-token', null), /Unauthorized/);
  assert.throws(() => assertSnapshotWorkerAuthorized('secret-token', 'Bearer wrong-token'), /Unauthorized/);
});

test('failure updates use bounded backoff and mark stale at threshold', () => {
  const checkedAt = '2026-07-01T10:00:00.000Z';
  const nowMs = Date.parse(checkedAt);

  assert.equal(backoffDaysForFailureCount(1), 1);
  assert.equal(backoffDaysForFailureCount(2), 3);
  assert.equal(backoffDaysForFailureCount(3), 7);
  assert.equal(backoffDaysForFailureCount(4), 7);

  assert.deepEqual(buildFailureUpdate(baseListing, checkedAt, 'fetch failed', nowMs), {
    last_checked_at: checkedAt,
    next_check_at: '2026-07-02T10:00:00.000Z',
    failure_count: 1,
    last_error: 'fetch failed',
    verification_status: 'verified',
    updated_at: checkedAt,
  });

  const staleUpdate = buildFailureUpdate({
    ...baseListing,
    failure_count: 3,
    verification_status: 'verified',
  }, checkedAt, 'fetch failed', nowMs);

  assert.equal(staleUpdate.next_check_at, '2026-07-08T10:00:00.000Z');
  assert.equal(staleUpdate.failure_count, 4);
  assert.equal(staleUpdate.verification_status, 'stale');
});

test('normalizes and clips error messages', () => {
  assert.equal(normalizeErrorMessage(new Error('  timed\nout  ')), 'timed out');
  assert.equal(normalizeErrorMessage(''), 'Unknown error');
  assert.equal(normalizeErrorMessage('123456', 3), '123');
});
