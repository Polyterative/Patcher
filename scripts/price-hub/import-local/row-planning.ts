import type { NormalizedStoreListingSnapshot, SnapshotAvailability } from '../../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { PriceHubMatchCandidate, PriceHubMatchStatus } from '../matcher.ts';

export const DEFAULT_ACCEPTED_STATUSES: readonly PriceHubMatchStatus[] = ['strong_candidate'];

const MIN_REASONABLE_MODULE_PRICE_MINOR = 3000;
const MAX_REASONABLE_MODULE_PRICE_MINOR = 2000000;
const NEXT_CHECK_STAGGER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const NEXT_CHECK_STAGGER_MIN_OFFSET_MS = 1000;

export interface ExistingPriceHubListingReference {
  module_id: number;
  store_id: number;
  product_url: string;
}

export interface FilteredPriceHubSnapshotImportRows {
  rows: PriceHubSnapshotImportRow[];
  skippedConflictingListings: PriceHubSnapshotImportRow[];
}

export interface FilteredPriceHubSnapshotModuleRows {
  rows: PriceHubSnapshotImportRow[];
  skippedUnknownModuleRows: PriceHubSnapshotImportRow[];
}

export interface PriceHubSnapshotImportRow {
  moduleId: number;
  productUrl: string;
  productName: string | null;
  priceAmountMinor: number | null;
  currency: string | null;
  availability: SnapshotAvailability;
  externalProductId: string | null;
  externalHandle: string | null;
  rawMeta: Record<string, unknown>;
}

export interface PriceHubNextCheckIdentity {
  moduleId: number;
  storeId: number;
  productUrl: string;
}

export interface ActivePriceHubListingReference {
  module_id: number;
  product_url: string;
}

export function buildImportRows(
  products: readonly NormalizedStoreListingSnapshot[],
  matches: readonly PriceHubMatchCandidate[],
  acceptedStatuses: readonly PriceHubMatchStatus[] = DEFAULT_ACCEPTED_STATUSES,
): PriceHubSnapshotImportRow[] {
  const productByUrl = new Map(products
    .filter((product) => typeof product.productUrl === 'string' && product.productUrl.trim().length > 0)
    .map((product) => [normalizeComparableUrl(product.productUrl!), product]));
  const rows = matches
    .filter((match) => acceptedStatuses.includes(match.status))
    .map((match) => {
      if (!match.productUrl) {
        return null;
      }
      const product = productByUrl.get(normalizeComparableUrl(match.productUrl));
      if (!product) {
        return null;
      }
      if (
        product.priceAmountMinor === null
        || product.priceAmountMinor < MIN_REASONABLE_MODULE_PRICE_MINOR
        || product.priceAmountMinor > MAX_REASONABLE_MODULE_PRICE_MINOR
        || product.currency === null
      ) {
        return null;
      }
      const moduleId = Number.parseInt(match.moduleId, 10);
      if (!Number.isSafeInteger(moduleId) || moduleId <= 0 || !product.productUrl) {
        return null;
      }
      return {
        moduleId,
        productUrl: product.productUrl,
        productName: product.productName,
        priceAmountMinor: product.priceAmountMinor,
        currency: product.currency,
        availability: product.availability,
        externalProductId: readExternalProductId(product.rawMeta),
        externalHandle: readExternalHandle(product.rawMeta, product.productUrl),
        rawMeta: {
          ...product.rawMeta,
          matchedProductName: match.productName,
          matchedModuleName: match.moduleName,
          matchedManufacturerName: match.manufacturerName,
          matchScore: match.score,
          matchReasons: match.reasons,
        },
      };
    })
    .filter((row): row is PriceHubSnapshotImportRow => row !== null);

  return chooseBestRowPerProductUrl(chooseBestRowPerModule(rows));
}

