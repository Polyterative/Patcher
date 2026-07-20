import { parsePriceHubDecimalAmountToMinorUnits } from './currency-minor-units.ts';

export type SnapshotAvailability = 'in_stock' | 'out_of_stock' | 'preorder' | 'backorder' | 'discontinued' | 'unknown';

export interface NormalizedStoreListingSnapshot {
  priceAmountMinor: number | null;
  currency: string | null;
  availability: SnapshotAvailability;
  productName: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  rawMeta: Record<string, unknown>;
}

interface WooCommerceStoreApiPrices {
  price?: string | number | null;
  regular_price?: string | number | null;
  sale_price?: string | number | null;
  currency_code?: string | null;
}

interface WooCommerceStoreApiImage {
  src?: string | null;
}

interface WooCommerceStoreApiTerm {
  name?: string | null;
  slug?: string | null;
  link?: string | null;
}

interface WooCommerceStoreApiStockAvailability {
  text?: string | null;
  class?: string | null;
}

export interface WooCommerceStoreApiProduct {
  id?: number | string | null;
  name?: string | null;
  slug?: string | null;
  permalink?: string | null;
  prices?: WooCommerceStoreApiPrices | null;
  price_html?: string | null;
  is_in_stock?: boolean | null;
  stock_status?: string | null;
  stock_availability?: WooCommerceStoreApiStockAvailability | null;
  images?: WooCommerceStoreApiImage[] | null;
  brands?: WooCommerceStoreApiTerm[] | null;
  categories?: WooCommerceStoreApiTerm[] | null;
  tags?: WooCommerceStoreApiTerm[] | null;
}

export function normalizeWooCommerceStoreApiProduct(product: WooCommerceStoreApiProduct): NormalizedStoreListingSnapshot {
  const prices = product.prices ?? {};
  const currentPriceAmountMinor = parsePriceMinor(prices.price ?? null);
  const fallbackPriceAmountMinor = parseFirstPositivePriceMinor(prices.sale_price, prices.regular_price);
  const rawPriceAmountMinor = currentPriceAmountMinor !== null && currentPriceAmountMinor > 0
    ? currentPriceAmountMinor
    : fallbackPriceAmountMinor ?? currentPriceAmountMinor;
  const currency = normalizeCurrency(prices.currency_code ?? null);
  const priceHtmlAmountMinor = rawPriceAmountMinor === null || rawPriceAmountMinor <= 0
    ? parsePriceHtmlMinor(product.price_html ?? null, currency)
    : null;
  const priceAmountMinor = rawPriceAmountMinor !== null && rawPriceAmountMinor > 0
    ? rawPriceAmountMinor
    : priceHtmlAmountMinor;
  const availability = normalizeAvailability(product);
  const imageUrl = Array.isArray(product.images) ? product.images.find((image) => isNonBlank(image.src))?.src?.trim() ?? null : null;
  const priceWasZero = currentPriceAmountMinor === 0;
  const priceHtmlEmpty = typeof product.price_html === 'string' && product.price_html.trim().length === 0;
  const brands = readTermNames(product.brands);
  const categories = readTermNames(product.categories);
  const tags = readTermNames(product.tags);
  const makerCategories = readMakerTermNames(product.categories);
  const brand = brands[0] ?? makerCategories[0] ?? tags[0] ?? null;

  return {
    priceAmountMinor,
    currency,
    availability,
    productName: normalizeOptionalText(product.name ?? null),
    productUrl: normalizeOptionalText(product.permalink ?? null),
    imageUrl,
    rawMeta: {
      adapter: 'woocommerce_store_api',
      externalProductId: product.id ?? null,
      slug: product.slug ?? null,
      stockStatus: product.stock_status ?? null,
      stockText: product.stock_availability?.text ?? null,
      ...(product.stock_availability?.class ? { stockClass: product.stock_availability.class } : {}),
      ...(brand ? { brand } : {}),
      ...(categories.length > 0 || tags.length > 0 ? { tags: [...categories, ...tags] } : {}),
      ...(priceWasZero ? { priceWasZero: true } : {}),
      ...(priceHtmlEmpty ? { priceHtmlEmpty: true } : {}),
      ...(priceHtmlAmountMinor !== null ? { priceSource: 'price_html' } : {}),
    },
  };
}

export function chooseWooCommerceProduct(products: WooCommerceStoreApiProduct[], productUrl: string): WooCommerceStoreApiProduct | null {
  const normalizedUrl = normalizeComparableUrl(productUrl);
  const slug = slugFromUrl(productUrl);

  return products.find((product) => normalizeComparableUrl(product.permalink ?? '') === normalizedUrl)
    ?? products.find((product) => product.slug === slug)
    ?? null;
}

