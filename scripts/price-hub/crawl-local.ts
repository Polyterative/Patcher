import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  crawlPriceHubStoreCatalog,
  DEFAULT_CATALOG_MAX_PAGES,
  writeCrawledProducts,
} from './catalog-crawler.ts';
import { type PriceHubModuleInput, writeModuleProductMatches } from './matcher.ts';
import { type ApprovedPriceHubStoreConfig, DEFAULT_PRICE_HUB_MATCH_CONFIG, readApprovedPriceHubStores } from './store-configs.ts';

export interface LocalCrawlerCliOptions {
  store: string;
  maxPages: number;
  maxProducts?: number;
  metadataConcurrency: number;
  out: string;
  modulesPath: string | null;
  minScore: number;
  minScoreOverride?: number;
  includeIgnoredMatches: boolean;
}

export interface LocalCrawlerRunFailure {
  storeSlug: string;
  error: unknown;
}

export interface LocalCrawlerRunResult {
  attemptedStores: number;
  failures: LocalCrawlerRunFailure[];
}

export interface LocalCrawlerRunDeps {
  crawlStoreCatalog: typeof crawlPriceHubStoreCatalog;
  writeProducts: typeof writeCrawledProducts;
  writeMatches: typeof writeModuleProductMatches;
  log: Pick<Console, 'log' | 'warn' | 'error'>;
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const stores = readApprovedPriceHubStores(options.store);
  const modules = options.modulesPath ? await readModules(options.modulesPath) : null;
  const result = await runLocalCrawlerStores(stores, options, modules);

  if (result.failures.length > 0) {
    process.exitCode = 1;
  }
}

export async function runLocalCrawlerStores(
  stores: readonly ApprovedPriceHubStoreConfig[],
  options: LocalCrawlerCliOptions,
  modules: readonly PriceHubModuleInput[] | null,
  deps: LocalCrawlerRunDeps = {
    crawlStoreCatalog: crawlPriceHubStoreCatalog,
    writeProducts: writeCrawledProducts,
    writeMatches: writeModuleProductMatches,
    log: console,
  },
): Promise<LocalCrawlerRunResult> {
  const failures: LocalCrawlerRunFailure[] = [];
  for (const store of stores) {
    try {
      const crawl = await deps.crawlStoreCatalog(store, {
        maxPages: options.maxPages,
        maxProducts: options.maxProducts,
        metadataConcurrency: options.metadataConcurrency,
      });
      const productsPath = await deps.writeProducts(options.out, store.slug, crawl.products);
      const urlCount = crawl.totalProductUrls ? ` after checking ${crawl.totalProductUrls} product URLs` : '';
      deps.log.log(`Wrote ${crawl.products.length} products for ${store.slug}${urlCount} (${crawl.pagesFetched} pages): ${productsPath}`);
      if (crawl.skippedProducts) {
        deps.log.warn(`Skipped ${crawl.skippedProducts} sitemap pages without usable product metadata for ${store.slug}. Sample: ${(crawl.skippedProductUrls ?? []).slice(0, 10).join(', ')}`);
      }
      if (crawl.hitMaxProducts) {
        deps.log.warn(`Stopped ${store.slug} after reaching --max-products=${options.maxProducts}. Omit --max-products for a full metadata crawl.`);
      }

      if (modules) {
        const matchesPath = join(options.out, store.slug, 'matches.json');
        const matchCount = await deps.writeMatches(matchesPath, modules, crawl.products, {
          minScore: options.minScoreOverride,
          store,
          includeIgnored: options.includeIgnoredMatches,
        });
        deps.log.log(`Wrote ${matchCount} match candidates for ${store.slug}: ${matchesPath}`);
      }
    } catch (error: unknown) {
      failures.push({ storeSlug: store.slug, error });
      deps.log.error(`Failed ${store.slug}: ${readErrorMessage(error)}`);
    }
  }

  return {
    attemptedStores: stores.length,
    failures,
  };
}

export function readCliOptions(args: readonly string[]): LocalCrawlerCliOptions {
  const options: LocalCrawlerCliOptions = {
    store: 'all',
    maxPages: DEFAULT_CATALOG_MAX_PAGES,
    metadataConcurrency: 6,
    out: 'tmp/price-hub',
    modulesPath: null,
    minScore: DEFAULT_PRICE_HUB_MATCH_CONFIG.scoreThresholds.reviewCandidate,
    includeIgnoredMatches: false,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      printHelpAndExit();
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
      default:
        throw new Error(`Unknown argument "${key}". Use --help for usage.`);
    }
  }

  return options;
}

async function readModules(path: string): Promise<PriceHubModuleInput[]> {
  const body: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!Array.isArray(body)) {
    throw new Error('--modules must point to a JSON array.');
  }

  return body.map(readModuleInput);
}

function readModuleInput(value: unknown): PriceHubModuleInput {
  if (!isRecord(value)) {
    throw new Error('Every module entry must be an object.');
  }

  if ((typeof value.id !== 'string' && typeof value.id !== 'number') || typeof value.name !== 'string') {
    throw new Error('Every module entry must include string/number id and string name.');
  }

  const manufacturerName = typeof value.manufacturerName === 'string' ? value.manufacturerName : undefined;
  const manufacturer = isRecord(value.manufacturer) && typeof value.manufacturer.name === 'string'
    ? { name: value.manufacturer.name }
    : undefined;

  return {
    id: value.id,
    name: value.name,
    manufacturerName,
    manufacturer,
  };
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

function readErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printHelpAndExit(): never {
  console.log(`Usage: pnpm price-hub:crawl-local --store=after-later-audio|animato-audio|big-city-music|busy-circuits|cicada-sound|clockface-modular|control|detroit-modular|dreadbox|elevator-sound|escape-from-noise|exploding-shed|found-sound|instruo|intellijel|machineroom|martin-pas|milk-audio-store|michigan-synth-works|moog-audio|nano-modules|nightlife-electronics|new-groove|noisebug|patch-point|postmodular|pusherman-productions|robotspeak|rubadub|schlappi-engineering|signal-sounds-uk|signal-sounds-eu|schneidersladen|soundium|synthshop|technosynth|thonk|turnlab|whimsical-raps|wmdevices|zlob-modular|all --max-pages=100 --metadata-concurrency=6 --out=tmp/price-hub --modules=modules.json --min-score=${DEFAULT_PRICE_HUB_MATCH_CONFIG.scoreThresholds.reviewCandidate} --include-ignored-matches=false`);
  console.log('Omit --max-products for a full metadata/sitemap crawl. Use pnpm price-hub:refresh-local for crawl, sanity checks, and live import.');
  process.exit(0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(readErrorMessage(error));
    process.exitCode = 1;
  });
}
