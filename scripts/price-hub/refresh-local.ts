import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { crawlPriceHubStoreCatalog, DEFAULT_CATALOG_MAX_PAGES, writeCrawledProducts } from './catalog-crawler.ts';
import { type PriceHubModuleInput, writeModuleProductMatches } from './matcher.ts';
import { applyDisappearanceDeactivation, importRows, readImportRows } from './import-local-snapshots.ts';
import { assertSupabaseWriteKeyCanWrite, readPriceHubScriptEnv, readSupabaseReadKey, readSupabaseWriteKey } from './local-env.ts';
import { DEFAULT_PRICE_HUB_MATCH_CONFIG, readApprovedPriceHubStores, type ApprovedPriceHubStoreConfig } from './store-configs.ts';
import type { Database } from '../../src/backend/database.types.ts';

const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const WRITE_KEY_HELP = 'Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY in your shell, .env, .env.local, or PRICE_HUB_ENV_FILE, or pass --supabase-key=...';
const MODULE_INPUT_HELP = 'Pass --modules=modules.json, or set SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY in .env, .env.local, or PRICE_HUB_ENV_FILE so the script can fetch approved modules itself.';
const MODULE_FETCH_PAGE_SIZE = 500;

interface RefreshLocalOptions {
  store: string;
  maxPages: number;
  maxProducts?: number;
  metadataConcurrency: number;
  out: string;
  modulesPath: string;
  minScore: number;
  minScoreOverride?: number;
  includeIgnoredMatches: boolean;
  dryRun: boolean;
  supabaseUrl: string;
  supabaseKey: string;
  supabaseReadKey: string;
}

interface SupabaseModuleRow {
  id: number;
  name: string;
  manufacturer: { name: string | null } | { name: string | null }[] | null;
}

interface StoreRefreshSummary {
  storeSlug: string;
  status: 'imported' | 'dry_run' | 'skipped' | 'failed';
  products: number;
  matchCandidates: number;
  importRows: number;
  importedSnapshots: number;
  upsertedListings: number;
  deactivatedListings: number;
  warnings: string[];
}

