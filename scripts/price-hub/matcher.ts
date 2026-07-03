import type { NormalizedStoreListingSnapshot } from '../../supabase/functions/_shared/price-hub/woocommerce-store-api.ts';

export const DEFAULT_MATCH_MIN_SCORE = 0.72;

export type PriceHubMatchStatus = 'strong_candidate' | 'review_candidate' | 'ignored';

export interface PriceHubModuleInput {
  id: string | number;
  name: string;
  manufacturerName?: string | null;
  manufacturer?: {
    name?: string | null;
  } | null;
}

export interface PriceHubMatchCandidate {
  moduleId: string;
  moduleName: string;
  manufacturerName: string;
  productUrl: string | null;
  productName: string | null;
  score: number;
  status: PriceHubMatchStatus;
  reasons: string[];
}

interface PriceHubMatchOptions {
  minScore?: number;
  includeIgnored?: boolean;
}

const NOISE_TERMS = [
  'accessory',
  'accessories',
  'b-stock',
  'b stock',
  'bourns',
  'bundle',
  'case',
  'cable',
  'cables',
  'cap',
  'consignment',
  'cover',
  'covers',
  'deposit',
  'embroidered',
  'ex-demo',
  'ex demo',
  'faceplate',
  'frontpanel',
  'guide',
  'hat',
  'hoodie',
  'kit',
  'kitbag',
  'kitbags',
  'manual',
  'memory card',
  'no-longer-available',
  'no longer available',
  'occasione',
  'open-box',
  'open box',
  'opening soon',
  'panel',
  'panel set',
  'parts',
  'pcb',
  'pcb panel',
  'pedal',
  'potentiometer',
  'potentiometers',
  'pre-order',
  'pre order',
  'preorder',
  'prenotazione',
  'preordine',
  'pre-owned',
  'pre owned',
  'power adapter',
  'refurbished',
  'replacement parts',
  'special-order',
  'special order',
  'spares',
  'stackcable',
  'sticker',
  'stickers',
  'slide pot',
  'slider',
  'slipmat',
  't-shirt',
  't shirt',
  'tee',
  'used',
  'usato',
];
const GENERIC_MODULE_NAMES = new Set([
  'adsr',
  'case',
  'filter',
  'input',
  'kit',
  'lfo',
  'manual',
  'mixer',
  'mix',
  'mult',
  'output',
  'panel',
  'quad',
  'switch',
  'vca',
]);

const MANUFACTURER_NAME_ALIASES = new Map<string, readonly string[]>([
  ['alm', ['ALM Busy Circuits']],
  ['alm-busy-circuits', ['ALM']],
]);

export function matchModulesToProducts(
  modules: readonly PriceHubModuleInput[],
  products: readonly NormalizedStoreListingSnapshot[],
  options: PriceHubMatchOptions = {},
): PriceHubMatchCandidate[] {
  const minScore = options.minScore ?? DEFAULT_MATCH_MIN_SCORE;
  const includeIgnored = options.includeIgnored ?? true;
  const candidates: PriceHubMatchCandidate[] = [];
  const productProfiles = products.map(readProductProfile);

  for (const moduleInput of modules) {
    const moduleProfile = readModuleProfile(moduleInput);
    if (!moduleProfile) {
      continue;
    }

    for (const productProfile of productProfiles) {
      if (!couldMatchProduct(moduleProfile, productProfile)) {
        continue;
      }

      const candidate = scoreProductForModule(moduleProfile, productProfile, minScore);
      if (candidate.score > 0 && (includeIgnored || candidate.status !== 'ignored')) {
        candidates.push(candidate);
      }
    }
  }

  return candidates
    .sort((left, right) => right.score - left.score || left.moduleName.localeCompare(right.moduleName));
}

interface ModuleProfile {
  id: string;
  name: string;
  manufacturerName: string;
  modulePhrase: string;
  manufacturerPhrase: string;
  moduleSlug: string;
  manufacturerSlug: string;
  combinedSlug: string;
  moduleTokens: string[];
  manufacturerTokens: string[];
  moduleCodeAliases: string[];
  isGenericName: boolean;
}

