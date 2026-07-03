import { readFile } from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedStoreListingSnapshot, SnapshotAvailability } from '../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { Database, Json } from '../../src/backend/database.types.ts';
import { readApprovedPriceHubStore, type ApprovedPriceHubStoreSlug } from './store-configs.ts';
import { readPriceHubScriptEnv, readSupabaseWriteKey } from './local-env.ts';
import type { PriceHubMatchCandidate, PriceHubMatchStatus } from './matcher.ts';

const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const WRITE_KEY_HELP = 'Set SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in your shell, .env, or .env.local at the repository root, or pass --supabase-key=...';
const ACCEPTED_STATUSES: readonly PriceHubMatchStatus[] = ['strong_candidate'];
const EXISTING_LISTING_LOOKUP_BATCH_SIZE = 1000;
const MODULE_ID_LOOKUP_BATCH_SIZE = 1000;
const MIN_REASONABLE_MODULE_PRICE_MINOR = 3000;
const MAX_REASONABLE_MODULE_PRICE_MINOR = 2000000;

interface ImportLocalSnapshotsOptions {
  storeSlug: ApprovedPriceHubStoreSlug;
  productsPath: string;
  matchesPath: string;
  supabaseUrl: string;
  supabaseKey: string;
  dryRun: boolean;
  acceptedStatuses: readonly PriceHubMatchStatus[];
}

export interface ExistingPriceHubListingReference {
  module_id: number;
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

interface PriceHubImportInputs {
  products: NormalizedStoreListingSnapshot[];
  matches: PriceHubMatchCandidate[];
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

interface ImportSummary {
  storeSlug: ApprovedPriceHubStoreSlug;
  acceptedMatches: number;
  upsertedListings: number;
  insertedSnapshots: number;
  skippedUnknownModules: number;
  skippedConflictingListings: number;
}

type StoreRow = Database['public']['Tables']['stores']['Row'];
type ListingRow = Database['public']['Tables']['module_store_listings']['Row'];
type ListingInsert = Database['public']['Tables']['module_store_listings']['Insert'];
type SnapshotInsert = Database['public']['Tables']['module_price_snapshots']['Insert'];

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2), readPriceHubScriptEnv());
  if (!options.dryRun && !options.supabaseKey) {
    throw new Error(`Missing Supabase write key. Live Price Hub imports require a key that can write the Price Hub tables. ${WRITE_KEY_HELP}`);
  }
  if (options.dryRun) {
    const rows = await readImportRows(options);
    console.log(`Dry run: would import ${rows.length} snapshots for ${options.storeSlug}.`);
    for (const row of rows.slice(0, 10)) {
      console.log(`${row.moduleId}: ${row.productName ?? row.productUrl} (${row.currency ?? '---'} ${row.priceAmountMinor ?? 'unknown'}, ${row.availability})`);
    }
    return;
  }

  const supabase = createClient<Database>(options.supabaseUrl, options.supabaseKey, {
    auth: { persistSession: false },
  });
  const inputs = await readImportInputs(options);
  const preflightedMatches = await readMatchesWithExistingModules(supabase, inputs.matches, options.acceptedStatuses);
  if (preflightedMatches.skippedUnknownModuleIds.length > 0) {
    console.warn(`Skipped ${preflightedMatches.skippedUnknownModuleIds.length} accepted Price Hub module IDs that do not exist: ${formatIdSample(preflightedMatches.skippedUnknownModuleIds)}.`);
  }
  const rows = buildImportRows(inputs.products, preflightedMatches.matches, options.acceptedStatuses);
  const summary = await importRows(supabase, options.storeSlug, rows);
  console.log(`Imported ${summary.insertedSnapshots} Price Hub snapshots for ${summary.storeSlug} (${summary.upsertedListings} listings).`);
}

export function readCliOptions(args: readonly string[], env: NodeJS.ProcessEnv = process.env): ImportLocalSnapshotsOptions {
  const values = new Map<string, string>();
  let dryRun = false;

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
    }
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }

    const [key, value] = readKeyValueArg(arg);
    values.set(key, value);
  }

  const storeSlug = readRequiredValue(values, '--store') as ApprovedPriceHubStoreSlug;
  readApprovedPriceHubStore(storeSlug);

  return {
    storeSlug,
    productsPath: readRequiredValue(values, '--products'),
    matchesPath: readRequiredValue(values, '--matches'),
    supabaseUrl: stripTrailingSlash(values.get('--supabase-url') ?? env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL),
    supabaseKey: values.get('--supabase-key') ?? readSupabaseWriteKey(env),
    dryRun,
    acceptedStatuses: ACCEPTED_STATUSES,
  };
}

export async function readImportRows(options: Pick<ImportLocalSnapshotsOptions, 'productsPath' | 'matchesPath' | 'acceptedStatuses'>): Promise<PriceHubSnapshotImportRow[]> {
  const inputs = await readImportInputs(options);
  return buildImportRows(inputs.products, inputs.matches, options.acceptedStatuses);
}

