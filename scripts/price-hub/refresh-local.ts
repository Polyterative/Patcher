import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { crawlPriceHubStoreCatalog, DEFAULT_CATALOG_MAX_PAGES, writeCrawledProducts } from './catalog-crawler.ts';
import { DEFAULT_MATCH_MIN_SCORE, type PriceHubModuleInput, writeModuleProductMatches } from './matcher.ts';
import { importRows, readImportRows } from './import-local-snapshots.ts';
import { readPriceHubScriptEnv, readSupabaseReadKey, readSupabaseWriteKey } from './local-env.ts';
import { readApprovedPriceHubStores, type ApprovedPriceHubStoreConfig } from './store-configs.ts';
import type { Database } from '../../src/backend/database.types.ts';

const DEFAULT_SUPABASE_URL = 'https://sozmatmywjpstwidzlss.supabase.co';
const WRITE_KEY_HELP = 'Set SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in your shell, .env, or .env.local at the repository root, or pass --supabase-key=...';
const MODULE_INPUT_HELP = 'Pass --modules=modules.json, or set SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY in .env so the script can fetch approved modules itself.';
const MODULE_FETCH_PAGE_SIZE = 500;

interface RefreshLocalOptions {
  store: string;
  maxPages: number;
  maxProducts?: number;
  metadataConcurrency: number;
  out: string;
  modulesPath: string;
  minScore: number;
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
  warnings: string[];
}

async function main(): Promise<void> {
  const options = readRefreshCliOptions(process.argv.slice(2), readPriceHubScriptEnv());
  if (!options.dryRun && !options.supabaseKey) {
    throw new Error(`Missing Supabase write key. A local Price Hub refresh must import verified data; use --dry-run only for diagnostics. ${WRITE_KEY_HELP}`);
  }

  const stores = readApprovedPriceHubStores(options.store);
  const modules = await resolveModules(options);
  const supabase = options.dryRun
    ? null
    : createClient<Database>(options.supabaseUrl, options.supabaseKey, { auth: { persistSession: false } });
  const summaries: StoreRefreshSummary[] = [];

  for (const store of stores) {
    try {
      summaries.push(await refreshStore(store, modules, options, supabase));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Price Hub refresh failed for ${store.slug}: ${message}`);
      summaries.push({
        storeSlug: store.slug,
        status: 'failed',
        products: 0,
        matchCandidates: 0,
        importRows: 0,
        importedSnapshots: 0,
        upsertedListings: 0,
        warnings: [message],
      });
    }
  }

  printSummary(summaries);
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
    minScore: DEFAULT_MATCH_MIN_SCORE,
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
    minScore: options.minScore,
    includeIgnored: options.includeIgnoredMatches,
  });
  const importRowsForStore = await readImportRows({
    productsPath,
    matchesPath,
    acceptedStatuses: ['strong_candidate'],
  });
  const warnings = readSanityWarnings(store, crawl.products.length, matchCandidates, importRowsForStore.length, crawl.hitMaxProducts === true);
  if (warnings.some(isBlockingWarning)) {
    return {
      storeSlug: store.slug,
      status: 'skipped',
      products: crawl.products.length,
      matchCandidates,
      importRows: importRowsForStore.length,
      importedSnapshots: 0,
      upsertedListings: 0,
      warnings,
    };
  }

  if (options.dryRun) {
    return {
      storeSlug: store.slug,
      status: 'dry_run',
      products: crawl.products.length,
      matchCandidates,
      importRows: importRowsForStore.length,
      importedSnapshots: 0,
      upsertedListings: 0,
      warnings,
    };
  }

  if (!supabase) {
    throw new Error('Live refresh requested without a Supabase client.');
  }

  const importSummary = await importRows(supabase, store.slug, importRowsForStore);
  return {
    storeSlug: store.slug,
    status: 'imported',
    products: crawl.products.length,
    matchCandidates,
    importRows: importRowsForStore.length,
    importedSnapshots: importSummary.insertedSnapshots,
    upsertedListings: importSummary.upsertedListings,
    warnings: [
      ...warnings,
      ...(importSummary.skippedUnknownModules > 0 ? [`Skipped ${importSummary.skippedUnknownModules} rows with unknown module IDs.`] : []),
      ...(importSummary.skippedConflictingListings > 0 ? [`Skipped ${importSummary.skippedConflictingListings} rows with conflicting product URLs.`] : []),
    ],
  };
}

function readSanityWarnings(
  store: ApprovedPriceHubStoreConfig,
  productCount: number,
  matchCandidates: number,
  importRowsForStore: number,
  hitMaxProducts: boolean,
): string[] {
  const warnings: string[] = [];
  if (productCount === 0) {
    warnings.push('BLOCKING: crawled zero products.');
  }
  if (matchCandidates === 0) {
    warnings.push('BLOCKING: generated zero match candidates.');
  }
  if (importRowsForStore === 0) {
    warnings.push('BLOCKING: generated zero accepted import rows.');
  }
  if (hitMaxProducts) {
    warnings.push(`BLOCKING: ${store.slug} reached --max-products before exhausting product URLs.`);
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

function printSummary(summaries: readonly StoreRefreshSummary[]): void {
  for (const summary of summaries) {
    const imported = summary.status === 'imported'
      ? `, imported ${summary.importedSnapshots} snapshots / ${summary.upsertedListings} listings`
      : '';
    console.log(`${summary.storeSlug}: ${summary.status}, ${summary.products} products, ${summary.matchCandidates} candidates, ${summary.importRows} import rows${imported}`);
    for (const warning of summary.warnings) {
      console.warn(`${summary.storeSlug}: ${warning}`);
    }
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
