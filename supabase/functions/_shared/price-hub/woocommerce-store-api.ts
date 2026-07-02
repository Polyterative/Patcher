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
  const rawPriceAmountMinor = parsePriceMinor(prices.price ?? prices.sale_price ?? prices.regular_price ?? null);
  const priceAmountMinor = rawPriceAmountMinor !== null && rawPriceAmountMinor > 0 ? rawPriceAmountMinor : null;
  const currency = normalizeCurrency(prices.currency_code ?? null);
  const availability = normalizeAvailability(product);
  const imageUrl = Array.isArray(product.images) ? product.images.find((image) => isNonBlank(image.src))?.src?.trim() ?? null : null;
  const priceWasZero = rawPriceAmountMinor === 0;
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

  return value
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/\s+/g, ' ')
    .trim();
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