export function buildActiveListingRefreshRows(
  products: readonly NormalizedStoreListingSnapshot[],
  activeListings: readonly ActivePriceHubListingReference[],
  existingRows: readonly PriceHubSnapshotImportRow[] = [],
): PriceHubSnapshotImportRow[] {
  const productByUrl = new Map(products
    .filter(isImportableProductSnapshot)
    .map((product) => [normalizeComparableUrl(product.productUrl!), product]));
  const existingListingKeys = new Set(existingRows.map((row) => listingKey(row.moduleId, row.productUrl)));
  const existingModuleIds = new Set(existingRows.map((row) => row.moduleId));
  const rows: PriceHubSnapshotImportRow[] = [];

  for (const listing of activeListings) {
    const product = productByUrl.get(normalizeComparableUrl(listing.product_url));
    if (
      !product
      || existingModuleIds.has(listing.module_id)
      || existingListingKeys.has(listingKey(listing.module_id, product.productUrl!))
    ) {
      continue;
    }

    rows.push({
      moduleId: listing.module_id,
      productUrl: product.productUrl!,
      productName: product.productName,
      priceAmountMinor: product.priceAmountMinor,
      currency: product.currency,
      availability: product.availability,
      externalProductId: readExternalProductId(product.rawMeta),
      externalHandle: readExternalHandle(product.rawMeta, product.productUrl!),
      rawMeta: {
        ...product.rawMeta,
        priceHubRefreshSource: 'active_listing',
      },
    });
    existingModuleIds.add(listing.module_id);
    existingListingKeys.add(listingKey(listing.module_id, product.productUrl!));
  }

  return rows;
}

export function filterRowsWithExistingModules(
  rows: readonly PriceHubSnapshotImportRow[],
  existingModuleIds: ReadonlySet<number>,
): FilteredPriceHubSnapshotModuleRows {
  const skippedUnknownModuleRows: PriceHubSnapshotImportRow[] = [];
  const filteredRows = rows.filter((row) => {
    if (existingModuleIds.has(row.moduleId)) {
      return true;
    }

    skippedUnknownModuleRows.push(row);
    return false;
  });

  return { rows: filteredRows, skippedUnknownModuleRows };
}

export function calculateStaggeredNextCheckAt(
  importTime: Date | string,
  identity: PriceHubNextCheckIdentity,
  windowMs = NEXT_CHECK_STAGGER_WINDOW_MS,
): string {
  const importedAt = importTime instanceof Date ? importTime : new Date(importTime);
  const importMs = importedAt.getTime();
  if (!Number.isFinite(importMs)) {
    throw new Error('importTime must be a valid date.');
  }
  if (!Number.isInteger(windowMs) || windowMs < NEXT_CHECK_STAGGER_MIN_OFFSET_MS) {
    throw new Error('windowMs must be at least 1000 milliseconds.');
  }

  const hashInput = [
    identity.storeId,
    identity.moduleId,
    normalizeComparableUrl(identity.productUrl),
  ].join('|');
  const offsetMs = NEXT_CHECK_STAGGER_MIN_OFFSET_MS + (hashStringToUint32(hashInput) % (windowMs - NEXT_CHECK_STAGGER_MIN_OFFSET_MS + 1));

  return new Date(importMs + offsetMs).toISOString();
}

export function filterRowsWithConflictingProductUrls(
  rows: readonly PriceHubSnapshotImportRow[],
  existingListings: readonly ExistingPriceHubListingReference[],
  storeId?: number,
): FilteredPriceHubSnapshotImportRows {
  const existingListingsByProductUrl = groupExistingListingsByProductUrl(existingListings);
  const skippedConflictingListings: PriceHubSnapshotImportRow[] = [];
  const filteredRows = rows.filter((row) => {
    if (!hasConflictingExistingProductUrl(row, existingListingsByProductUrl, storeId)) {
      return true;
    }

    skippedConflictingListings.push(row);
    return false;
  });

  return { rows: filteredRows, skippedConflictingListings };
}