interface ProductProfile {
  product: NormalizedStoreListingSnapshot;
  productName: string;
  productBrandPhrase: string;
  productBrandSlug: string;
  productSlug: string;
  productNamePhrase: string;
  productNameSlug: string;
  searchableSlug: string;
  searchablePhrase: string;
  noisePhrase: string;
  noiseSlug: string;
  noiseTokens: Set<string>;
  searchableTokens: Set<string>;
}

function readProductProfile(product: NormalizedStoreListingSnapshot): ProductProfile {
  const productName = product.productName ?? '';
  const productBrand = readProductBrand(product);
  const productBrandSlug = slugify(productBrand);
  const productSlug = readProductSlug(product);
  const productNameSlug = slugify(productName);
  const searchableSlug = [productSlug, productNameSlug, productBrandSlug].filter((part) => part.length > 0).join(' ');
  const noiseText = readProductNoiseText(product);
  const noiseSlug = slugify(`${productName} ${productSlug} ${noiseText}`);

  return {
    product,
    productName,
    productBrandPhrase: normalizePhrase(productBrand),
    productBrandSlug,
    productSlug,
    productNamePhrase: normalizePhrase(productName),
    productNameSlug,
    searchableSlug,
    searchablePhrase: normalizePhrase(`${productName} ${productSlug} ${productBrand}`),
    noisePhrase: normalizePhrase(`${productName} ${productSlug} ${noiseText}`),
    noiseSlug,
    noiseTokens: tokenSet(noiseSlug),
    searchableTokens: tokenSet(searchableSlug),
  };
}

function couldMatchProduct(moduleProfile: ModuleProfile, productProfile: ProductProfile): boolean {
  return includesPhrase(productProfile.searchablePhrase, moduleProfile.manufacturerPhrase)
    || includesPhrase(productProfile.searchableSlug, moduleProfile.manufacturerSlug)
    || includesPhrase(productProfile.searchablePhrase, moduleProfile.modulePhrase)
    || includesPhrase(productProfile.searchableSlug, moduleProfile.moduleSlug)
    || includesPhrase(productProfile.searchableSlug, moduleProfile.combinedSlug)
    || moduleProfile.moduleCodeAliases.some((alias) => includesPhrase(productProfile.searchableSlug, alias))
    || hasAllTokens(moduleProfile.moduleTokens, productProfile.searchableTokens)
    || hasAllTokens(moduleProfile.manufacturerTokens, productProfile.searchableTokens);
}

