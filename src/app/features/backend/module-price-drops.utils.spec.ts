import {
  buildPriceDropSummaries,
  formatPriceDropPercent,
  formatPriceDropRange,
  getReliablePriceDrops,
  groupPriceDropSnapshotsByModule,
  isReliablePriceDropSummary,
  PRICE_DROP_MIN_PRICE_EUR_MINOR,
  PriceDropHistorySnapshot
} from './module-price-drops.utils';
import type {ModuleSparsePriceHistorySummary} from './supabase-queries.models';

function buildSnapshot(overrides: Partial<PriceDropHistorySnapshot> = {}): PriceDropHistorySnapshot {
  return {
    id: overrides.id ?? 1,
    listingId: overrides.listingId ?? 1,
    storeId: overrides.storeId ?? 1,
    moduleId: overrides.moduleId ?? 42,
    observedAt: overrides.observedAt ?? '2026-07-01T00:00:00.000Z',
    priceAmountMinor: overrides.priceAmountMinor ?? 40000,
    currency: overrides.currency ?? 'EUR',
    availability: overrides.availability ?? 'in_stock',
    source: overrides.source ?? 'api'
  };
}

function buildSummary(overrides: Partial<ModuleSparsePriceHistorySummary> = {}): ModuleSparsePriceHistorySummary {
  return {
    moduleId: overrides.moduleId ?? 42,
    eligiblePointCount: overrides.eligiblePointCount ?? 4,
    storeCount: overrides.storeCount ?? 2,
    earliestObservedAt: overrides.earliestObservedAt ?? '2026-05-15T00:00:00.000Z',
    latestObservedAt: overrides.latestObservedAt ?? '2026-07-01T00:00:00.000Z',
    earliestPriceEurMinor: overrides.earliestPriceEurMinor ?? 40000,
    latestPriceEurMinor: overrides.latestPriceEurMinor ?? 34000,
    minPriceEurMinor: overrides.minPriceEurMinor ?? 34000,
    maxPriceEurMinor: overrides.maxPriceEurMinor ?? 40000,
    trendPercent: overrides.trendPercent ?? -15,
    trendDirection: overrides.trendDirection ?? 'down',
    label: overrides.label ?? '↓15% 60d',
    rangeLabel: overrides.rangeLabel ?? '~€340–€400',
    tooltip: overrides.tooltip ?? 'tooltip'
  };
}