async function main(): Promise<void> {
  const options = readRefreshCliOptions(process.argv.slice(2), readPriceHubScriptEnv());
  if (!options.dryRun) {
    assertSupabaseWriteKeyCanWrite(options.supabaseKey, WRITE_KEY_HELP);
  }

  const stores = readApprovedPriceHubStores(options.store);
  const modules = await resolveModules(options);
  const supabase = options.dryRun
    ? (options.supabaseReadKey ? createClient<Database>(options.supabaseUrl, options.supabaseReadKey, { auth: { persistSession: false } }) : null)
    : createClient<Database>(options.supabaseUrl, options.supabaseKey, { auth: { persistSession: false } });
  const summaries: StoreRefreshSummary[] = [];

  for (const store of stores) {
    try {
      const summary = await refreshStore(store, modules, options, supabase);
      summaries.push(summary);
      printStoreSummary(summary);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Price Hub refresh failed for ${store.slug}: ${message}`);
      const summary: StoreRefreshSummary = {
        storeSlug: store.slug,
        status: 'failed',
        products: 0,
        matchCandidates: 0,
        importRows: 0,
        importedSnapshots: 0,
        upsertedListings: 0,
        deactivatedListings: 0,
        warnings: [message],
      };
      summaries.push(summary);
      printStoreSummary(summary);
    }
  }

  printSummaryTotals(summaries);
  if (summaries.some((summary) => summary.status === 'failed' || summary.status === 'skipped')) {
    process.exitCode = 1;
  }
}

export function readRefreshCliOptions(args: readonly string[], env: NodeJS.ProcessEnv = process.env): RefreshLocalOptions {
  const options: RefreshLocalOptions = {
    store: 'all',
    maxPages: DEFAULT_CATALOG_MAX_PAGES,
    metadataConcurrency: 6,
    out: 'tmp/price-hub',
    modulesPath: '',
    minScore: DEFAULT_PRICE_HUB_MATCH_CONFIG.scoreThresholds.reviewCandidate,
    includeIgnoredMatches: false,
    dryRun: false,
    supabaseUrl: stripTrailingSlash(env.SUPABASE_URL ?? DEFAULT_SUPABASE_URL),
    supabaseKey: readSupabaseWriteKey(env),
    supabaseReadKey: readSupabaseReadKey(env),
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    const [key, value] = readKeyValueArg(arg);
    switch (key) {
      case '--store':
        options.store = value;
        break;
      case '--max-pages':
        options.maxPages = readPositiveInteger(value, '--max-pages');
        break;
      case '--max-products':
        options.maxProducts = readPositiveInteger(value, '--max-products');
        break;
      case '--metadata-concurrency':
        options.metadataConcurrency = readPositiveInteger(value, '--metadata-concurrency');
        break;
      case '--out':
        options.out = value;
        break;
      case '--modules':
        options.modulesPath = value;
        break;
      case '--min-score':
        options.minScore = readScore(value, '--min-score');
        options.minScoreOverride = options.minScore;
        break;
      case '--include-ignored-matches':
        options.includeIgnoredMatches = readBoolean(value, '--include-ignored-matches');
        break;
      case '--supabase-url':
        options.supabaseUrl = stripTrailingSlash(value);
        break;
      case '--supabase-key':
        options.supabaseKey = value;
        break;
      default:
        throw new Error(`Unknown argument "${key}". Use --help for usage.`);
    }
  }

  readApprovedPriceHubStores(options.store);
  return options;
}

async function refreshStore(
  store: ApprovedPriceHubStoreConfig,
  modules: readonly PriceHubModuleInput[],
  options: RefreshLocalOptions,
  supabase: ReturnType<typeof createClient<Database>> | null,
): Promise<StoreRefreshSummary> {
  const crawl = await crawlPriceHubStoreCatalog(store, {
    maxPages: options.maxPages,
    maxProducts: options.maxProducts,
    metadataConcurrency: options.metadataConcurrency,
  });
  const productsPath = await writeCrawledProducts(options.out, store.slug, crawl.products);
  const matchesPath = join(options.out, store.slug, 'matches.json');
  const matchCandidates = await writeModuleProductMatches(matchesPath, modules, crawl.products, {
    minScore: options.minScoreOverride,
    store,
    includeIgnored: options.includeIgnoredMatches,
  });
  const importRowsForStore = await readImportRows({
    productsPath,
    matchesPath,
    acceptedStatuses: ['strong_candidate'],
  });
  const warnings = readSanityWarnings(
    store,
    crawl.products.length,
    matchCandidates,
    importRowsForStore.length,
    crawl.hitMaxProducts === true,
    options.dryRun || options.store !== 'all',
    {
      hitMaxPages: crawl.hitMaxPages === true,
      hitMaxSitemapFiles: crawl.hitMaxSitemapFiles === true,
      skippedProducts: crawl.skippedProducts ?? 0,
      canRefreshObservedActiveListings: supabase !== null && crawl.products.length > 0,
    },
  );
  if (warnings.some(isBlockingWarning)) {
    return {
      storeSlug: store.slug,
      status: 'skipped',
      products: crawl.products.length,
      matchCandidates,
      importRows: importRowsForStore.length,
      importedSnapshots: 0,
      upsertedListings: 0,
      deactivatedListings: 0,
      warnings,
    };
  }

  if (options.dryRun) {
    const disappearanceSummary = supabase
      ? await applyDisappearanceDeactivation(
          supabase,
          store.slug,
          readProductUrls(crawl.products),
          readDisappearanceEvidence(crawl, importRowsForStore.length, options),
          { dryRun: true },
        )
      : { deactivatedListings: 0, deactivationSkippedReason: 'no Supabase read key available for dry-run active listing lookup' };
    return {
      storeSlug: store.slug,
      status: 'dry_run',
      products: crawl.products.length,
      matchCandidates,
      importRows: importRowsForStore.length,
      importedSnapshots: 0,
      upsertedListings: 0,
      deactivatedListings: disappearanceSummary.deactivatedListings,
      warnings: [
        ...warnings,
        ...(disappearanceSummary.deactivationSkippedReason
          ? [`Skipped disappearance deactivation dry-run: ${disappearanceSummary.deactivationSkippedReason}.`]
          : [`Would deactivate ${disappearanceSummary.deactivatedListings} missing active listings.`]),
      ],
    };
  }

  if (!supabase) {
    throw new Error('Live refresh requested without a Supabase client.');
  }

  const importSummary = await importRows(supabase, store.slug, importRowsForStore, {
    productUrls: readProductUrls(crawl.products),
    evidence: readDisappearanceEvidence(crawl, importRowsForStore.length, options),
  }, crawl.products);
  return {
    storeSlug: store.slug,
    status: 'imported',
    products: crawl.products.length,
    matchCandidates,
    importRows: importRowsForStore.length,
    importedSnapshots: importSummary.insertedSnapshots,
    upsertedListings: importSummary.upsertedListings,
    deactivatedListings: importSummary.deactivatedListings,
    warnings: [
      ...warnings,
      ...(importSummary.deactivationSkippedReason ? [`Skipped disappearance deactivation: ${importSummary.deactivationSkippedReason}.`] : []),
      ...(importSummary.deactivatedListings > 0 ? [`Deactivated ${importSummary.deactivatedListings} missing active listings.`] : []),
      ...(importSummary.skippedUnknownModules > 0 ? [`Skipped ${importSummary.skippedUnknownModules} rows with unknown module IDs.`] : []),
      ...(importSummary.skippedConflictingListings > 0 ? [`Skipped ${importSummary.skippedConflictingListings} rows with conflicting product URLs.`] : []),
    ],
  };
}

function readDisappearanceEvidence(
  crawl: {
    products: readonly unknown[];
    hitMaxProducts?: boolean;
    hitMaxPages?: boolean;
    hitMaxSitemapFiles?: boolean;
    skippedProducts?: number;
    skippedProductUrls?: readonly string[];
    skippedGoneProductUrls?: readonly string[];
  },
  importRowCount: number,
  options: RefreshLocalOptions,
) {
  return {
    productCount: crawl.products.length,
    importRowCount,
    hitMaxProducts: crawl.hitMaxProducts === true,
    hitMaxPages: crawl.hitMaxPages === true,
    hitMaxSitemapFiles: crawl.hitMaxSitemapFiles === true,
    skippedProducts: crawl.skippedProducts ?? 0,
    skippedProductUrls: crawl.skippedProductUrls ?? [],
    skippedGoneProductUrls: crawl.skippedGoneProductUrls ?? [],
    hasExplicitBounds: options.maxProducts !== undefined || options.maxPages !== DEFAULT_CATALOG_MAX_PAGES,
  };
}

function readProductUrls(products: readonly { productUrl: string | null }[]): string[] {
  return products
    .map((product) => product.productUrl)
    .filter((productUrl): productUrl is string => typeof productUrl === 'string' && productUrl.trim().length > 0);
}

export function readSanityWarnings(
  store: ApprovedPriceHubStoreConfig,
  productCount: number,
  matchCandidates: number,
  importRowsForStore: number,
  hitMaxProducts: boolean,
  allowBoundedPartialImport = false,
  incompleteCrawl: {
    hitMaxPages?: boolean;
    hitMaxSitemapFiles?: boolean;
    skippedProducts?: number;
    canRefreshObservedActiveListings?: boolean;
  } = {},
): string[] {
  const warnings: string[] = [];
  if (productCount === 0) {
    warnings.push('BLOCKING: crawled zero products.');
  }
  if (matchCandidates === 0) {
    warnings.push(incompleteCrawl.canRefreshObservedActiveListings
      ? `${store.slug} generated zero match candidates; checking observed active listings before import.`
      : 'BLOCKING: generated zero match candidates.');
  }
  if (importRowsForStore === 0) {
    warnings.push(incompleteCrawl.canRefreshObservedActiveListings
      ? `${store.slug} generated zero accepted import rows; checking observed active listings before import.`
      : 'BLOCKING: generated zero accepted import rows.');
  }
  if (hitMaxProducts) {
    warnings.push(allowBoundedPartialImport
      ? `${store.slug} reached --max-products before exhausting product URLs; importing this bounded partial crawl.`
      : `BLOCKING: ${store.slug} reached --max-products before exhausting product URLs; rerun without --max-products or target one store explicitly.`);
  }
  if (incompleteCrawl.hitMaxPages) {
    warnings.push(allowBoundedPartialImport
      ? `${store.slug} reached the page limit before proving catalog exhaustion; importing this bounded partial crawl.`
      : `BLOCKING: ${store.slug} reached the page limit before proving catalog exhaustion; target one store explicitly before importing partial data.`);
  }
  if (incompleteCrawl.hitMaxSitemapFiles) {
    warnings.push(allowBoundedPartialImport
      ? `${store.slug} reached the sitemap file limit before proving catalog exhaustion; importing this bounded partial crawl.`
      : `BLOCKING: ${store.slug} reached the sitemap file limit before proving catalog exhaustion; target one store explicitly before importing partial data.`);
  }
  if ((incompleteCrawl.skippedProducts ?? 0) > 0) {
    warnings.push(`${store.slug} skipped ${incompleteCrawl.skippedProducts} product pages without usable metadata; importing matched rows while disappearance deactivation remains guarded.`);
  }
  return warnings;
}

function isBlockingWarning(warning: string): boolean {
  return warning.startsWith('BLOCKING:');
}

async function readModules(path: string): Promise<PriceHubModuleInput[]> {
  const body: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(body)) {
    throw new Error('--modules must point to a JSON array.');
  }
  return body.map(readModuleInput);
}

async function resolveModules(options: RefreshLocalOptions): Promise<PriceHubModuleInput[]> {
  if (options.modulesPath) {
    return readModules(options.modulesPath);
  }
  if (!options.supabaseReadKey) {
    throw new Error(`Missing module input. ${MODULE_INPUT_HELP}`);
  }

  const supabase = createClient<Database>(options.supabaseUrl, options.supabaseReadKey, {
    auth: { persistSession: false },
  });
  return fetchModulesFromSupabase(supabase);
}

export async function fetchModulesFromSupabase(
  supabase: Pick<ReturnType<typeof createClient<Database>>, 'from'>,
): Promise<PriceHubModuleInput[]> {
  const modules: PriceHubModuleInput[] = [];
  for (let from = 0; ; from += MODULE_FETCH_PAGE_SIZE) {
    const to = from + MODULE_FETCH_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('modules')
      .select('id,name,manufacturer:manufacturerId(name)')
      .eq('isApproved', true)
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to fetch Price Hub module input from Supabase: ${error.message}`);
    }
    const page = (data ?? []).map(readSupabaseModuleInput);
    modules.push(...page);
    if (page.length < MODULE_FETCH_PAGE_SIZE) {
      break;
    }
  }

  if (modules.length === 0) {
    throw new Error('Fetched zero approved modules for Price Hub matching.');
  }
  return modules;
}