function scoreProductForModule(
  moduleProfile: ModuleProfile,
  productProfile: ProductProfile,
  minScore: number,
): PriceHubMatchCandidate {
  const product = productProfile.product;
  const reasons: string[] = [];
  let score = 0;

  const manufacturerMatched = includesPhrase(productProfile.searchablePhrase, moduleProfile.manufacturerPhrase)
    || includesPhrase(productProfile.searchableSlug, moduleProfile.manufacturerSlug);
  const moduleNameMatched = includesPhrase(productProfile.searchablePhrase, moduleProfile.modulePhrase)
    || includesPhrase(productProfile.searchableSlug, moduleProfile.moduleSlug);
  const moduleCodeAliasMatched = moduleProfile.moduleCodeAliases.some((alias) => includesPhrase(productProfile.searchableSlug, alias));
  const productBrandMatched = includesPhrase(productProfile.productBrandPhrase, moduleProfile.manufacturerPhrase);
  const moduleTitleMatched = includesPhrase(productProfile.productNamePhrase, moduleProfile.modulePhrase)
    || includesPhrase(productProfile.productNameSlug, moduleProfile.moduleSlug);

  if (includesPhrase(productProfile.productNamePhrase, moduleProfile.manufacturerPhrase)) {
    score += 0.35;
    reasons.push('manufacturer phrase found in product name');
  } else if (productBrandMatched) {
    score += 0.35;
    reasons.push('manufacturer phrase found in product brand');
  } else if (includesPhrase(productProfile.searchableSlug, moduleProfile.manufacturerSlug)) {
    score += 0.2;
    reasons.push('manufacturer phrase found in product slug');
  }

  if (includesPhrase(productProfile.productNamePhrase, moduleProfile.modulePhrase)) {
    score += 0.4;
    reasons.push('module phrase found in product name');
  } else if (includesPhrase(productProfile.searchableSlug, moduleProfile.moduleSlug)) {
    score += 0.25;
    reasons.push('module phrase found in product slug');
  }

  if (moduleProfile.combinedSlug.length > 0 && includesPhrase(productProfile.searchableSlug, moduleProfile.combinedSlug)) {
    score += 0.3;
    reasons.push('combined manufacturer and module slug found');
  }

  if (productBrandMatched && moduleTitleMatched) {
    score += 0.15;
    reasons.push('vendor-backed exact module title');
  }

  if (!moduleNameMatched && manufacturerMatched && moduleCodeAliasMatched) {
    score += 0.45;
    reasons.push('manufacturer-supported module code alias found');
  }

  if (manufacturerMatched && moduleCodeAliasMatched) {
    score += 0.25;
    reasons.push('module code alias found with manufacturer support');
  }

  const moduleCoverage = tokenCoverage(moduleProfile.moduleTokens, productProfile.searchableTokens);
  if (!moduleNameMatched && moduleCoverage === 1) {
    score += 0.16;
    reasons.push('all module tokens found');
  }

  const manufacturerCoverage = tokenCoverage(moduleProfile.manufacturerTokens, productProfile.searchableTokens);
  if (!manufacturerMatched && manufacturerCoverage === 1) {
    score += 0.1;
    reasons.push('all manufacturer tokens found');
  }

  const noiseHits = findNoiseHits(productProfile);
  if (noiseHits.length > 0) {
    const penalty = Math.min(0.8, noiseHits.length * 0.65);
    score -= penalty;
    reasons.push(`noise penalty: ${noiseHits.join(', ')}`);
  }

  if (moduleProfile.isGenericName && !manufacturerMatched) {
    score = Math.min(score, 0.35);
    reasons.push('generic module name requires manufacturer support');
  }

  score = roundScore(Math.max(0, Math.min(1, score)));

  return {
    moduleId: moduleProfile.id,
    moduleName: moduleProfile.name,
    manufacturerName: moduleProfile.manufacturerName,
    productUrl: product.productUrl,
    productName: product.productName,
    score,
    status: score >= 0.86 ? 'strong_candidate' : score >= minScore ? 'review_candidate' : 'ignored',
    reasons,
  };
}

function readModuleProfile(moduleInput: PriceHubModuleInput): ModuleProfile | null {
  const moduleName = normalizeSourceText(moduleInput.name);
  const manufacturerName = normalizeSourceText(moduleInput.manufacturerName ?? moduleInput.manufacturer?.name ?? '');
  if (!moduleName || !manufacturerName) {
    return null;
  }

  const moduleSlug = slugify(moduleName);
  const manufacturerSlug = slugify(manufacturerName);
  const moduleTokens = tokenize(moduleSlug);
  const manufacturerTokens = tokenize(manufacturerSlug);
  const moduleCodeAliases = readModuleCodeAliases(moduleSlug);

  return {
    id: String(moduleInput.id),
    name: moduleName,
    manufacturerName,
    modulePhrase: normalizePhrase(moduleName),
    manufacturerPhrase: normalizePhrase(manufacturerName),
    moduleSlug,
    manufacturerSlug,
    combinedSlug: [manufacturerSlug, moduleSlug].filter((part) => part.length > 0).join('-'),
    moduleTokens,
    manufacturerTokens,
    moduleCodeAliases,
    isGenericName: moduleTokens.length <= 1 && (moduleSlug.length <= 4 || GENERIC_MODULE_NAMES.has(moduleSlug)),
  };
}

