import type { NormalizedStoreListingSnapshot } from '../../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { ApprovedPriceHubStoreConfig } from '../store-configs.ts';
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  abortResponse,
  fetchWithTimeout,
  fetchResponseWithTimeout,
  isRecord,
  readBooleanOrNull,
  readJsonResponse,
  readNumberOrNull,
  readPositiveInteger,
  readStringOrNull,
} from './helpers.ts';
import type { PriceHubFetch } from './types.ts';

export async function applySignalSoundsInventoryOverrides(
  store: ApprovedPriceHubStoreConfig,
  products: readonly NormalizedStoreListingSnapshot[],
  fetchFn: PriceHubFetch,
  fetchTimeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<NormalizedStoreListingSnapshot[]> {
  const resolvedFetchTimeoutMs = readPositiveInteger(fetchTimeoutMs, DEFAULT_FETCH_TIMEOUT_MS, 'fetchTimeoutMs');
  const skus = uniqueStrings(products.map(readSignalSoundsProductSku));
  const inventoryBySku = new Map<string, SignalSoundsInventory>();

  for (let index = 0; index < skus.length; index += SIGNAL_SOUNDS_RANDEM_BATCH_SIZE) {
    const batchSkus = skus.slice(index, index + SIGNAL_SOUNDS_RANDEM_BATCH_SIZE);
    const batchInventory = await fetchSignalSoundsInventoryBatch(store, batchSkus, fetchFn, resolvedFetchTimeoutMs);
    for (const inventory of batchInventory) {
      inventoryBySku.set(inventory.sku, inventory);
    }
  }

  return products.map((product) => {
    const sku = readSignalSoundsProductSku(product);
    if (!sku) {
      return {
        ...product,
        availability: readSignalSoundsFallbackAvailability(product),
        rawMeta: {
          ...product.rawMeta,
          signalSoundsAvailabilitySource: 'missing_sku',
        },
      };
    }

    const inventory = inventoryBySku.get(sku);
    if (!inventory) {
      return {
        ...product,
        availability: readSignalSoundsFallbackAvailability(product),
        rawMeta: {
          ...product.rawMeta,
          signalSoundsAvailabilitySource: 'randem_location_api_missing',
          signalSoundsStoreExternalId: readSignalSoundsTargetStoreExternalId(store),
        },
      };
    }

    return {
      ...product,
      availability: inventory.availability,
      rawMeta: {
        ...product.rawMeta,
        signalSoundsAvailabilitySource: 'randem_location_api',
        signalSoundsStoreExternalId: inventory.storeExternalId,
        signalSoundsInventoryQuantity: inventory.quantity,
        signalSoundsInventoryLocations: inventory.locations,
      },
    };
  });
}


export function isSignalSoundsStore(store: ApprovedPriceHubStoreConfig): boolean {
  return store.slug === 'signal-sounds-uk' || store.slug === 'signal-sounds-eu';
}

function readSignalSoundsTargetStoreExternalId(store: ApprovedPriceHubStoreConfig): string {
  return store.slug === 'signal-sounds-eu' ? 'SS Europe' : 'HQ';
}

function readSignalSoundsFallbackAvailability(
  product: NormalizedStoreListingSnapshot,
): NormalizedStoreListingSnapshot['availability'] {
  return isSignalSoundsTerminalPageAvailability(product.availability)
    ? product.availability
    : 'unknown';
}

function isSignalSoundsTerminalPageAvailability(
  availability: NormalizedStoreListingSnapshot['availability'],
): boolean {
  return availability === 'out_of_stock' || availability === 'discontinued';
}

function readSignalSoundsProductSku(product: NormalizedStoreListingSnapshot): string | null {
  const sku = product.rawMeta.sku;
  return typeof sku === 'string' && sku.trim().length > 0 ? sku.trim() : null;
}

async function fetchSignalSoundsInventoryBatch(
  store: ApprovedPriceHubStoreConfig,
  skus: readonly string[],
  fetchFn: PriceHubFetch,
  fetchTimeoutMs: number,
): Promise<SignalSoundsInventory[]> {
  if (skus.length === 0) {
    return [];
  }

  try {
    const response = await fetchResponseWithTimeout(
      fetchFn,
      'https://api.randemretail.online/public/api/location',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=UTF-8',
          'referer': store.baseUrl,
          'x-randem-application-id': SIGNAL_SOUNDS_RANDEM_APPLICATION_ID,
        },
        body: JSON.stringify({ SKUs: skus.map((sku) => ({ SKU: sku, quantity: '1' })), selectedStoreId: null }),
      },
      fetchTimeoutMs,
      `Signal Sounds inventory batch fetch for ${store.slug}`,
    );
    if (!response.ok) {
      throw new Error(`Signal Sounds inventory batch fetch failed for ${store.slug}: ${response.status} ${response.statusText}`);
    }

    const body = await fetchWithTimeout(
      readJsonResponse(response, `Signal Sounds inventory batch response for ${store.slug}`),
      fetchTimeoutMs,
      `Signal Sounds inventory batch response for ${store.slug}`,
      (error) => abortResponse(response, error),
    );
    const rows = readSignalSoundsInventoryRows(body);
    return skus
      .map((sku) => readSignalSoundsInventoryFromRows(store, sku, rows))
      .filter((inventory): inventory is SignalSoundsInventory => inventory !== null);
  } catch (error) {
    console.warn(error instanceof Error ? error.message : String(error));
    return [];
  }
}

