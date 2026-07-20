import {
  buildManufacturerActivityRank,
  MANUFACTURER_ANALYTICS_THRESHOLDS,
  buildManufacturerAnalyticsSummary,
  buildManufacturerModuleStats,
  compareManufacturersByLatestModuleActivity,
  maskManufacturerAnalyticsMetric,
  parseModuleUpdatedTimestampMs,
  withManufacturerModuleStats
} from './supabase-queries.manufacturer-stats';


describe('supabase manufacturer stats helpers', () => {
  it('builds first-seen activity rank by manufacturer id', () => {
    const rank = buildManufacturerActivityRank([
      {manufacturerId: 7, updated: '2026-06-12T00:00:00Z'},
      {manufacturerId: 9, updated: '2026-06-11T00:00:00Z'},
      {manufacturerId: 7, updated: '2026-06-10T00:00:00Z'},
      {manufacturerId: null, updated: '2026-06-09T00:00:00Z'}
    ]);

    expect(rank.get(7)).toBe(0);
    expect(rank.get(9)).toBe(1);
    expect(rank.has(null as unknown as number)).toBeFalse();
  });

  it('parses PostgreSQL timestamp variants', () => {
    expect(parseModuleUpdatedTimestampMs('2026-06-14 12:00:00.123456+0000')).toBeGreaterThan(0);
    expect(parseModuleUpdatedTimestampMs('')).toBeNull();
    expect(parseModuleUpdatedTimestampMs(null)).toBeNull();
  });

  it('builds module stats and preserves manufacturer fields when enriching', () => {
    const statsByManufacturer = buildManufacturerModuleStats([
      {manufacturerId: 7, updated: new Date().toISOString()},
      {manufacturerId: 7, updated: '2026-01-01T00:00:00Z'}
    ]);

    const enriched = withManufacturerModuleStats(
      {id: 7, name: 'Make Noise', websiteURL: 'https://example.com'},
      statsByManufacturer.get(7)
    );

    expect(enriched.name).toBe('Make Noise');
    expect(enriched.websiteURL).toBe('https://example.com');
    expect(enriched.moduleCount).toBe(2);
    expect(enriched.latestModuleUpdatedAt).toBeTruthy();
  });

  it('sorts manufacturers with active modules before empty manufacturers', () => {
    const rank = new Map<number, number>([[2, 0], [1, 1]]);
    const sorted = [
      {id: 3, name: 'Empty B'},
      {id: 1, name: 'Second'},
      {id: 2, name: 'First'},
      {id: 4, name: 'Empty A'}
    ].sort((a, b) => compareManufacturersByLatestModuleActivity(a, b, rank));

    expect(sorted.map(item => item.id)).toEqual([2, 1, 4, 3]);
  });

  it('masks manufacturer analytics metrics below privacy thresholds', () => {
    const hidden = maskManufacturerAnalyticsMetric('views', MANUFACTURER_ANALYTICS_THRESHOLDS.views - 1);

    expect(hidden.state).toBe('hidden');
    expect(hidden.value).toBeUndefined();
    expect(hidden.copy).toContain(`at least ${MANUFACTURER_ANALYTICS_THRESHOLDS.views}`);
  });

  it('shows only aggregate manufacturer analytics metrics at or above thresholds', () => {
    const visible = maskManufacturerAnalyticsMetric('outboundClicks', 12.8);

    expect(visible).toEqual({
      copy: 'Aggregate total only; no user-level detail is exposed.',
      key: 'outboundClicks',
      label: 'Outbound clicks',
      state: 'visible',
      value: 12
    });
  });

  it('builds privacy-safe manufacturer analytics summaries without ownership detail', () => {
    const summary = buildManufacturerAnalyticsSummary({
      collectionAdds: 4,
      outboundClicks: 5,
      publicPatchUses: 3,
      publicRackUses: 1,
      views: 10
    });

    expect(summary.visibleMetricCount).toBe(3);
    expect(summary.metrics.filter(metric => metric.state === 'hidden').map(metric => metric.value)).toEqual([
      undefined,
      undefined
    ]);
    expect(summary.privacyCopy).toContain('User-level ownership');
    expect(summary.privacyCopy).toContain('private rack or patch detail stays hidden');
  });
});
