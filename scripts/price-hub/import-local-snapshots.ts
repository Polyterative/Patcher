import { readFile } from 'node:fs/promises';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { NormalizedStoreListingSnapshot, SnapshotAvailability } from '../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';
import type { Database, Json } from '../../src/backend/database.types.ts';
import { readApprovedPriceHubStore, type ApprovedPriceHubStoreSlug } from './store-configs.ts';
import { assertSupabaseWriteKeyCanWrite, readPriceHubScriptEnv, readSupabaseWriteKey } from './local-env.ts';
import type { PriceHubMatchCandidate, PriceHubMatchStatus } from './matcher.ts';
import {
  planSnapshotWrites,
  readEndpointUpdateSnapshotIds,
  type LatestSnapshotRow,
  type SnapshotWriteDecision,
} from '../../supabase/functions/_shared/price-hub/snapshot-change-planner.ts';
import {
  planDisappearanceDeactivation,
  type DisappearanceDeactivationEvidence,
  type DisappearedPriceHubListingReference,
} from './import-local-deactivation.ts';

import {
  buildActiveListingRefreshRows,
  buildImportRows,
  calculateStaggeredNextCheckAt,
  chooseBestRowPerProductUrl,
  DEFAULT_ACCEPTED_STATUSES,
  filterRowsWithConflictingProductUrls,
  filterRowsWithExistingModules,
  formatIdSample,
  isImportableProductSnapshot,
  listingKey,
  normalizeComparableUrl,
  parseModuleId,
  readProductUrls,
  uniqueMatchModuleIds,
  uniqueModuleIds,
  uniqueProductUrlLookupValues,
  type ExistingPriceHubListingReference,
  type FilteredPriceHubSnapshotImportRows,
  type FilteredPriceHubSnapshotModuleRows,
  type PriceHubSnapshotImportRow,
} from './import-local/row-planning.ts';

export { planDisappearanceDeactivation } from './import-local-deactivation.ts';
export {
  buildActiveListingRefreshRows,
  buildImportRows,
  calculateStaggeredNextCheckAt,
  filterRowsWithConflictingProductUrls,
  filterRowsWithExistingModules,
} from './import-local/row-planning.ts';
export type {
  ExistingPriceHubListingReference,
  FilteredPriceHubSnapshotImportRows,
  FilteredPriceHubSnapshotModuleRows,
  PriceHubNextCheckIdentity,
  PriceHubSnapshotImportRow,
} from './import-local/row-planning.ts';

const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const WRITE_KEY_HELP = 'Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY in your shell, .env, .env.local, or PRICE_HUB_ENV_FILE, or pass --supabase-key=...';
const ACCEPTED_STATUSES = DEFAULT_ACCEPTED_STATUSES;
const PRODUCT_URL_LOOKUP_BATCH_SIZE = 100;
const MODULE_ID_LOOKUP_BATCH_SIZE = 500;
const LISTING_DEACTIVATION_BATCH_SIZE = 100;
const ACTIVE_LISTING_LOOKUP_PAGE_SIZE = 500;
const LATEST_SNAPSHOT_RPC_BATCH_SIZE = 500;

interface ImportLocalSnapshotsOptions {
  storeSlug: ApprovedPriceHubStoreSlug;
  productsPath: string;
  matchesPath: string;
  supabaseUrl: string;
  supabaseKey: string;
  dryRun: boolean;
  fullCatalog: boolean;
  acceptedStatuses: readonly PriceHubMatchStatus[];
}

interface PriceHubImportInputs {
  products: NormalizedStoreListingSnapshot[];
  matches: PriceHubMatchCandidate[];
}

interface ImportSummary {
  storeSlug: ApprovedPriceHubStoreSlug;
  acceptedMatches: number;
  upsertedListings: number;
  insertedSnapshots: number;
  updatedSnapshotEndpoints: number;
  deactivatedListings: number;
  deactivationSkippedReason: string | null;
  skippedUnknownModules: number;
  skippedConflictingListings: number;
}