function uniqueStrings(values: readonly (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => value !== null))).sort();
}

function readSignalSoundsInventoryFromRows(
  store: ApprovedPriceHubStoreConfig,
  sku: string,
  rows: readonly SignalSoundsInventoryRow[],
): SignalSoundsInventory | null {
  const targetStoreExternalId = readSignalSoundsTargetStoreExternalId(store);
  const skuRows = rows.filter((row) => row.sku === sku);
  if (skuRows.length === 0) {
    return null;
  }

  const targetRows = skuRows.filter((row) => row.storeExternalId === targetStoreExternalId);
  const shippableRows = skuRows.filter(isSignalSoundsShippableInventoryRow);
  const availabilityRows = shippableRows.length > 0 ? shippableRows : targetRows;
  if (availabilityRows.length === 0) {
    return null;
  }

  const quantities = availabilityRows
    .map((row) => row.quantity)
    .filter((quantity): quantity is number => quantity !== null);
  const quantity = quantities.length > 0 ? quantities.reduce((total, current) => total + current, 0) : null;
  const tracksInventory = availabilityRows.some((row) => row.inventoryTrackingType !== null && row.inventoryTrackingType !== 0);
  const availability = quantity !== null && quantity > 0
    ? 'in_stock'
    : tracksInventory
      ? 'out_of_stock'
      : 'unknown';
  const storeExternalId = readSignalSoundsInventoryStoreExternalId(
    availability === 'in_stock' ? availabilityRows.filter((row) => (row.quantity ?? 0) > 0) : targetRows,
    targetStoreExternalId,
  );

  return {
    sku,
    availability,
    storeExternalId,
    quantity,
    locations: skuRows.map((row) => ({
      storeExternalId: row.storeExternalId,
      storeName: row.storeName,
      quantity: row.quantity,
      shippingAllowed: isSignalSoundsShippableInventoryRow(row),
    })),
  };
}

function isSignalSoundsShippableInventoryRow(row: SignalSoundsInventoryRow): boolean {
  return row.locationAllowShipping !== false && row.productAllowShipping !== false;
}

function readSignalSoundsInventoryStoreExternalId(rows: readonly SignalSoundsInventoryRow[], fallback: string): string {
  const externalIds = uniqueStrings(rows.map((row) => row.storeExternalId));
  return externalIds.length > 0 ? externalIds.join(',') : fallback;
}

interface SignalSoundsInventory {
  sku: string;
  availability: NormalizedStoreListingSnapshot['availability'];
  storeExternalId: string;
  quantity: number | null;
  locations: SignalSoundsInventoryLocation[];
}

interface SignalSoundsInventoryLocation {
  storeExternalId: string | null;
  storeName: string | null;
  quantity: number | null;
  shippingAllowed: boolean;
}

interface SignalSoundsInventoryRow {
  sku: string | null;
  storeExternalId: string | null;
  storeName: string | null;
  quantity: number | null;
  inventoryTrackingType: number | null;
  locationAllowShipping: boolean | null;
  productAllowShipping: boolean | null;
}

function readSignalSoundsInventoryRows(body: unknown): SignalSoundsInventoryRow[] {
  if (!isRecord(body) || !Array.isArray(body.perSKU)) {
    return [];
  }

  return body.perSKU
    .filter(isRecord)
    .map((row) => ({
      sku: readStringOrNull(row.sku),
      storeExternalId: readStringOrNull(row.storeExternalId) ?? readStringOrNull(row.storeName),
      storeName: readStringOrNull(row.storeName),
      quantity: readNumberOrNull(row.quantity),
      inventoryTrackingType: readNumberOrNull(row.inventoryTrackingType),
      locationAllowShipping: readBooleanOrNull(row.locationAllowShipping),
      productAllowShipping: readBooleanOrNull(row.productAllowShipping),
    }))
    .filter((row) => row.sku !== null && row.storeExternalId !== null);
}

const SIGNAL_SOUNDS_RANDEM_APPLICATION_ID = '5a9c3766-6d6c-4237-8965-9968f2572106';
const SIGNAL_SOUNDS_RANDEM_BATCH_SIZE = 50;
