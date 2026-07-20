import type { NormalizedStoreListingSnapshot, SnapshotAvailability } from './woocommerce-store-api.ts';
import {
  normalizePriceHubCurrency,
  parsePriceHubDecimalAmountToMinorUnits,
} from './currency-minor-units.ts';

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

export interface ShopifyVariantTitlePreference {
  prefer?: readonly string[];
  avoid?: readonly string[];
}

interface ShopifyNormalizeOptions {
  baseUrl: string;
  currencyHint: string | null;
  ignoredMatchNoiseTags?: readonly string[];
  variantTitlePreference?: ShopifyVariantTitlePreference;
}

export function normalizeShopifyProductJsonProduct(
  product: ShopifyProductJsonProduct,
  options: ShopifyNormalizeOptions,
): NormalizedStoreListingSnapshot {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const currency = normalizePriceHubCurrency(options.currencyHint);
  const selectedVariant = chooseShopifyVariant(variants, currency, options.variantTitlePreference);
  const tags = normalizeTags(product.tags);
  const handle = normalizeOptionalText(product.handle ?? null);
  const ignoredMatchNoiseTags = readIgnoredMatchNoiseTags(tags, options.ignoredMatchNoiseTags ?? []);
  const matchNoiseText = buildMatchNoiseText(product.product_type ?? null, tags, ignoredMatchNoiseTags);

  return {
    priceAmountMinor: parsePriceHubDecimalAmountToMinorUnits(selectedVariant?.price ?? null, currency),
    currency,
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

export function chooseShopifyVariant(
  variants: readonly ShopifyProductJsonVariant[],
  currency: string | null,
  titlePreference: ShopifyVariantTitlePreference = {},
): ShopifyProductJsonVariant | null {
  const availablePriced = variants.filter((variant) => variant.available === true && hasPrice(variant, currency));
  const priced = variants.filter((variant) => hasPrice(variant, currency));
  const candidates = availablePriced.length > 0
    ? availablePriced
    : priced.length > 0
      ? priced
      : variants;

  return choosePreferredShopifyVariant(candidates, titlePreference)
    ?? null;
}

function choosePreferredShopifyVariant(
  variants: readonly ShopifyProductJsonVariant[],
  titlePreference: ShopifyVariantTitlePreference,
): ShopifyProductJsonVariant | null {
  if (variants.length === 0) {
    return null;
  }

  const preferredVariant = variants.find((variant) => variantTitleMatches(variant, titlePreference.prefer ?? [])
    && !variantTitleMatches(variant, titlePreference.avoid ?? []));
  if (preferredVariant) {
    return preferredVariant;
  }

  return variants.find((variant) => !variantTitleMatches(variant, titlePreference.avoid ?? []))
    ?? variants[0]
    ?? null;
}

function hasPrice(variant: ShopifyProductJsonVariant, currency: string | null): boolean {
  return parsePriceHubDecimalAmountToMinorUnits(variant.price ?? null, currency) !== null;
}

function variantTitleMatches(variant: ShopifyProductJsonVariant, terms: readonly string[]): boolean {
  if (terms.length === 0 || !isNonBlank(variant.title)) {
    return false;
  }

  const title = variant.title.toLowerCase();
  return terms.some((term) => title.includes(term.toLowerCase()));
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