function groupExistingListingsByProductUrl(
  existingListings: readonly ExistingPriceHubListingReference[],
): Map<string, ExistingPriceHubListingReference[]> {
  const existingListingsByProductUrl = new Map<string, ExistingPriceHubListingReference[]>();
  for (const listing of existingListings) {
    const key = normalizeComparableUrl(listing.product_url);
    const existingListingsForUrl = existingListingsByProductUrl.get(key) ?? [];
    existingListingsByProductUrl.set(key, [...existingListingsForUrl, listing]);
  }

  return existingListingsByProductUrl;
}

function hasConflictingExistingProductUrl(
  row: PriceHubSnapshotImportRow,
  existingListingsByProductUrl: ReadonlyMap<string, readonly ExistingPriceHubListingReference[]>,
  storeId?: number,
): boolean {
  const existingListings = existingListingsByProductUrl.get(normalizeComparableUrl(row.productUrl)) ?? [];
  return existingListings.some((listing) => listing.module_id !== row.moduleId || (storeId !== undefined && listing.store_id !== storeId));
}

export function uniqueProductUrlLookupValues(rows: readonly PriceHubSnapshotImportRow[]): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    values.add(row.productUrl);
    values.add(row.productUrl.replace(/\/$/, ''));
    values.add(row.productUrl.endsWith('/') ? row.productUrl : `${row.productUrl}/`);
  }
  return Array.from(values).filter((value) => value.length > 0);
}

export function isImportableProductSnapshot(product: NormalizedStoreListingSnapshot): product is NormalizedStoreListingSnapshot & {
  productUrl: string;
  priceAmountMinor: number;
  currency: string;
} {
  return typeof product.productUrl === 'string'
    && product.productUrl.trim().length > 0
    && product.priceAmountMinor !== null
    && product.priceAmountMinor >= MIN_REASONABLE_MODULE_PRICE_MINOR
    && product.priceAmountMinor <= MAX_REASONABLE_MODULE_PRICE_MINOR
    && product.currency !== null;
}

function readExternalProductId(rawMeta: Record<string, unknown>): string | null {
  const value = rawMeta.externalProductId;
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return String(value);
  }
  return null;
}

