import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  planSnapshotWrites,
  readEndpointUpdateSnapshotIds,
  readInsertListingIds,
} from '../../supabase/functions/_shared/price-hub/snapshot-change-planner.ts';

function observation(listingId, overrides = {}) {
  return {
    listingId,
    priceAmountMinor: 42500,
    currency: 'EUR',
    availability: 'in_stock',
    ...overrides,
  };
}

function snapshotRow(id, listingId, observedAt, overrides = {}) {
  return {
    id,
    listing_id: listingId,
    observed_at: observedAt,
    price_amount_minor: 42500,
    currency: 'EUR',
    availability: 'in_stock',
    ...overrides,
  };
}

test('first-ever crawl inserts a segment start', () => {
  const plan = planSnapshotWrites([observation(1)], []);

  assert.deepEqual(plan.decisions, [{ kind: 'insert_start', listingId: 1 }]);
  assert.deepEqual(plan.duplicateListingIds, []);
});

test('changed price inserts a new segment start', () => {
  const plan = planSnapshotWrites(
    [observation(1, { priceAmountMinor: 39900 })],
    [snapshotRow(10, 1, '2026-08-01T00:00:00+00:00')],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'insert_start', listingId: 1 }]);
});

test('changed availability alone breaks the segment', () => {
  const plan = planSnapshotWrites(
    [observation(1, { availability: 'out_of_stock' })],
    [
      snapshotRow(10, 1, '2026-08-01T00:00:00+00:00'),
      snapshotRow(11, 1, '2026-08-05T00:00:00+00:00'),
    ],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'insert_start', listingId: 1 }]);
});

test('changed currency alone breaks the segment', () => {
  const plan = planSnapshotWrites(
    [observation(1, { currency: 'USD' })],
    [snapshotRow(10, 1, '2026-08-01T00:00:00+00:00')],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'insert_start', listingId: 1 }]);
});

test('unchanged observation after a lone start inserts the endpoint row', () => {
  const plan = planSnapshotWrites(
    [observation(1)],
    [snapshotRow(10, 1, '2026-08-01T00:00:00+00:00')],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'insert_endpoint', listingId: 1 }]);
});

test('unchanged observation after start plus endpoint bumps the endpoint in place', () => {
  const plan = planSnapshotWrites(
    [observation(1)],
    [
      snapshotRow(10, 1, '2026-08-01T00:00:00+00:00'),
      snapshotRow(11, 1, '2026-08-05T00:00:00+00:00'),
    ],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'update_endpoint', listingId: 1, snapshotId: 11 }]);
  assert.deepEqual(readEndpointUpdateSnapshotIds(plan), [11]);
  assert.deepEqual(readInsertListingIds(plan), []);
});

test('lone start after a different older segment inserts the endpoint row', () => {
  const plan = planSnapshotWrites(
    [observation(1, { priceAmountMinor: 39900 })],
    [
      snapshotRow(10, 1, '2026-08-01T00:00:00+00:00'),
      snapshotRow(11, 1, '2026-08-05T00:00:00+00:00', { price_amount_minor: 39900 }),
    ],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'insert_endpoint', listingId: 1 }]);
});

test('A→B→A price flip starts a new segment instead of resurrecting the old one', () => {
  const plan = planSnapshotWrites(
    [observation(1, { priceAmountMinor: 42500 })],
    [
      snapshotRow(10, 1, '2026-08-01T00:00:00+00:00', { price_amount_minor: 42500 }),
      snapshotRow(11, 1, '2026-08-05T00:00:00+00:00', { price_amount_minor: 39900 }),
    ],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'insert_start', listingId: 1 }]);
});

test('sorts existing rows internally by observed_at then id', () => {
  const plan = planSnapshotWrites(
    [observation(1)],
    [
      snapshotRow(11, 1, '2026-08-05T00:00:00+00:00'),
      snapshotRow(10, 1, '2026-08-01T00:00:00+00:00'),
    ],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'update_endpoint', listingId: 1, snapshotId: 11 }]);
});

test('same observed_at falls back to id ordering', () => {
  const plan = planSnapshotWrites(
    [observation(1)],
    [
      snapshotRow(10, 1, '2026-08-05T00:00:00+00:00'),
      snapshotRow(11, 1, '2026-08-05T00:00:00+00:00'),
    ],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'update_endpoint', listingId: 1, snapshotId: 11 }]);
});

test('null price and currency compare null-safe', () => {
  const plan = planSnapshotWrites(
    [observation(1, { priceAmountMinor: null, currency: null })],
    [
      snapshotRow(10, 1, '2026-08-01T00:00:00+00:00', { price_amount_minor: null, currency: null }),
      snapshotRow(11, 1, '2026-08-05T00:00:00+00:00', { price_amount_minor: null, currency: null }),
    ],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'update_endpoint', listingId: 1, snapshotId: 11 }]);
});

test('pre-backfill daily history still bumps only the latest row', () => {
  const plan = planSnapshotWrites(
    [observation(1)],
    [
      snapshotRow(20, 1, '2026-08-03T00:00:00+00:00'),
      snapshotRow(21, 1, '2026-08-04T00:00:00+00:00'),
    ],
  );

  assert.deepEqual(plan.decisions, [{ kind: 'update_endpoint', listingId: 1, snapshotId: 21 }]);
});

test('plans multiple listings independently and dedupes in-batch duplicates', () => {
  const plan = planSnapshotWrites(
    [
      observation(1),
      observation(2, { priceAmountMinor: 19900 }),
      observation(1, { priceAmountMinor: 1 }),
      observation(3),
    ],
    [
      snapshotRow(10, 1, '2026-08-01T00:00:00+00:00'),
      snapshotRow(11, 1, '2026-08-05T00:00:00+00:00'),
      snapshotRow(20, 2, '2026-08-05T00:00:00+00:00'),
    ],
  );

  assert.deepEqual(plan.decisions, [
    { kind: 'update_endpoint', listingId: 1, snapshotId: 11 },
    { kind: 'insert_start', listingId: 2 },
    { kind: 'insert_start', listingId: 3 },
  ]);
  assert.deepEqual(plan.duplicateListingIds, [1]);
  assert.deepEqual(readInsertListingIds(plan), [2, 3]);
});
