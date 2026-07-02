import type { NormalizedStoreListingSnapshot, SnapshotAvailability } from './woocommerce-store-api.ts';

export interface ShopifyProductJsonVariant {
  id?: number | string | null;
  title?: string | null;
  sku?: string | null;
  available?: boolean | null;
  price?: string | number | null;
  compare_at_price?: string | number | null;
}

export interface ShopifyProductJsonImage {
  src?: string | null;
}

export interface ShopifyProductJsonProduct {
  id?: number | string | null;
  title?: string | null;
  handle?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  tags?: string[] | string | null;
  variants?: ShopifyProductJsonVariant[] | null;
  images?: ShopifyProductJsonImage[] | null;
}

interface ShopifyNormalizeOptions {
  baseUrl: string;
  currencyHint: string | null;
  ignoredMatchNoiseTags?: readonly string[];
}

export function normalizeShopifyProductJsonProduct(
  product: ShopifyProductJsonProduct,
  options: ShopifyNormalizeOptions,
): NormalizedStoreListingSnapshot {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const selectedVariant = chooseShopifyVariant(variants);
  const tags = normalizeTags(product.tags);
  const handle = normalizeOptionalText(product.handle ?? null);
  const ignoredMatchNoiseTags = readIgnoredMatchNoiseTags(tags, options.ignoredMatchNoiseTags ?? []);
  const matchNoiseText = buildMatchNoiseText(product.product_type ?? null, tags, ignoredMatchNoiseTags);

  return {
    priceAmountMinor: parseDecimalPriceMinor(selectedVariant?.price ?? null),
    currency: normalizeCurrency(options.currencyHint),
    availability: normalizeAvailability(product, variants),
    productName: normalizeOptionalText(product.title ?? null),
    productUrl: handle ? new URL(`/products/${handle}`, options.baseUrl).toString() : null,
    imageUrl: Array.isArray(product.images) ? product.images.find((image) => isNonBlank(image.src))?.src?.trim() ?? null : null,
    rawMeta: {
      adapter: 'shopify_product_json',
      externalProductId: product.id ?? null,
      slug: handle,
      vendor: product.vendor ?? null,
      productType: product.product_type ?? null,
      tags,
      ...(matchNoiseText !== null ? { matchNoiseText } : {}),
      ...(ignoredMatchNoiseTags.length > 0 ? { ignoredMatchNoiseTags } : {}),
      variantCount: variants.length,
      selectedVariantId: selectedVariant?.id ?? null,
      selectedVariantTitle: selectedVariant?.title ?? null,
      selectedVariantSku: selectedVariant?.sku ?? null,
      selectedVariantAvailable: selectedVariant?.available ?? null,
      availableVariantIds: variants.filter((variant) => variant.available === true).map((variant) => variant.id ?? null).filter((id) => id !== null),
    },
  };
}

function buildMatchNoiseText(
  productType: string | null,
  tags: readonly string[],
  ignoredMatchNoiseTags: readonly string[],
): string | null {
  if (ignoredMatchNoiseTags.length === 0) {
    return null;
  }

  const ignoredTags = new Set(ignoredMatchNoiseTags.map((tag) => tag.toLowerCase()));
  return [
    productType ?? '',
    ...tags.filter((tag) => !ignoredTags.has(tag.toLowerCase())),
  ].join(' ');
}

function readIgnoredMatchNoiseTags(tags: readonly string[], configuredTags: readonly string[]): string[] {
  if (configuredTags.length === 0) {
    return [];
  }

  const configured = new Set(configuredTags.map((tag) => tag.toLowerCase()));
  return tags.filter((tag) => configured.has(tag.toLowerCase()));
}

function chooseShopifyVariant(variants: readonly ShopifyProductJsonVariant[]): ShopifyProductJsonVariant | null {
  return variants.find((variant) => variant.available === true && parseDecimalPriceMinor(variant.price ?? null) !== null)
    ?? variants.find((variant) => parseDecimalPriceMinor(variant.price ?? null) !== null)
    ?? variants[0]
    ?? null;
}

function normalizeAvailability(
  product: ShopifyProductJsonProduct,
  variants: readonly ShopifyProductJsonVariant[],
): SnapshotAvailability {
  const searchableTags = normalizeTags(product.tags).join(' ');
  const searchable = `${product.title ?? ''} ${product.handle ?? ''} ${searchableTags}`.toLowerCase();
  if (
    searchable.includes('discontinued')
    || searchable.includes('no-longer-available')
    || searchable.includes('no longer available')
  ) {
    return 'discontinued';
  }

  if (searchable.includes('pre-order') || searchable.includes('preorder')) {
    return 'preorder';
  }

  if (variants.some((variant) => variant.available === true)) {
    return 'in_stock';
  }

  if (variants.some((variant) => variant.available === false)) {
    return 'out_of_stock';
  }

  return 'unknown';
}

function parseDecimalPriceMinor(value: string | number | null): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  return Math.round(Number.parseFloat(normalized) * 100);
}

function normalizeCurrency(value: string | null): string | null {
  if (!isNonBlank(value)) {
    return null;
  }

  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function normalizeTags(value: string[] | string | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  }

  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  }

  return [];
}

function normalizeOptionalText(value: string | null): string | null {
  return isNonBlank(value) ? value.trim() : null;
}

function isNonBlank(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