async function readImportInputs(options: Pick<ImportLocalSnapshotsOptions, 'productsPath' | 'matchesPath'>): Promise<PriceHubImportInputs> {
  const products = await readJsonArray(options.productsPath, readProductSnapshot);
  const matches = await readJsonArray(options.matchesPath, readMatchCandidate);
  return { products, matches };
}

export function buildImportRows(
  products: readonly NormalizedStoreListingSnapshot[],
  matches: readonly PriceHubMatchCandidate[],
  acceptedStatuses: readonly PriceHubMatchStatus[] = ACCEPTED_STATUSES,
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

export async function importRows(
  supabase: SupabaseClient<Database>,
  storeSlug: ApprovedPriceHubStoreSlug,
  rows: readonly PriceHubSnapshotImportRow[],
): Promise<ImportSummary> {
  if (rows.length === 0) {
    return { storeSlug, acceptedMatches: 0, upsertedListings: 0, insertedSnapshots: 0, skippedUnknownModules: 0, skippedConflictingListings: 0 };
  }

  const moduleFilteredRows = await readRowsWithExistingModules(supabase, rows);
  if (moduleFilteredRows.skippedUnknownModuleRows.length > 0) {
    console.warn(`Skipped ${moduleFilteredRows.skippedUnknownModuleRows.length} Price Hub import rows with unknown module IDs: ${formatIdSample(uniqueModuleIds(moduleFilteredRows.skippedUnknownModuleRows))}.`);
  }
  if (moduleFilteredRows.rows.length === 0) {
    return {
      storeSlug,
      acceptedMatches: rows.length,
      upsertedListings: 0,
      insertedSnapshots: 0,
      skippedUnknownModules: moduleFilteredRows.skippedUnknownModuleRows.length,
      skippedConflictingListings: 0,
    };
  }

  const store = await readStore(supabase, storeSlug);
  const filteredRows = await readRowsWithoutConflictingProductUrls(supabase, store.id, moduleFilteredRows.rows);
  if (filteredRows.skippedConflictingListings.length > 0) {
    console.warn(`Skipped ${filteredRows.skippedConflictingListings.length} Price Hub import rows whose product URLs are already linked to another module.`);
  }
  if (filteredRows.rows.length === 0) {
    return {
      storeSlug,
      acceptedMatches: rows.length,
      upsertedListings: 0,
      insertedSnapshots: 0,
      skippedUnknownModules: moduleFilteredRows.skippedUnknownModuleRows.length,
      skippedConflictingListings: filteredRows.skippedConflictingListings.length,
    };
  }

  const listingRows = await upsertListings(supabase, store.id, filteredRows.rows);
  const listingByModuleAndUrl = new Map(listingRows.map((listing) => [
    listingKey(listing.module_id, listing.product_url),
    listing,
  ]));
  const now = new Date().toISOString();
  const snapshots: SnapshotInsert[] = filteredRows.rows.map((row) => {
    const listing = listingByModuleAndUrl.get(listingKey(row.moduleId, row.productUrl));
    if (!listing) {
      throw new Error(`Listing upsert did not return module ${row.moduleId} ${row.productUrl}.`);
    }
    return {
      listing_id: listing.id,
      observed_at: now,
      price_amount_minor: row.priceAmountMinor,
      currency: row.currency,
      availability: row.availability,
      source: 'scraper',
      raw_meta: row.rawMeta as Json,
    };
  });

  const { error } = await supabase
    .from('module_price_snapshots')
    .insert(snapshots);
  if (error) {
    throw new Error(`Snapshot insert failed: ${error.message}`);
  }

  return {
    storeSlug,
    acceptedMatches: rows.length,
    upsertedListings: listingRows.length,
    insertedSnapshots: snapshots.length,
    skippedUnknownModules: moduleFilteredRows.skippedUnknownModuleRows.length,
    skippedConflictingListings: filteredRows.skippedConflictingListings.length,
  };
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

export function filterRowsWithConflictingProductUrls(
  rows: readonly PriceHubSnapshotImportRow[],
  existingListings: readonly ExistingPriceHubListingReference[],
): FilteredPriceHubSnapshotImportRows {
  const existingListingsByProductUrl = groupExistingListingsByProductUrl(existingListings);
  const skippedConflictingListings: PriceHubSnapshotImportRow[] = [];
  const filteredRows = rows.filter((row) => {
    if (!hasConflictingExistingProductUrl(row, existingListingsByProductUrl)) {
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
): boolean {
  const existingListings = existingListingsByProductUrl.get(normalizeComparableUrl(row.productUrl)) ?? [];
  return existingListings.some((listing) => listing.module_id !== row.moduleId);
}

async function readRowsWithoutConflictingProductUrls(
  supabase: SupabaseClient<Database>,
  storeId: number,
  rows: readonly PriceHubSnapshotImportRow[],
): Promise<FilteredPriceHubSnapshotImportRows> {
  const existingListings: ExistingPriceHubListingReference[] = [];
  for (let start = 0; ; start += EXISTING_LISTING_LOOKUP_BATCH_SIZE) {
    const { data, error } = await supabase
      .from('module_store_listings')
      .select('module_id,product_url')
      .eq('store_id', storeId)
      .range(start, start + EXISTING_LISTING_LOOKUP_BATCH_SIZE - 1);
    if (error) {
      throw new Error(`Existing listing lookup failed: ${error.message}`);
    }

    const page = data ?? [];
    existingListings.push(...page);
    if (page.length < EXISTING_LISTING_LOOKUP_BATCH_SIZE) {
      break;
    }
  }

  return filterRowsWithConflictingProductUrls(rows, existingListings);
}

async function readRowsWithExistingModules(
  supabase: SupabaseClient<Database>,
  rows: readonly PriceHubSnapshotImportRow[],
): Promise<FilteredPriceHubSnapshotModuleRows> {
  return filterRowsWithExistingModules(
    rows,
    await readExistingModuleIds(supabase, uniqueModuleIds(rows)),
  );
}

async function readMatchesWithExistingModules(
  supabase: SupabaseClient<Database>,
  matches: readonly PriceHubMatchCandidate[],
  acceptedStatuses: readonly PriceHubMatchStatus[],
): Promise<{ matches: PriceHubMatchCandidate[]; skippedUnknownModuleIds: number[] }> {
  const acceptedModuleIds = uniqueMatchModuleIds(matches, acceptedStatuses);
  if (acceptedModuleIds.length === 0) {
    return { matches: [...matches], skippedUnknownModuleIds: [] };
  }

  const existingModuleIds = await readExistingModuleIds(supabase, acceptedModuleIds);
  const skippedUnknownModuleIds = acceptedModuleIds.filter((moduleId) => !existingModuleIds.has(moduleId));
  if (skippedUnknownModuleIds.length === 0) {
    return { matches: [...matches], skippedUnknownModuleIds };
  }

  return {
    matches: matches.filter((match) => {
      if (!acceptedStatuses.includes(match.status)) {
        return true;
      }

      const moduleId = parseModuleId(match.moduleId);
      return moduleId === null || existingModuleIds.has(moduleId);
    }),
    skippedUnknownModuleIds,
  };
}

async function readExistingModuleIds(
  supabase: SupabaseClient<Database>,
  moduleIds: readonly number[],
): Promise<ReadonlySet<number>> {
  const existingModuleIds = new Set<number>();
  for (let start = 0; start < moduleIds.length; start += MODULE_ID_LOOKUP_BATCH_SIZE) {
    const pageIds = moduleIds.slice(start, start + MODULE_ID_LOOKUP_BATCH_SIZE);
    const { data, error } = await supabase
      .from('modules')
      .select('id')
      .in('id', pageIds);

    if (error) {
      throw new Error(`Module preflight lookup failed: ${error.message}`);
    }

    for (const row of data ?? []) {
      existingModuleIds.add(row.id);
    }
  }

  return existingModuleIds;
}

async function readStore(supabase: SupabaseClient<Database>, storeSlug: ApprovedPriceHubStoreSlug): Promise<StoreRow> {
  const { data, error } = await supabase
    .from('stores')
    .select('id,slug,name,country_code,base_url,search_url_template,adapter_kind,currency_hint,active,price_tracking_enabled,rate_limit_per_day,created_at,updated_at')
    .eq('slug', storeSlug)
    .single();
  if (error) {
    throw new Error(`Store "${storeSlug}" lookup failed: ${error.message}`);
  }
  return data;
}

async function upsertListings(
  supabase: SupabaseClient<Database>,
  storeId: number,
  rows: readonly PriceHubSnapshotImportRow[],
): Promise<ListingRow[]> {
  const now = new Date().toISOString();
  const listings: ListingInsert[] = rows.map((row) => ({
    module_id: row.moduleId,
    store_id: storeId,
    product_url: row.productUrl,
    external_product_id: row.externalProductId,
    external_handle: row.externalHandle,
    active: true,
    verification_status: 'verified',
    last_checked_at: now,
    last_success_at: now,
    next_check_at: now,
    failure_count: 0,
    last_error: null,
  }));

  const { data, error } = await supabase
    .from('module_store_listings')
    .upsert(listings, { onConflict: 'module_id,store_id' })
    .select('id,module_id,store_id,product_url,external_product_id,external_handle,active,verification_status,last_checked_at,last_success_at,next_check_at,failure_count,last_error,created_at,updated_at');
  if (error) {
    throw new Error(`Listing upsert failed: ${error.message}`);
  }

  return data ?? [];
}

async function readJsonArray<T>(path: string, readItem: (value: unknown) => T): Promise<T[]> {
  const body: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(body)) {
    throw new Error(`${path} must contain a JSON array.`);
  }
  return body.map(readItem);
}

function readProductSnapshot(value: unknown): NormalizedStoreListingSnapshot {
  const row = readRecord(value, 'product');
  return {
    priceAmountMinor: readNullableNumber(row.priceAmountMinor, 'priceAmountMinor'),
    currency: readNullableString(row.currency, 'currency'),
    availability: readAvailability(row.availability),
    productName: readNullableString(row.productName, 'productName'),
    productUrl: readNullableString(row.productUrl, 'productUrl'),
    imageUrl: readNullableString(row.imageUrl, 'imageUrl'),
    rawMeta: readRecord(row.rawMeta, 'rawMeta'),
  };
}

function readMatchCandidate(value: unknown): PriceHubMatchCandidate {
  const row = readRecord(value, 'match');
  if (typeof row.moduleId !== 'string' || typeof row.moduleName !== 'string' || typeof row.manufacturerName !== 'string') {
    throw new Error('Every match must include moduleId, moduleName, and manufacturerName.');
  }

  return {
    moduleId: row.moduleId,
    moduleName: row.moduleName,
    manufacturerName: row.manufacturerName,
    productUrl: readNullableString(row.productUrl, 'productUrl'),
    productName: readNullableString(row.productName, 'productName'),
    score: readRequiredNumber(row.score, 'score'),
    status: readMatchStatus(row.status),
    reasons: readStringArray(row.reasons, 'reasons'),
  };
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

function chooseBestRowPerProductUrl(rows: readonly PriceHubSnapshotImportRow[]): PriceHubSnapshotImportRow[] {
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

function uniqueModuleIds(rows: readonly PriceHubSnapshotImportRow[]): number[] {
  return Array.from(new Set(rows.map((row) => row.moduleId)))
    .sort((left, right) => left - right);
}

function uniqueMatchModuleIds(
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

function parseModuleId(value: string): number | null {
  const moduleId = Number.parseInt(value, 10);
  return Number.isSafeInteger(moduleId) && moduleId > 0 ? moduleId : null;
}

function formatIdSample(ids: readonly number[]): string {
  const sortedIds = [...ids].sort((left, right) => left - right);
  const sample = sortedIds.slice(0, 12).join(', ');
  return sortedIds.length > 12 ? `${sample}, …` : sample;
}

function listingKey(moduleId: number, productUrl: string): string {
  return `${moduleId}:${normalizeComparableUrl(productUrl)}`;
}

function normalizeComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}

function readKeyValueArg(arg: string): [string, string] {
  const equalsIndex = arg.indexOf('=');
  if (equalsIndex < 0) {
    throw new Error(`Argument "${arg}" must use --name=value form.`);
  }

  const key = arg.slice(0, equalsIndex);
  const value = arg.slice(equalsIndex + 1).trim();
  if (!value) {
    throw new Error(`Argument "${key}" must not be blank.`);
  }

  return [key, value];
}

function readRequiredValue(values: Map<string, string>, key: string): string {
  const value = values.get(key);
  if (!value) {
    throw new Error(`Missing required argument ${key}. Use --help for usage.`);
  }
  return value;
}

function readRecord(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function readRequiredNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${fieldName} must be a finite number.`);
  }
  return value;
}

function readNullableNumber(value: unknown, fieldName: string): number | null {
  if (value === null) return null;
  return readRequiredNumber(value, fieldName);
}

function readNullableString(value: unknown, fieldName: string): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string or null.`);
  }
  return value;
}

function readAvailability(value: unknown): SnapshotAvailability {
  if (value === 'in_stock' || value === 'out_of_stock' || value === 'preorder' || value === 'backorder' || value === 'discontinued' || value === 'unknown') {
    return value;
  }
  throw new Error(`Unsupported availability "${String(value)}".`);
}

function readMatchStatus(value: unknown): PriceHubMatchStatus {
  if (value === 'strong_candidate' || value === 'review_candidate' || value === 'ignored') {
    return value;
  }
  throw new Error(`Unsupported match status "${String(value)}".`);
}

function readStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`${fieldName} must be a string array.`);
  }
  return value;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function printHelpAndExit(): never {
  console.log('Usage: pnpm price-hub:import-local --store=signal-sounds-uk --products=tmp/price-hub/signal-sounds-uk/products.json --matches=tmp/price-hub/signal-sounds-uk/matches.json [--dry-run]');
  console.log(`Requires a Supabase write key unless --dry-run is used. SUPABASE_URL defaults to the Patcher project. ${WRITE_KEY_HELP}`);
  process.exit(0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