function readExternalHandle(rawMeta: Record<string, unknown>, productUrl: string): string | null {
  if (typeof rawMeta.slug === 'string' && rawMeta.slug.trim().length > 0) {
    return rawMeta.slug.trim();
  }

  try {
    const url = new URL(productUrl);
    return url.pathname.split('/').filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}

export function readProductUrls(products: readonly NormalizedStoreListingSnapshot[]): string[] {
  return products
    .map((product) => product.productUrl)
    .filter((productUrl): productUrl is string => typeof productUrl === 'string' && productUrl.trim().length > 0);
}

function chooseBestRowPerModule(rows: readonly PriceHubSnapshotImportRow[]): PriceHubSnapshotImportRow[] {
  const rowsByModuleId = new Map<number, PriceHubSnapshotImportRow[]>();
  for (const row of rows) {
    const existingRows = rowsByModuleId.get(row.moduleId) ?? [];
    rowsByModuleId.set(row.moduleId, [...existingRows, row]);
  }

  return Array.from(rowsByModuleId.values()).map(chooseBestRowFromModuleGroup);
}

function chooseBestRowFromModuleGroup(rows: PriceHubSnapshotImportRow[]): PriceHubSnapshotImportRow {
  const sortedRows = [...rows].sort(compareImportRows);
  const selected = sortedRows[0];
  const panelVariants = uniqueStrings(rows.map(readPanelVariant));
  if (panelVariants.length <= 1) {
    return selected;
  }

  return {
    ...selected,
    rawMeta: {
      ...selected.rawMeta,
      priceHubVariantAmbiguity: true,
      priceHubPanelVariants: panelVariants,
      priceHubAlternateMatchedProducts: sortedRows.slice(1).map((row) => ({
        productUrl: row.productUrl,
        productName: row.productName,
        availability: row.availability,
        priceAmountMinor: row.priceAmountMinor,
        currency: row.currency,
        panelVariant: readPanelVariant(row),
        matchScore: readMatchScore(row),
      })),
    },
  };
}

function compareImportRows(left: PriceHubSnapshotImportRow, right: PriceHubSnapshotImportRow): number {
  return readMatchScore(right) - readMatchScore(left)
    || availabilityRank(right.availability) - availabilityRank(left.availability)
    || left.productUrl.localeCompare(right.productUrl)
    || left.moduleId - right.moduleId;
}

export function chooseBestRowPerProductUrl(rows: readonly PriceHubSnapshotImportRow[]): PriceHubSnapshotImportRow[] {
  const rowsByProductUrl = new Map<string, PriceHubSnapshotImportRow[]>();
  for (const row of rows) {
    const key = normalizeComparableUrl(row.productUrl);
    const existingRows = rowsByProductUrl.get(key) ?? [];
    rowsByProductUrl.set(key, [...existingRows, row]);
  }

  return Array.from(rowsByProductUrl.values()).map(chooseBestRowFromProductGroup);
}

function chooseBestRowFromProductGroup(rows: PriceHubSnapshotImportRow[]): PriceHubSnapshotImportRow {
  const sortedRows = [...rows].sort(compareImportRows);
  const selected = sortedRows[0];
  if (sortedRows.length <= 1) {
    return selected;
  }

  return {
    ...selected,
    rawMeta: {
      ...selected.rawMeta,
      priceHubProductMatchAmbiguity: true,
      priceHubAlternateMatchedModules: sortedRows.slice(1).map((row) => ({
        moduleId: row.moduleId,
        moduleName: readStringMeta(row, 'matchedModuleName'),
        manufacturerName: readStringMeta(row, 'matchedManufacturerName'),
        matchScore: readMatchScore(row),
      })),
    },
  };
}

function readMatchScore(row: PriceHubSnapshotImportRow): number {
  const score = row.rawMeta.matchScore;
  return typeof score === 'number' && Number.isFinite(score) ? score : 0;
}

function availabilityRank(availability: SnapshotAvailability): number {
  switch (availability) {
    case 'in_stock':
      return 5;
    case 'preorder':
      return 4;
    case 'backorder':
      return 3;
    case 'out_of_stock':
      return 2;
    case 'discontinued':
      return 1;
    case 'unknown':
      return 0;
  }
}

function readPanelVariant(row: PriceHubSnapshotImportRow): string | null {
  const value = row.rawMeta.panelVariant;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readStringMeta(row: PriceHubSnapshotImportRow, key: string): string | null {
  const value = row.rawMeta[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function uniqueStrings(values: readonly (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => value !== null))).sort();
}

export function uniqueModuleIds(rows: readonly PriceHubSnapshotImportRow[]): number[] {
  return Array.from(new Set(rows.map((row) => row.moduleId)))
    .sort((left, right) => left - right);
}

export function uniqueMatchModuleIds(
  matches: readonly PriceHubMatchCandidate[],
  acceptedStatuses: readonly PriceHubMatchStatus[],
): number[] {
  return Array.from(new Set(
    matches
      .filter((match) => acceptedStatuses.includes(match.status))
      .map((match) => parseModuleId(match.moduleId))
      .filter((moduleId): moduleId is number => moduleId !== null)
  )).sort((left, right) => left - right);
}

export function parseModuleId(value: string): number | null {
  const moduleId = Number.parseInt(value, 10);
  return Number.isSafeInteger(moduleId) && moduleId > 0 ? moduleId : null;
}

export function formatIdSample(ids: readonly number[]): string {
  const sortedIds = [...ids].sort((left, right) => left - right);
  const sample = sortedIds.slice(0, 12).join(', ');
  return sortedIds.length > 12 ? `${sample}, …` : sample;
}

export function listingKey(moduleId: number, productUrl: string): string {
  return `${moduleId}:${normalizeComparableUrl(productUrl)}`;
}

export function normalizeComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}

function hashStringToUint32(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
