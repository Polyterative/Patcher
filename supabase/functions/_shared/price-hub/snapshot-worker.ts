import { slugFromUrl } from './woocommerce-store-api.ts';

export const DEFAULT_SNAPSHOT_LIMIT = 20;
export const MAX_SNAPSHOT_LIMIT = 20;
export const ONE_DAY_MS = 86_400_000;
export const STALE_FAILURE_THRESHOLD = 4;
export const MAX_ERROR_MESSAGE_LENGTH = 500;
export const SUPPORTED_SNAPSHOT_ADAPTER_KINDS = ['woocommerce_store_api', 'shopware_metadata'] as const;
const APPROVED_PROBE_STORE_HOSTS = new Set([
  'elevatorsound.com',
  'www.elevatorsound.com',
  'newgroove.it',
  'www.newgroove.it',
]);

export type SnapshotWorkerMode = 'scheduled' | 'probe';
export type SupportedSnapshotAdapterKind = typeof SUPPORTED_SNAPSHOT_ADAPTER_KINDS[number];

export interface StoreApiListingInput {
  product_url: string;
  external_product_id: string | null;
  external_handle: string | null;
  failure_count: number;
  verification_status: string;
  stores: {
    base_url: string;
  };
}

export interface FailureUpdate {
  last_checked_at: string;
  next_check_at: string;
  failure_count: number;
  last_error: string;
  verification_status: string;
  updated_at: string;
}

export class SnapshotWorkerInputError extends Error {
  constructor(message: string) {
    super(normalizeErrorMessage(message));
    this.name = 'SnapshotWorkerInputError';
  }
}

export function readSnapshotLimit(url: string, defaultLimit = DEFAULT_SNAPSHOT_LIMIT, maxLimit = MAX_SNAPSHOT_LIMIT): number {
  const limitParam = new URL(url).searchParams.get('limit');
  if (limitParam === null || !/^-?\d+$/.test(limitParam.trim())) {
    return defaultLimit;
  }

  const requested = Number.parseInt(limitParam, 10);
  return Math.min(Math.max(requested, 1), maxLimit);
}

export function readSnapshotWorkerMode(url: string): SnapshotWorkerMode {
  return new URL(url).searchParams.get('mode') === 'probe' ? 'probe' : 'scheduled';
}

export function isSnapshotRefreshAdapterKind(adapterKind: string): adapterKind is SupportedSnapshotAdapterKind {
  return SUPPORTED_SNAPSHOT_ADAPTER_KINDS.includes(adapterKind as SupportedSnapshotAdapterKind);
}

export function parseProbeListingInput(body: unknown): StoreApiListingInput {
  if (!isRecord(body)) {
    throw new SnapshotWorkerInputError('Probe body must be a JSON object.');
  }

  return {
    product_url: readRequiredUrl(body.productUrl, 'productUrl'),
    external_product_id: readOptionalProbeText(body.externalProductId, 'externalProductId'),
    external_handle: readOptionalProbeText(body.externalHandle, 'externalHandle'),
    failure_count: 0,
    verification_status: 'candidate',
    stores: {
      base_url: readRequiredUrl(body.storeBaseUrl, 'storeBaseUrl', { requireApprovedStoreHost: true }),
    },
  };
}

export function assertSnapshotWorkerAuthorized(expectedToken: string | undefined, authorizationHeader: string | null): void {
  if (!expectedToken) {
    throw new Error('Missing PRICE_HUB_SNAPSHOT_TOKEN');
  }

  if (authorizationHeader !== `Bearer ${expectedToken}`) {
    throw new Error('Unauthorized');
  }
}

export function buildWooCommerceStoreApiUrl(listing: StoreApiListingInput): string {
  const externalProductId = normalizeOptionalText(listing.external_product_id);
  if (externalProductId) {
    return new URL(
      `/wp-json/wc/store/v1/products/${encodeURIComponent(externalProductId)}`,
      listing.stores.base_url,
    ).toString();
  }

  const url = new URL('/wp-json/wc/store/v1/products', listing.stores.base_url);
  const slug = normalizeOptionalText(listing.external_handle) ?? slugFromUrl(listing.product_url);
  if (slug) {
    url.searchParams.set('slug', slug);
  }

  url.searchParams.set('per_page', '5');
  return url.toString();
}

export function backoffDaysForFailureCount(failureCount: number): number {
  if (failureCount <= 1) {
    return 1;
  }

  return failureCount === 2 ? 3 : 7;
}

export function buildFailureUpdate(
  listing: StoreApiListingInput,
  checkedAt: string,
  errorMessage: string,
  nowMs = Date.now(),
): FailureUpdate {
  const nextFailureCount = listing.failure_count + 1;

  return {
    last_checked_at: checkedAt,
    next_check_at: new Date(nowMs + backoffDaysForFailureCount(nextFailureCount) * ONE_DAY_MS).toISOString(),
    failure_count: nextFailureCount,
    last_error: normalizeErrorMessage(errorMessage),
    verification_status: nextFailureCount >= STALE_FAILURE_THRESHOLD ? 'stale' : listing.verification_status,
    updated_at: checkedAt,
  };
}

export function normalizeErrorMessage(error: unknown, maxLength = MAX_ERROR_MESSAGE_LENGTH): string {
  const message = error instanceof Error ? error.message : String(error);
  const trimmed = message.replace(/\s+/g, ' ').trim();
  return (trimmed || 'Unknown error').slice(0, maxLength);
}

function normalizeOptionalText(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function readRequiredUrl(
  value: unknown,
  fieldName: string,
  options: { requireApprovedStoreHost?: boolean } = {},
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new SnapshotWorkerInputError(`Probe field "${fieldName}" is required.`);
  }

  const trimmed = value.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new SnapshotWorkerInputError(`Probe field "${fieldName}" must be an absolute HTTP(S) URL.`);
  }

  if (url.protocol !== 'https:') {
    throw new SnapshotWorkerInputError(`Probe field "${fieldName}" must use https.`);
  }

  if (options.requireApprovedStoreHost && !APPROVED_PROBE_STORE_HOSTS.has(url.hostname.toLowerCase())) {
    throw new SnapshotWorkerInputError(`Probe field "${fieldName}" must use an approved pilot store host.`);
  }

  return trimmed;
}

function readOptionalProbeText(value: unknown, fieldName: string): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value !== 'string') {
    throw new SnapshotWorkerInputError(`Probe field "${fieldName}" must be a string when provided.`);
  }

  return normalizeOptionalText(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
