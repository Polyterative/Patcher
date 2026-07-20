import {
  DEFAULT_MANUFACTURER_ANALYTICS_PRIVACY_THRESHOLD,
  MANUFACTURER_ANALYTICS_HIDDEN_COPY,
  MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE,
  MANUFACTURER_ANALYTICS_METRIC_COPY,
  MANUFACTURER_ANALYTICS_METRIC_IDS,
  normalizeManufacturerAnalyticsRows
} from './manufacturer-analytics.utils';

describe('manufacturer-analytics.utils', () => {
  it('normalizes available whitelisted metrics with public display copy only', () => {
    const result = normalizeManufacturerAnalyticsRows([
      { metricId: 'views', count: 15 },
      { metric_id: 'outbound_clicks', count: 3000 },
      { metric: 'collection_count', value: 7 },
      { metricId: 'public_rack_count', total: 5 },
      { metricId: 'public_patch_count', count: 3.9 }
    ]);

    expect(result).toEqual([
      {
        count: 15,
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.views.description,
        displayValue: '15',
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.views.label,
        metricId: 'views',
        state: 'available'
      },
      {
        count: 3000,
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.outbound_clicks.description,
        displayValue: '3,000',
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.outbound_clicks.label,
        metricId: 'outbound_clicks',
        state: 'available'
      },
      {
        count: 7,
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.collection_count.description,
        displayValue: '7',
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.collection_count.label,
        metricId: 'collection_count',
        state: 'available'
      },
      {
        count: 5,
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.public_rack_count.description,
        displayValue: '5',
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.public_rack_count.label,
        metricId: 'public_rack_count',
        state: 'available'
      },
      {
        count: 3,
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.public_patch_count.description,
        displayValue: '3',
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.public_patch_count.label,
        metricId: 'public_patch_count',
        state: 'available'
      }
    ]);
    expect(MANUFACTURER_ANALYTICS_METRIC_IDS).toEqual([
      'views',
      'outbound_clicks',
      'collection_count',
      'public_rack_count',
      'public_patch_count'
    ]);
  });

  it('floors decimal counts before applying the default privacy threshold', () => {
    expect(DEFAULT_MANUFACTURER_ANALYTICS_PRIVACY_THRESHOLD).toBe(3);

    expect(normalizeManufacturerAnalyticsRows([
      { metricId: 'views', count: 2.9 },
      { metricId: 'outbound_clicks', count: 3.1 }
    ])).toEqual([
      {
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.views.description,
        displayValue: MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE,
        hiddenCopy: MANUFACTURER_ANALYTICS_HIDDEN_COPY,
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.views.label,
        metricId: 'views',
        state: 'hidden'
      },
      {
        count: 3,
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.outbound_clicks.description,
        displayValue: '3',
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.outbound_clicks.label,
        metricId: 'outbound_clicks',
        state: 'available'
      }
    ]);
  });

  it('hides below-threshold counts with generic copy instead of exact counts', () => {
    const result = normalizeManufacturerAnalyticsRows([
      { metricId: 'views', count: 0 },
      { metricId: 'outbound_clicks', count: 1 },
      { metricId: 'collection_count', count: 2 }
    ]);

    expect(result).toEqual([
      {
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.views.description,
        displayValue: MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE,
        hiddenCopy: MANUFACTURER_ANALYTICS_HIDDEN_COPY,
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.views.label,
        metricId: 'views',
        state: 'hidden'
      },
      {
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.outbound_clicks.description,
        displayValue: MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE,
        hiddenCopy: MANUFACTURER_ANALYTICS_HIDDEN_COPY,
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.outbound_clicks.label,
        metricId: 'outbound_clicks',
        state: 'hidden'
      },
      {
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.collection_count.description,
        displayValue: MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE,
        hiddenCopy: MANUFACTURER_ANALYTICS_HIDDEN_COPY,
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.collection_count.label,
        metricId: 'collection_count',
        state: 'hidden'
      }
    ]);

    expect(JSON.stringify(result)).not.toContain('"count"');
    expect(JSON.stringify(result)).not.toContain('1');
    expect(JSON.stringify(result)).not.toContain('2');
  });

  it('supports a configurable minimum privacy threshold', () => {
    expect(normalizeManufacturerAnalyticsRows([
      { metricId: 'views', count: 4 },
      { metricId: 'outbound_clicks', count: 5 }
    ], { minimumPrivacyThreshold: 5 })).toEqual([
      {
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.views.description,
        displayValue: MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE,
        hiddenCopy: MANUFACTURER_ANALYTICS_HIDDEN_COPY,
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.views.label,
        metricId: 'views',
        state: 'hidden'
      },
      {
        count: 5,
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.outbound_clicks.description,
        displayValue: '5',
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.outbound_clicks.label,
        metricId: 'outbound_clicks',
        state: 'available'
      }
    ]);
  });

  it('excludes malformed rows and invalid numeric counts', () => {
    const malformedValues = [
      null,
      undefined,
      'views',
      3,
      [],
      { metricId: 'views' },
      { metricId: 'views', count: '3' },
      { metricId: 'views', count: -1 },
      { metricId: 'views', count: Number.NaN },
      { metricId: 'views', count: Number.POSITIVE_INFINITY },
      { metricId: 'views', count: Number.NEGATIVE_INFINITY }
    ];

    expect(normalizeManufacturerAnalyticsRows(malformedValues)).toEqual([]);
    expect(normalizeManufacturerAnalyticsRows({ metricId: 'views', count: 10 })).toEqual([]);
  });

  it('excludes unknown metric ids', () => {
    expect(normalizeManufacturerAnalyticsRows([
      { metricId: 'viewer_user_ids', count: 100 },
      { metricId: 'emails', count: 100 },
      { metricId: 'rack_ids', count: 100 },
      { metricId: 'patch_ids', count: 100 },
      { metricId: 'views', count: 100 }
    ])).toEqual([
      {
        count: 100,
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.views.description,
        displayValue: '100',
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.views.label,
        metricId: 'views',
        state: 'available'
      }
    ]);
  });

  it('does not copy private fields, raw payloads, ids, emails, or timestamps into output', () => {
    const result = normalizeManufacturerAnalyticsRows([
      {
        count: 12,
        created_at: '2026-07-08T10:00:00Z',
        email: 'maker@example.com',
        eventPayload: { source: 'email' },
        metricId: 'views',
        patchId: 'patch-1',
        profileId: 'profile-1',
        rackId: 'rack-1',
        raw: { count: 12 },
        timestamp: '2026-07-08T10:00:00Z',
        userId: 'user-1',
        viewerUserIds: ['user-1']
      }
    ]);

    expect(result).toEqual([
      {
        count: 12,
        description: MANUFACTURER_ANALYTICS_METRIC_COPY.views.description,
        displayValue: '12',
        label: MANUFACTURER_ANALYTICS_METRIC_COPY.views.label,
        metricId: 'views',
        state: 'available'
      }
    ]);

    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('maker@example.com');
    expect(serialized).not.toContain('profile-1');
    expect(serialized).not.toContain('rack-1');
    expect(serialized).not.toContain('patch-1');
    expect(serialized).not.toContain('user-1');
    expect(serialized).not.toContain('eventPayload');
    expect(serialized).not.toContain('raw');
    expect(serialized).not.toContain('timestamp');
    expect(serialized).not.toContain('created_at');
  });
});