describe('module-price-drops utils', () => {
  it('accepts a well-evidenced mid-size drop', () => {
    expect(isReliablePriceDropSummary(buildSummary())).toBeTrue();
  });

  it('rejects noise below 5% and absurd drops above 60%', () => {
    expect(isReliablePriceDropSummary(buildSummary({trendPercent: -3, trendDirection: 'down'}))).toBeFalse();
    expect(isReliablePriceDropSummary(buildSummary({trendPercent: -75, trendDirection: 'down'}))).toBeFalse();
  });

  it('rejects non-drop directions', () => {
    expect(isReliablePriceDropSummary(buildSummary({trendDirection: 'up', trendPercent: 12}))).toBeFalse();
    expect(isReliablePriceDropSummary(buildSummary({trendDirection: 'flat', trendPercent: 0}))).toBeFalse();
  });

  it('rejects cheap and zero prices as likely unit errors', () => {
    expect(isReliablePriceDropSummary(buildSummary({
      earliestPriceEurMinor: 1500,
      latestPriceEurMinor: 1200,
      minPriceEurMinor: 1200,
      maxPriceEurMinor: 1500
    }))).toBeFalse();
    expect(isReliablePriceDropSummary(buildSummary({minPriceEurMinor: 0}))).toBeFalse();
    expect(isReliablePriceDropSummary(buildSummary({
      earliestPriceEurMinor: PRICE_DROP_MIN_PRICE_EUR_MINOR,
      latestPriceEurMinor: PRICE_DROP_MIN_PRICE_EUR_MINOR,
      minPriceEurMinor: PRICE_DROP_MIN_PRICE_EUR_MINOR,
      maxPriceEurMinor: PRICE_DROP_MIN_PRICE_EUR_MINOR,
      trendPercent: -10
    }))).toBeTrue();
  });

  it('requires corroboration: single anecdotal 2-point single-store blips are suppressed', () => {
    expect(isReliablePriceDropSummary(buildSummary({eligiblePointCount: 2, storeCount: 1}))).toBeFalse();
    expect(isReliablePriceDropSummary(buildSummary({eligiblePointCount: 2, storeCount: 2}))).toBeTrue();
    expect(isReliablePriceDropSummary(buildSummary({eligiblePointCount: 3, storeCount: 1}))).toBeTrue();
  });

  it('rejects intraday blips and mixed-variant ranges', () => {
    expect(isReliablePriceDropSummary(buildSummary({
      earliestObservedAt: '2026-07-01T00:00:00.000Z',
      latestObservedAt: '2026-07-02T00:00:00.000Z'
    }))).toBeFalse();
    expect(isReliablePriceDropSummary(buildSummary({minPriceEurMinor: 10000, maxPriceEurMinor: 40000}))).toBeFalse();
  });

  it('sorts reliable drops biggest-first', () => {
    const drops = getReliablePriceDrops([
      buildSummary({moduleId: 1, trendPercent: -8}),
      buildSummary({moduleId: 2, trendPercent: -25}),
      buildSummary({moduleId: 3, trendPercent: -3, trendDirection: 'down'}),
      buildSummary({moduleId: 4, trendPercent: 10, trendDirection: 'up'})
    ]);
    expect(drops.map((drop) => drop.summary.moduleId)).toEqual([2, 1]);
  });

  it('groups snapshots by module and skips invalid ids', () => {
    const grouped = groupPriceDropSnapshotsByModule([
      buildSnapshot({moduleId: 1, id: 1}),
      buildSnapshot({moduleId: 1, id: 2}),
      buildSnapshot({moduleId: 2, id: 3}),
      buildSnapshot({moduleId: -5, id: 4}),
      buildSnapshot({moduleId: NaN, id: 5})
    ]);
    expect(grouped.get(1)?.length).toBe(2);
    expect(grouped.get(2)?.length).toBe(1);
    expect(grouped.has(-5)).toBeFalse();
  });

  it('formats drop percents as rounded down-arrows', () => {
    expect(formatPriceDropPercent(-15)).toBe('↓15%');
    expect(formatPriceDropPercent(-15.6)).toBe('↓16%');
    expect(formatPriceDropPercent(-5)).toBe('↓5%');
  });

  it('formats drop ranges as estimated EUR before → after', () => {
    expect(formatPriceDropRange(buildSummary())).toBe('~€400 → ~€340');
  });

  it('builds one summary per module with enough history and skips thin groups', () => {
    const referenceDate = new Date('2026-07-01T00:00:00.000Z');
    const summaries = buildPriceDropSummaries(new Map([
      [1, [
        buildSnapshot({moduleId: 1, id: 1, observedAt: '2026-05-15T00:00:00.000Z', priceAmountMinor: 40000}),
        buildSnapshot({moduleId: 1, id: 2, observedAt: '2026-06-01T00:00:00.000Z', priceAmountMinor: 38000}),
        buildSnapshot({moduleId: 1, id: 3, observedAt: '2026-06-25T00:00:00.000Z', priceAmountMinor: 34000})
      ]],
      [2, [
        buildSnapshot({moduleId: 2, id: 4, observedAt: '2026-06-25T00:00:00.000Z', priceAmountMinor: 30000})
      ]]
    ]), referenceDate);
    expect(summaries.map((summary) => summary.moduleId)).toEqual([1]);
    expect(summaries[0]?.eligiblePointCount).toBe(3);
  });
});
