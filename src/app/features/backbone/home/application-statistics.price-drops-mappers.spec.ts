import type {MinimalModule} from 'src/app/models/module';
import type {PriceDropHistorySnapshot} from '../../backend/module-price-drops.utils';
import {mapPriceDropsSection} from './application-statistics.price-drops-mappers';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildSnapshot(overrides: Partial<PriceDropHistorySnapshot> & {moduleId: number}): PriceDropHistorySnapshot {
  return {
    id: overrides.id ?? 1,
    listingId: overrides.listingId ?? 1,
    storeId: overrides.storeId ?? 1,
    moduleId: overrides.moduleId,
    observedAt: overrides.observedAt ?? daysAgo(30),
    priceAmountMinor: overrides.priceAmountMinor ?? 40000,
    currency: overrides.currency ?? 'EUR',
    availability: overrides.availability ?? 'in_stock',
    source: overrides.source ?? 'api'
  };
}

function buildModule(id: number, name: string, manufacturerName: string): MinimalModule {
  return {
    id,
    name,
    description: '',
    hp: 10,
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    manufacturerId: id,
    manufacturer: {id, name: manufacturerName},
    standard: {id: 0, name: '3U Doepfer'},
    tags: [],
    panels: []
  };
}

function dropHistory(moduleId: number): PriceDropHistorySnapshot[] {
  return [
    buildSnapshot({moduleId, id: moduleId * 10 + 1, storeId: 1, observedAt: daysAgo(50), priceAmountMinor: 40000}),
    buildSnapshot({moduleId, id: moduleId * 10 + 2, storeId: 2, observedAt: daysAgo(38), priceAmountMinor: 39500}),
    buildSnapshot({moduleId, id: moduleId * 10 + 3, storeId: 1, observedAt: daysAgo(18), priceAmountMinor: 36000}),
    buildSnapshot({moduleId, id: moduleId * 10 + 4, storeId: 1, observedAt: daysAgo(7), priceAmountMinor: 34000})
  ];
}

describe('mapPriceDropsSection', () => {
  it('suppresses with the thin-history note when nothing is tracked', () => {
    const section = mapPriceDropsSection([], new Map());
    expect(section.suppressed).toBeTrue();
    expect(section.trackedCount).toBe(0);
    expect(section.dropCount).toBe(0);
    expect(section.topDrop).toBeNull();
    expect(section.takeaway).toContain('Not enough price history yet');
  });

  it('suppresses with the filtered-out note when history exists but no drop is reliable', () => {
    const section = mapPriceDropsSection([
      buildSnapshot({moduleId: 8, id: 1, observedAt: daysAgo(30), priceAmountMinor: 30000}),
      buildSnapshot({moduleId: 8, id: 2, observedAt: daysAgo(10), priceAmountMinor: 30000})
    ], new Map());
    expect(section.suppressed).toBeTrue();
    expect(section.trackedCount).toBe(1);
    expect(section.dropCount).toBe(0);
    expect(section.topDrop).toBeNull();
    expect(section.takeaway).toContain('No reliable price drops');
  });

  it('maps the biggest reliable drop with the public module name attached', () => {
    const section = mapPriceDropsSection(
      dropHistory(5),
      new Map([[5, buildModule(5, 'Maths', 'Intellijel')]])
    );
    expect(section.suppressed).toBeFalse();
    expect(section.trackedCount).toBe(1);
    expect(section.dropCount).toBe(1);
    expect(section.takeaway).toContain('1 tracked module dropped reliably');
    expect(section.topDrop).toEqual(jasmine.objectContaining({
      moduleId: 5,
      name: 'Maths',
      manufacturerName: 'Intellijel',
      dropLabel: '↓15%',
      priceRangeLabel: '~€400 → ~€340',
      storeCount: 2
    }));
    expect(section.topDrop?.module?.name).toBe('Maths');
  });

  it('falls back to module id and unknown maker when the drop module is unnamed', () => {
    const section = mapPriceDropsSection(dropHistory(5), new Map());
    expect(section.suppressed).toBeFalse();
    expect(section.topDrop?.name).toBe('Module 5');
    expect(section.topDrop?.manufacturerName).toBe('Unknown maker');
    expect(section.topDrop?.module).toBeUndefined();
  });

  it('counts plural drops and leads with the biggest one', () => {
    const steep: PriceDropHistorySnapshot[] = [
      buildSnapshot({moduleId: 9, id: 91, storeId: 1, observedAt: daysAgo(50), priceAmountMinor: 50000}),
      buildSnapshot({moduleId: 9, id: 92, storeId: 2, observedAt: daysAgo(38), priceAmountMinor: 48000}),
      buildSnapshot({moduleId: 9, id: 93, storeId: 1, observedAt: daysAgo(18), priceAmountMinor: 40000}),
      buildSnapshot({moduleId: 9, id: 94, storeId: 1, observedAt: daysAgo(7), priceAmountMinor: 35000})
    ];
    const section = mapPriceDropsSection(
      [...dropHistory(5), ...steep],
      new Map([
        [5, buildModule(5, 'Maths', 'Intellijel')],
        [9, buildModule(9, 'Disting', 'Expert Sleepers')]
      ])
    );
    expect(section.suppressed).toBeFalse();
    expect(section.dropCount).toBe(2);
    expect(section.takeaway).toContain('2 tracked modules dropped reliably');
    expect(section.topDrop?.moduleId).toBe(9);
  });
});
