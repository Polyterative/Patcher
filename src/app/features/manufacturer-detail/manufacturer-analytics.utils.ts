export const MANUFACTURER_ANALYTICS_METRIC_IDS = [
  'views',
  'outbound_clicks',
  'collection_count',
  'public_rack_count',
  'public_patch_count'
] as const;

export type ManufacturerAnalyticsMetricId = typeof MANUFACTURER_ANALYTICS_METRIC_IDS[number];

export interface ManufacturerAnalyticsMetricCopy {
  readonly label: string;
  readonly description: string;
}

export const MANUFACTURER_ANALYTICS_METRIC_COPY: Record<ManufacturerAnalyticsMetricId, ManufacturerAnalyticsMetricCopy> = {
  collection_count: {
    description: 'Public collections that include this manufacturer’s modules.',
    label: 'Collections'
  },
  outbound_clicks: {
    description: 'Clicks from Patcher to public manufacturer or product links.',
    label: 'Outbound clicks'
  },
  public_patch_count: {
    description: 'Public patches using this manufacturer’s modules.',
    label: 'Public patches'
  },
  public_rack_count: {
    description: 'Public racks using this manufacturer’s modules.',
    label: 'Public racks'
  },
  views: {
    description: 'Views of public manufacturer and module pages in Patcher.',
    label: 'Views'
  }
};

export const DEFAULT_MANUFACTURER_ANALYTICS_PRIVACY_THRESHOLD = 3;
export const MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE = 'Hidden for privacy';
export const MANUFACTURER_ANALYTICS_HIDDEN_COPY = 'Not enough aggregate activity to display yet.';

export type ManufacturerAnalyticsMetricState = 'available' | 'hidden';

export interface ManufacturerAnalyticsDisplayRow {
  readonly metricId: ManufacturerAnalyticsMetricId;
  readonly label: string;
  readonly description: string;
  readonly state: ManufacturerAnalyticsMetricState;
  readonly displayValue: string;
  readonly count?: number;
  readonly hiddenCopy?: string;
}

export interface ManufacturerAnalyticsNormalizeOptions {
  readonly minimumPrivacyThreshold?: number;
}

interface ManufacturerAnalyticsAggregateRecord {
  readonly metricId?: unknown;
  readonly metric_id?: unknown;
  readonly metric?: unknown;
  readonly count?: unknown;
  readonly value?: unknown;
  readonly total?: unknown;
}

const METRIC_IDS = new Set<string>(MANUFACTURER_ANALYTICS_METRIC_IDS);

/**
 * Normalizes raw aggregate rows into display-only analytics rows.
 * Decimal numeric counts are floored before privacy-threshold checks so no fractional raw event count is exposed.
 */
export function normalizeManufacturerAnalyticsRows(
  input: unknown,
  options: ManufacturerAnalyticsNormalizeOptions = {}
): readonly ManufacturerAnalyticsDisplayRow[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const minimumPrivacyThreshold = normalizeMinimumPrivacyThreshold(options.minimumPrivacyThreshold);
  const rows: ManufacturerAnalyticsDisplayRow[] = [];

  for (const item of input) {
    const row = normalizeManufacturerAnalyticsRow(item, minimumPrivacyThreshold);
    if (row) {
      rows.push(row);
    }
  }

  return rows;
}

function normalizeManufacturerAnalyticsRow(
  input: unknown,
  minimumPrivacyThreshold: number
): ManufacturerAnalyticsDisplayRow | null {
  const record = asAggregateRecord(input);
  const metricId = normalizeMetricId(record?.metricId ?? record?.metric_id ?? record?.metric);
  const count = normalizeCount(record?.count ?? record?.value ?? record?.total);

  if (!metricId || count === null) {
    return null;
  }

  const copy = MANUFACTURER_ANALYTICS_METRIC_COPY[metricId];

  if (count < minimumPrivacyThreshold) {
    return {
      description: copy.description,
      displayValue: MANUFACTURER_ANALYTICS_HIDDEN_DISPLAY_VALUE,
      hiddenCopy: MANUFACTURER_ANALYTICS_HIDDEN_COPY,
      label: copy.label,
      metricId,
      state: 'hidden'
    };
  }

  return {
    count,
    description: copy.description,
    displayValue: count.toLocaleString('en-US'),
    label: copy.label,
    metricId,
    state: 'available'
  };
}

function asAggregateRecord(value: unknown): ManufacturerAnalyticsAggregateRecord | null {
  return value !== null && typeof value === 'object'
    ? value as ManufacturerAnalyticsAggregateRecord
    : null;
}

function normalizeMetricId(value: unknown): ManufacturerAnalyticsMetricId | null {
  if (typeof value !== 'string' || !METRIC_IDS.has(value)) {
    return null;
  }

  return value as ManufacturerAnalyticsMetricId;
}

function normalizeCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.floor(value);
}

function normalizeMinimumPrivacyThreshold(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return DEFAULT_MANUFACTURER_ANALYTICS_PRIVACY_THRESHOLD;
  }

  return Math.floor(value);
}
