import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  crawlPriceHubStoreCatalog,
  DEFAULT_CATALOG_MAX_PAGES,
  DEFAULT_SITEMAP_MAX_PRODUCTS,
  writeCrawledProducts,
} from './catalog-crawler.ts';
import { DEFAULT_MATCH_MIN_SCORE, matchModulesToProducts, type PriceHubModuleInput } from './matcher.ts';
import { readApprovedPriceHubStores } from './store-configs.ts';

interface LocalCrawlerCliOptions {
  store: string;
  maxPages: number;
  maxProducts: number;
  metadataConcurrency: number;
  out: string;
  modulesPath: string | null;
  minScore: number;
  includeIgnoredMatches: boolean;
}

async function main(): Promise<void> {
  const options = readCliOptions(process.argv.slice(2));
  const stores = readApprovedPriceHubStores(options.store);
  const modules = options.modulesPath ? await readModules(options.modulesPath) : null;

  for (const store of stores) {
    const crawl = await crawlPriceHubStoreCatalog(store, {
      maxPages: options.maxPages,
      maxProducts: options.maxProducts,
      metadataConcurrency: options.metadataConcurrency,
    });
    const productsPath = await writeCrawledProducts(options.out, store.slug, crawl.products);
    const urlCount = crawl.totalProductUrls ? ` after checking ${crawl.totalProductUrls} product URLs` : '';
    console.log(`Wrote ${crawl.products.length} products for ${store.slug}${urlCount} (${crawl.pagesFetched} pages): ${productsPath}`);
    if (crawl.skippedProducts) {
      console.warn(`Skipped ${crawl.skippedProducts} sitemap pages without usable product metadata for ${store.slug}. Sample: ${(crawl.skippedProductUrls ?? []).join(', ')}`);
    }

    if (modules) {
      const matches = matchModulesToProducts(modules, crawl.products, {
        minScore: options.minScore,
        includeIgnored: options.includeIgnoredMatches,
      });
      const matchesPath = join(options.out, store.slug, 'matches.json');
      await writeFile(matchesPath, `${JSON.stringify(matches, null, 2)}\n`, 'utf8');
      console.log(`Wrote ${matches.length} match candidates for ${store.slug}: ${matchesPath}`);
    }
  }
}

export function readCliOptions(args: readonly string[]): LocalCrawlerCliOptions {
  const options: LocalCrawlerCliOptions = {
    store: 'all',
    maxPages: DEFAULT_CATALOG_MAX_PAGES,
    maxProducts: DEFAULT_SITEMAP_MAX_PRODUCTS,
    metadataConcurrency: 6,
    out: 'tmp/price-hub',
    modulesPath: null,
    minScore: DEFAULT_MATCH_MIN_SCORE,
    includeIgnoredMatches: true,
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

function printHelpAndExit(): never {
  console.log('Usage: pnpm price-hub:crawl-local --store=after-later-audio|busy-circuits|cicada-sound|clockface-modular|control|detroit-modular|dreadbox|elevator-sound|escape-from-noise|exploding-shed|found-sound|instruo|intellijel|machineroom|milk-audio-store|michigan-synth-works|moog-audio|nano-modules|nightlife-electronics|new-groove|noisebug|patch-point|postmodular|pusherman-productions|robotspeak|rubadub|schlappi-engineering|signal-sounds-uk|signal-sounds-eu|schneidersladen|soundium|synthshop|thonk|wmdevices|zlob-modular|all --max-pages=100 --max-products=100 --metadata-concurrency=6 --out=tmp/price-hub --modules=modules.json --min-score=0.72 --include-ignored-matches=false');
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