type StoreRow = Database['public']['Tables']['stores']['Row'];
type ListingRow = Database['public']['Tables']['module_store_listings']['Row'];
/** Upsert echo without the jsonb diagnostics column, which the importer never reads back. */
type UpsertedListingRow = Omit<ListingRow, 'last_raw_meta'>;
type ListingInsert = Database['public']['Tables']['module_store_listings']['Insert'];
type SnapshotInsert = Database['public']['Tables']['module_price_snapshots']['Insert'];

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2), readPriceHubScriptEnv());
  if (!options.dryRun) {
    assertSupabaseWriteKeyCanWrite(options.supabaseKey, WRITE_KEY_HELP);
  }
  if (options.dryRun) {
    const inputs = await readImportInputs(options);
    const rows = buildImportRows(inputs.products, inputs.matches, options.acceptedStatuses);
    console.log(`Dry run: would import ${rows.length} snapshots for ${options.storeSlug}.`);
    for (const row of rows.slice(0, 10)) {
      console.log(`${row.moduleId}: ${row.productName ?? row.productUrl} (${row.currency ?? '---'} ${row.priceAmountMinor ?? 'unknown'}, ${row.availability})`);
    }
    await printDryRunDisappearanceDeactivation(options, inputs.products, rows);
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
  const summary = await importRows(supabase, options.storeSlug, rows, options.fullCatalog
    ? {
        productUrls: readProductUrls(inputs.products),
        evidence: {
          productCount: inputs.products.length,
          importRowCount: rows.length,
          hitMaxProducts: false,
          hasExplicitBounds: false,
        },
      }
    : undefined, inputs.products);
  console.log(`Imported ${summary.insertedSnapshots} Price Hub snapshots for ${summary.storeSlug} (${summary.updatedSnapshotEndpoints} unchanged endpoints bumped, ${summary.upsertedListings} listings, ${summary.deactivatedListings} deactivated).`);
  if (summary.deactivationSkippedReason) {
    console.warn(`Skipped disappearance deactivation for ${summary.storeSlug}: ${summary.deactivationSkippedReason}`);
  }
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
    if (arg === '--full-catalog') {
      values.set('--full-catalog', 'true');
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
    fullCatalog: values.get('--full-catalog') === 'true',
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


export async function importRows(
  supabase: SupabaseClient<Database>,
  storeSlug: ApprovedPriceHubStoreSlug,
  rows: readonly PriceHubSnapshotImportRow[],
  disappearanceDeactivation?: {
    productUrls: readonly string[];
    evidence: DisappearanceDeactivationEvidence;
  },
  observedProducts: readonly NormalizedStoreListingSnapshot[] = [],
): Promise<ImportSummary> {
  if (rows.length === 0 && observedProducts.length === 0) {
    const emptyDeactivationSummary = disappearanceDeactivation
      ? await applyDisappearanceDeactivation(supabase, storeSlug, disappearanceDeactivation.productUrls, disappearanceDeactivation.evidence)
      : { deactivatedListings: 0, deactivationSkippedReason: null };
    return {
      storeSlug,
      acceptedMatches: 0,
      upsertedListings: 0,
      insertedSnapshots: 0,
      updatedSnapshotEndpoints: 0,
      ...emptyDeactivationSummary,
      skippedUnknownModules: 0,
      skippedConflictingListings: 0,
    };
  }

  const moduleFilteredRows = rows.length > 0
    ? await readRowsWithExistingModules(supabase, rows)
    : {
      rows: [],
      skippedUnknownModuleRows: [],
    };
  if (moduleFilteredRows.skippedUnknownModuleRows.length > 0) {
    console.warn(`Skipped ${moduleFilteredRows.skippedUnknownModuleRows.length} Price Hub import rows with unknown module IDs: ${formatIdSample(uniqueModuleIds(moduleFilteredRows.skippedUnknownModuleRows))}.`);
  }
  if (moduleFilteredRows.rows.length === 0 && observedProducts.length === 0) {
    const deactivationSummary = await applyOptionalDisappearanceDeactivation(supabase, storeSlug, disappearanceDeactivation);
    return {
      storeSlug,
      acceptedMatches: rows.length,
      upsertedListings: 0,
      insertedSnapshots: 0,
      updatedSnapshotEndpoints: 0,
      ...deactivationSummary,
      skippedUnknownModules: moduleFilteredRows.skippedUnknownModuleRows.length,
      skippedConflictingListings: 0,
    };
  }

  const store = await readStore(supabase, storeSlug);
  const knownModuleRows = chooseBestRowPerProductUrl(moduleFilteredRows.rows);
  const filteredRows = knownModuleRows.length > 0
    ? await readRowsWithoutConflictingProductUrls(supabase, store.id, knownModuleRows)
    : {
      rows: [],
      skippedConflictingListings: [],
    };
  if (filteredRows.skippedConflictingListings.length > 0) {
    console.warn(`Skipped ${filteredRows.skippedConflictingListings.length} Price Hub import rows whose product URLs are already linked to another module.`);
  }
  const activeListingReferences = (observedProducts.length > 0 || disappearanceDeactivation)
    ? await readActiveListingReferences(supabase, store.id)
    : [];
  const activeRefreshRows = observedProducts.length > 0
    ? buildActiveListingRefreshRows(observedProducts, activeListingReferences, filteredRows.rows)
    : [];
  const rowsToImport = [...filteredRows.rows, ...activeRefreshRows];
  if (rowsToImport.length === 0) {
    const deactivationSummary = await deactivateMissingActiveListingsForStore(supabase, store, disappearanceDeactivation, activeListingReferences);
    const unimportableSummary = await deactivateUnimportableObservedActiveListings(supabase, activeListingReferences, observedProducts, rowsToImport);
    return {
      storeSlug,
      acceptedMatches: rows.length,
      upsertedListings: 0,
      insertedSnapshots: 0,
      updatedSnapshotEndpoints: 0,
      deactivatedListings: deactivationSummary.deactivatedListings + unimportableSummary.deactivatedListings,
      deactivationSkippedReason: deactivationSummary.deactivationSkippedReason,
      skippedUnknownModules: moduleFilteredRows.skippedUnknownModuleRows.length,
      skippedConflictingListings: filteredRows.skippedConflictingListings.length,
    };
  }

  const listingRows = await upsertListings(supabase, store.id, rowsToImport);
  const listingByModuleAndUrl = new Map(listingRows.map((listing) => [
    listingKey(listing.module_id, listing.product_url),
    listing,
  ]));
  const now = new Date().toISOString();
  const rowByListingId = new Map<number, PriceHubSnapshotImportRow>();
  const observations = rowsToImport.map((row) => {
    const listing = listingByModuleAndUrl.get(listingKey(row.moduleId, row.productUrl));
    if (!listing) {
      throw new Error(`Listing upsert did not return module ${row.moduleId} ${row.productUrl}.`);
    }
    rowByListingId.set(listing.id, row);
    return {
      listingId: listing.id,
      priceAmountMinor: row.priceAmountMinor,
      currency: row.currency,
      availability: row.availability,
    };
  });

  const latestSnapshots = await readLatestSnapshotsForListings(supabase, [...new Set(observations.map((observation) => observation.listingId))]);
  const plan = planSnapshotWrites(observations, latestSnapshots);
  const snapshots: SnapshotInsert[] = plan.decisions
    .filter((decision): decision is Exclude<SnapshotWriteDecision, { kind: 'update_endpoint' }> => decision.kind !== 'update_endpoint')
    .map((decision) => {
      const row = rowByListingId.get(decision.listingId);
      if (!row) {
        throw new Error(`Snapshot plan referenced unknown listing ${decision.listingId}.`);
      }
      return {
        listing_id: decision.listingId,
        observed_at: now,
        price_amount_minor: row.priceAmountMinor,
        currency: row.currency,
        availability: row.availability,
        source: 'scraper',
        raw_meta: {} as Json,
      };
    });

  if (snapshots.length > 0) {
    const { error } = await supabase
      .from('module_price_snapshots')
      .insert(snapshots);
    if (error) {
      throw new Error(`Snapshot insert failed: ${error.message}`);
    }
  }

  const endpointSnapshotIds = readEndpointUpdateSnapshotIds(plan);
  if (endpointSnapshotIds.length > 0) {
    const { error } = await supabase
      .from('module_price_snapshots')
      .update({ observed_at: now })
      .in('id', endpointSnapshotIds);
    if (error) {
      throw new Error(`Snapshot endpoint update failed: ${error.message}`);
    }
  }

  const deactivationSummary = await deactivateMissingActiveListingsForStore(supabase, store, disappearanceDeactivation, activeListingReferences);
  const unimportableSummary = await deactivateUnimportableObservedActiveListings(supabase, activeListingReferences, observedProducts, rowsToImport);

  return {
    storeSlug,
    acceptedMatches: rows.length,
    upsertedListings: listingRows.length,
    insertedSnapshots: snapshots.length,
    updatedSnapshotEndpoints: endpointSnapshotIds.length,
    deactivatedListings: deactivationSummary.deactivatedListings + unimportableSummary.deactivatedListings,
    deactivationSkippedReason: deactivationSummary.deactivationSkippedReason,
    skippedUnknownModules: moduleFilteredRows.skippedUnknownModuleRows.length,
    skippedConflictingListings: filteredRows.skippedConflictingListings.length,
  };
}

async function applyOptionalDisappearanceDeactivation(
  supabase: SupabaseClient<Database>,
  storeSlug: ApprovedPriceHubStoreSlug,
  disappearanceDeactivation?: {
    productUrls: readonly string[];
    evidence: DisappearanceDeactivationEvidence;
  },
): Promise<{ deactivatedListings: number; deactivationSkippedReason: string | null }> {
  return disappearanceDeactivation
    ? applyDisappearanceDeactivation(supabase, storeSlug, disappearanceDeactivation.productUrls, disappearanceDeactivation.evidence)
    : { deactivatedListings: 0, deactivationSkippedReason: null };
}

async function deactivateMissingActiveListingsForStore(
  supabase: SupabaseClient<Database>,
  store: StoreRow,
  disappearanceDeactivation?: {
    productUrls: readonly string[];
    evidence: DisappearanceDeactivationEvidence;
  },
  existingListings?: readonly DisappearedPriceHubListingReference[],
): Promise<{ deactivatedListings: number; deactivationSkippedReason: string | null }> {
  return disappearanceDeactivation
    ? deactivateMissingActiveListings(supabase, store, disappearanceDeactivation.productUrls, disappearanceDeactivation.evidence, {}, existingListings)
    : { deactivatedListings: 0, deactivationSkippedReason: null };
}

export async function applyDisappearanceDeactivation(
  supabase: SupabaseClient<Database>,
  storeSlug: ApprovedPriceHubStoreSlug,
  observedProductUrls: readonly string[],
  evidence: DisappearanceDeactivationEvidence,
  options: { dryRun?: boolean } = {},
): Promise<{ deactivatedListings: number; deactivationSkippedReason: string | null }> {
  const store = await readStore(supabase, storeSlug);
  return deactivateMissingActiveListings(supabase, store, observedProductUrls, evidence, options);
}

async function deactivateMissingActiveListings(
  supabase: SupabaseClient<Database>,
  store: StoreRow,
  observedProductUrls: readonly string[],
  evidence: DisappearanceDeactivationEvidence,
  options: { dryRun?: boolean } = {},
  existingListingReferences?: readonly DisappearedPriceHubListingReference[],
): Promise<{ deactivatedListings: number; deactivationSkippedReason: string | null }> {
  const now = new Date().toISOString();
  const existingListings = existingListingReferences ?? await readActiveListingReferences(supabase, store.id);
  const plan = planDisappearanceDeactivation(existingListings, observedProductUrls, evidence, now);
  if (!plan.eligible) {
    return { deactivatedListings: 0, deactivationSkippedReason: plan.skipReason };
  }
  if (plan.listings.length === 0 || options.dryRun) {
    return { deactivatedListings: plan.listings.length, deactivationSkippedReason: null };
  }

  await markListingsStale(supabase, plan.listings.map((listing) => listing.id), now, plan.reason!);

  return { deactivatedListings: plan.listings.length, deactivationSkippedReason: null };
}

async function deactivateUnimportableObservedActiveListings(
  supabase: SupabaseClient<Database>,
  activeListings: readonly DisappearedPriceHubListingReference[],
  observedProducts: readonly NormalizedStoreListingSnapshot[],
  importedRows: readonly PriceHubSnapshotImportRow[],
): Promise<{ deactivatedListings: number }> {
  if (activeListings.length === 0 || observedProducts.length === 0) {
    return { deactivatedListings: 0 };
  }

  const observedProductByUrl = new Map(observedProducts
    .filter((product) => typeof product.productUrl === 'string' && product.productUrl.trim().length > 0)
    .map((product) => [normalizeComparableUrl(product.productUrl!), product]));
  const importedKeys = new Set(importedRows.map((row) => listingKey(row.moduleId, row.productUrl)));
  const staleListingIds = activeListings
    .filter((listing) => {
      const product = observedProductByUrl.get(normalizeComparableUrl(listing.product_url));
      return product !== undefined
        && !isImportableProductSnapshot(product)
        && !importedKeys.has(listingKey(listing.module_id, listing.product_url));
    })
    .map((listing) => listing.id);

  if (staleListingIds.length === 0) {
    return { deactivatedListings: 0 };
  }

  const now = new Date().toISOString();
  await markListingsStale(supabase, staleListingIds, now, `not_importable_since_crawl:${now.slice(0, 10)}`);
  return { deactivatedListings: staleListingIds.length };
}

async function markListingsStale(
  supabase: SupabaseClient<Database>,
  listingIds: readonly number[],
  checkedAt: string,
  reason: string,
): Promise<void> {
  for (let start = 0; start < listingIds.length; start += LISTING_DEACTIVATION_BATCH_SIZE) {
    const ids = listingIds.slice(start, start + LISTING_DEACTIVATION_BATCH_SIZE);
    const { error } = await supabase
      .from('module_store_listings')
      .update({
        active: false,
        verification_status: 'stale',
        last_checked_at: checkedAt,
        last_error: reason,
      })
      .in('id', ids);
    if (error) {
      throw new Error(`Missing listing deactivation failed: ${error.message}`);
    }
  }
}

async function readActiveListingReferences(
  supabase: SupabaseClient<Database>,
  storeId: number,
): Promise<DisappearedPriceHubListingReference[]> {
  const listings: DisappearedPriceHubListingReference[] = [];
  for (let from = 0; ; from += ACTIVE_LISTING_LOOKUP_PAGE_SIZE) {
    const to = from + ACTIVE_LISTING_LOOKUP_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('module_store_listings')
      .select('id,module_id,product_url')
      .eq('store_id', storeId)
      .eq('active', true)
      .range(from, to);
    if (error) {
      throw new Error(`Active listing lookup failed: ${error.message}`);
    }

    listings.push(...(data ?? []));
    if ((data ?? []).length < ACTIVE_LISTING_LOOKUP_PAGE_SIZE) {
      break;
    }
  }

  return listings;
}


async function readRowsWithoutConflictingProductUrls(
  supabase: SupabaseClient<Database>,
  storeId: number,
  rows: readonly PriceHubSnapshotImportRow[],
): Promise<FilteredPriceHubSnapshotImportRows> {
  const existingListings: ExistingPriceHubListingReference[] = [];
  const lookupUrls = uniqueProductUrlLookupValues(rows);
  for (let start = 0; start < lookupUrls.length; start += PRODUCT_URL_LOOKUP_BATCH_SIZE) {
    const pageUrls = lookupUrls.slice(start, start + PRODUCT_URL_LOOKUP_BATCH_SIZE);
    const { data, error } = await supabase
      .from('module_store_listings')
      .select('module_id,store_id,product_url')
      .in('product_url', pageUrls);
    if (error) {
      throw new Error(`Existing listing lookup failed: ${error.message}`);
    }

    existingListings.push(...(data ?? []));
  }

  return filterRowsWithConflictingProductUrls(rows, existingListings, storeId);
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

export async function readExistingModuleIds(
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

async function readLatestSnapshotsForListings(
  supabase: SupabaseClient<Database>,
  listingIds: readonly number[],
): Promise<LatestSnapshotRow[]> {
  const rows: LatestSnapshotRow[] = [];
  for (let offset = 0; offset < listingIds.length; offset += LATEST_SNAPSHOT_RPC_BATCH_SIZE) {
    const chunk = listingIds.slice(offset, offset + LATEST_SNAPSHOT_RPC_BATCH_SIZE);
    const { data, error } = await supabase.rpc('price_hub_latest_snapshots', { p_listing_ids: [...chunk] });
    if (error) {
      throw new Error(`Latest snapshot lookup failed: ${error.message}`);
    }
    rows.push(...(data ?? []));
  }
  return rows;
}

async function upsertListings(
  supabase: SupabaseClient<Database>,
  storeId: number,
  rows: readonly PriceHubSnapshotImportRow[],
): Promise<UpsertedListingRow[]> {
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
    next_check_at: calculateStaggeredNextCheckAt(now, {
      moduleId: row.moduleId,
      storeId,
      productUrl: row.productUrl,
    }),
    failure_count: 0,
    last_error: null,
    last_raw_meta: row.rawMeta as Json,
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


async function printDryRunDisappearanceDeactivation(
  options: ImportLocalSnapshotsOptions,
  products: readonly NormalizedStoreListingSnapshot[],
  rows: readonly PriceHubSnapshotImportRow[],
): Promise<void> {
  if (!options.fullCatalog) {
    console.log('Dry run: disappearance deactivation skipped; pass --full-catalog only for known complete crawler outputs.');
    return;
  }
  if (!options.supabaseKey) {
    console.log('Dry run: disappearance deactivation not evaluated because no Supabase key was provided for reading active listings.');
    return;
  }

  const supabase = createClient<Database>(options.supabaseUrl, options.supabaseKey, {
    auth: { persistSession: false },
  });
  const summary = await applyDisappearanceDeactivation(
    supabase,
    options.storeSlug,
    readProductUrls(products),
    {
      productCount: products.length,
      importRowCount: rows.length,
      hitMaxProducts: false,
      hasExplicitBounds: false,
    },
    { dryRun: true },
  );
  if (summary.deactivationSkippedReason) {
    console.log(`Dry run: disappearance deactivation skipped: ${summary.deactivationSkippedReason}.`);
    return;
  }
  console.log(`Dry run: would deactivate ${summary.deactivatedListings} missing active listings for ${options.storeSlug}.`);
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
  console.log('Usage: pnpm price-hub:import-local --store=signal-sounds-uk --products=tmp/price-hub/signal-sounds-uk/products.json --matches=tmp/price-hub/signal-sounds-uk/matches.json [--dry-run] [--full-catalog]');
  console.log('--full-catalog enables safe missing-listing deactivation when the products file is known to be an uncapped complete catalog crawl.');
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