export function slugFromUrl(productUrl: string): string | null {
  try {
    const url = new URL(productUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts.at(-1) ?? null;
  } catch {
    return null;
  }
}

function parsePriceMinor(value: string | number | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  return Number.parseInt(trimmed, 10);
}

function parseFirstPositivePriceMinor(...values: Array<string | number | null | undefined>): number | null {
  for (const value of values) {
    const amountMinor = parsePriceMinor(value ?? null);
    if (amountMinor !== null && amountMinor > 0) {
      return amountMinor;
    }
  }

  return null;
}

function parsePriceHtmlMinor(value: string | null, currency: string | null): number | null {
  if (!isNonBlank(value)) {
    return null;
  }

  const saleSnippets = readHtmlElementContents(value, 'ins');
  const candidates = saleSnippets.length > 0
    ? saleSnippets
    : [value.replace(/<del\b[\s\S]*?<\/del>/gi, ' ')];

  for (const candidate of candidates.flatMap(readDecimalPriceCandidates)) {
    const amountMinor = parsePriceHubDecimalAmountToMinorUnits(candidate, currency);
    if (amountMinor !== null && amountMinor > 0) {
      return amountMinor;
    }
  }

  return null;
}

function readHtmlElementContents(html: string, tagName: string): string[] {
  const snippets: string[] = [];
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    snippets.push(match[1]);
  }

  return snippets;
}

function readDecimalPriceCandidates(html: string): string[] {
  const text = decodeHtmlEntities(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ');
  const candidates: string[] = [];
  const amountPattern = /\d+(?:(?:[.,\s]\d{3})+)?(?:[.,]\d{1,2})?/g;
  let match: RegExpExecArray | null;

  while ((match = amountPattern.exec(text))) {
    const normalized = normalizeLocalizedDecimal(match[0]);
    if (normalized) {
      candidates.push(normalized);
    }
  }

  return candidates;
}

function normalizeLocalizedDecimal(value: string): string | null {
  const compact = value.replace(/\s/g, '');
  if (/^\d+$/.test(compact)) {
    return compact;
  }

  if (hasOnlyThousandsGroups(compact)) {
    return compact.replace(/[.,]/g, '');
  }

  const commaIndex = compact.lastIndexOf(',');
  const dotIndex = compact.lastIndexOf('.');
  const decimalSeparator = commaIndex > dotIndex ? ',' : dotIndex >= 0 ? '.' : null;
  if (!decimalSeparator) {
    return null;
  }
  const decimalIndex = compact.lastIndexOf(decimalSeparator);
  const whole = compact.slice(0, decimalIndex).replace(/[.,]/g, '');
  const fraction = compact.slice(decimalIndex + 1);
  if (!whole || !/^\d+$/.test(whole) || !/^\d{1,2}$/.test(fraction)) {
    return null;
  }

  return `${whole}.${fraction}`;
}

function hasOnlyThousandsGroups(value: string): boolean {
  const parts = value.split(/[.,]/);
  return parts.length > 1
    && /^\d{1,3}$/.test(parts[0])
    && parts.slice(1).every((part) => /^\d{3}$/.test(part));
}

function normalizeCurrency(value: string | null): string | null {
  if (!isNonBlank(value)) {
    return null;
  }

  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function normalizeAvailability(product: WooCommerceStoreApiProduct): SnapshotAvailability {
  const status = product.stock_status?.trim().toLowerCase() ?? '';
  const stockText = product.stock_availability?.text?.trim().toLowerCase() ?? '';
  const stockClass = product.stock_availability?.class?.trim().toLowerCase() ?? '';
  const stockEvidence = `${status} ${stockText} ${stockClass}`;

  if (
    stockEvidence.includes('backorder')
    || stockEvidence.includes('back-order')
    || stockEvidence.includes('back order')
  ) {
    return 'backorder';
  }

  if (stockText.includes('pre-order') || stockText.includes('preorder')) {
    return 'preorder';
  }

  if (status.includes('discontinued') || stockText.includes('discontinued')) {
    return 'discontinued';
  }

  if (product.is_in_stock === true || status === 'instock') {
    return 'in_stock';
  }

  if (product.is_in_stock === false || status === 'outofstock') {
    return 'out_of_stock';
  }

  return 'unknown';
}

function normalizeOptionalText(value: string | null): string | null {
  return isNonBlank(value) ? value.trim() : null;
}

function readTermNames(terms: WooCommerceStoreApiTerm[] | null | undefined): string[] {
  if (!Array.isArray(terms)) {
    return [];
  }

  return terms
    .map((term) => normalizeTermText(term.name ?? null))
    .filter((term): term is string => term !== null);
}

function readMakerTermNames(terms: WooCommerceStoreApiTerm[] | null | undefined): string[] {
  if (!Array.isArray(terms)) {
    return [];
  }

  return terms
    .filter((term) => typeof term.link === 'string' && term.link.includes('/makers/'))
    .map((term) => normalizeTermText(term.name ?? null))
    .filter((term): term is string => term !== null);
}

function normalizeTermText(value: string | null): string | null {
  if (!isNonBlank(value)) {
    return null;
  }

  return decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)));
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

function isNonBlank(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