function readSupabaseModuleInput(value: unknown): PriceHubModuleInput {
  if (!isRecord(value)) {
    throw new Error('Every Supabase module row must be an object.');
  }
  if (typeof value.id !== 'number' || typeof value.name !== 'string') {
    throw new Error('Every Supabase module row must include numeric id and string name.');
  }
  const manufacturer = Array.isArray(value.manufacturer)
    ? value.manufacturer[0]
    : value.manufacturer;
  const manufacturerName = isRecord(manufacturer) && typeof manufacturer.name === 'string'
    ? manufacturer.name
    : undefined;
  return {
    id: value.id,
    name: value.name,
    manufacturerName,
    manufacturer: manufacturerName ? { name: manufacturerName } : undefined,
  };
}

function readModuleInput(value: unknown): PriceHubModuleInput {
  if (!isRecord(value)) {
    throw new Error('Every module entry must be an object.');
  }
  if ((typeof value.id !== 'string' && typeof value.id !== 'number') || typeof value.name !== 'string') {
    throw new Error('Every module entry must include string/number id and string name.');
  }
  return {
    id: value.id,
    name: value.name,
    manufacturerName: typeof value.manufacturerName === 'string' ? value.manufacturerName : undefined,
    manufacturer: isRecord(value.manufacturer) && typeof value.manufacturer.name === 'string'
      ? { name: value.manufacturer.name }
      : undefined,
  };
}