function readModuleCodeAliases(moduleSlug: string): string[] {
  const compactModuleSlug = moduleSlug.replace(/-/g, '');
  const compactCodeMatch = /^([a-z]+)([0-9][a-z0-9]*)$/.exec(compactModuleSlug);
  if (!compactCodeMatch) {
    return [];
  }

  const [, prefix, code] = compactCodeMatch;
  if (/^\d+hp$/.test(code)) {
    return [];
  }

  const aliases = [`${prefix}-${code}`, `${prefix}${code}`];
  if (/[a-z]/.test(code)) {
    aliases.push(code);
  }
  const codeWithoutTrailingU = code.endsWith('u') ? code.slice(0, -1) : '';
  if (codeWithoutTrailingU.length >= 3) {
    aliases.push(`${prefix}-${codeWithoutTrailingU}`, `${prefix}${codeWithoutTrailingU}`);
    if (/[a-z]/.test(codeWithoutTrailingU)) {
      aliases.push(codeWithoutTrailingU);
    }
  }

  return uniqueStrings(aliases.filter((alias) => /\d/.test(alias) && alias.length >= 3));
}

function readProductSlug(product: NormalizedStoreListingSnapshot): string {
  const slug = product.rawMeta.slug;
  return typeof slug === 'string' ? slug : '';
}

function readProductBrand(product: NormalizedStoreListingSnapshot): string {
  const parts: string[] = [];
  for (const key of ['vendor', 'brand', 'manufacturer']) {
    const value = product.rawMeta[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      parts.push(...readManufacturerNameVariants(value));
    }
  }

  return uniqueStrings(parts).join(' ');
}

function readManufacturerNameVariants(value: string): string[] {
  const normalizedValue = normalizeSourceText(value);
  if (!normalizedValue) {
    return [];
  }

  return [normalizedValue, ...(MANUFACTURER_NAME_ALIASES.get(slugify(normalizedValue)) ?? [])];
}

function normalizeSourceText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizePhrase(value: string): string {
  return ` ${slugify(value).replace(/-/g, ' ')} `.replace(/\s+/g, ' ');
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function tokenize(slug: string): string[] {
  return slug.split('-').filter((token) => token.length > 0);
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function tokenSet(slug: string): Set<string> {
  return new Set(tokenize(slug));
}

function findNoiseHits(productProfile: ProductProfile): string[] {
  return NOISE_TERMS.filter((term) => {
    if (!term.includes('-') && !term.includes(' ')) {
      return productProfile.noiseTokens.has(term);
    }

    const phrase = normalizePhrase(term);
    const slug = slugify(term);
    return includesPhrase(productProfile.noisePhrase, phrase)
      || includesPhrase(productProfile.noiseSlug, slug);
  });
}

function readProductNoiseText(product: NormalizedStoreListingSnapshot): string {
  const matchNoiseText = product.rawMeta.matchNoiseText;
  if (typeof matchNoiseText === 'string') {
    return matchNoiseText;
  }

  const tags = product.rawMeta.tags;
  const productType = product.rawMeta.productType;
  const selectedVariantTitle = product.rawMeta.selectedVariantTitle;
  const parts: string[] = [];
  if (Array.isArray(tags)) {
    parts.push(...tags.filter((tag): tag is string => typeof tag === 'string'));
  }
  if (typeof productType === 'string') {
    parts.push(productType);
  }
  if (typeof selectedVariantTitle === 'string') {
    parts.push(selectedVariantTitle);
  }
  return parts.join(' ');
}

function tokenCoverage(tokens: readonly string[], searchableTokens: ReadonlySet<string>): number {
  if (tokens.length === 0) {
    return 0;
  }

  const hits = tokens.filter((token) => searchableTokens.has(token)).length;
  return hits / tokens.length;
}

function hasAllTokens(tokens: readonly string[], searchableTokens: ReadonlySet<string>): boolean {
  return tokens.length > 0 && tokens.every((token) => searchableTokens.has(token));
}

function includesPhrase(source: string, phrase: string): boolean {
  return phrase.trim().length > 0 && source.includes(phrase);
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}