function printStoreSummary(summary: StoreRefreshSummary): void {
  const imported = summary.status === 'imported'
    ? `, imported ${summary.importedSnapshots} snapshots / ${summary.upsertedListings} listings, deactivated ${summary.deactivatedListings}`
    : '';
  console.log(`${summary.storeSlug}: ${summary.status}, ${summary.products} products, ${summary.matchCandidates} candidates, ${summary.importRows} import rows${imported}`);
  for (const warning of summary.warnings) {
    console.warn(`${summary.storeSlug}: ${warning}`);
  }
}

function printSummaryTotals(summaries: readonly StoreRefreshSummary[]): void {
  const importedSnapshots = summaries.reduce((sum, summary) => sum + summary.importedSnapshots, 0);
  const upsertedListings = summaries.reduce((sum, summary) => sum + summary.upsertedListings, 0);
  const deactivatedListings = summaries.reduce((sum, summary) => sum + summary.deactivatedListings, 0);
  const importedStores = summaries.filter((summary) => summary.status === 'imported').length;
  const failedStores = summaries.filter((summary) => summary.status === 'failed').length;
  const skippedStores = summaries.filter((summary) => summary.status === 'skipped').length;
  console.log(`Price Hub refresh totals: ${importedStores} imported, ${skippedStores} skipped, ${failedStores} failed, ${importedSnapshots} snapshots / ${upsertedListings} listings, ${deactivatedListings} deactivated.`);
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

function readPositiveInteger(value: string, fieldName: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  const parsed = Number.parseInt(value, 10);
  if (parsed < 1) {
    throw new Error(`${fieldName} must be a positive integer.`);
  }
  return parsed;
}

function readScore(value: string, fieldName: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`${fieldName} must be a number from 0 to 1.`);
  }
  return parsed;
}

function readBoolean(value: string, fieldName: string): boolean {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`${fieldName} must be true or false.`);
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function printHelpAndExit(): never {
  console.log('Usage: pnpm price-hub:refresh-local --store=all --out=tmp/price-hub [--modules=modules.json] [--supabase-key=service-role-key]');
  console.log(`Runs crawl, matching, sanity checks, and live Supabase import. ${MODULE_INPUT_HELP}`);
  console.log(`Requires a Supabase write key unless --dry-run is explicitly supplied. ${WRITE_KEY_HELP}`);
  process.exit(0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  });
}
