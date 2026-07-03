import type { NormalizedStoreListingSnapshot, SnapshotAvailability } from './woocommerce-store-api.ts';

interface ProductPageMetadata {
  priceAmount: string | null;
  priceCurrency: string | null;
  productName: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  availability: string | null;
  productId: string | null;
  sku: string | null;
  brand: string | null;
}

export type ProductMetadataAdapter = 'bigcommerce_metadata' | 'shopware_metadata' | 'custom';

interface ProductMetadataContext {
  storeSlug?: string;
}

export function normalizeProductMetadataPage(
  html: string,
  productUrl: string,
  adapter: ProductMetadataAdapter,
  context: ProductMetadataContext = {},
): NormalizedStoreListingSnapshot {
  const metadata = readProductPageMetadata(html);
  const availabilityText = readAvailabilityText(html, context);
  const slug = slugFromUrl(metadata.productUrl ?? productUrl);
  const productName = normalizeProductName(metadata.productName, adapter);
  const brand = metadata.brand ?? readSkuBrand(metadata.sku);
  const panelVariant = readPanelVariant(`${productName ?? ''} ${slug ?? ''}`);

  return {
    priceAmountMinor: parseDecimalPriceMinor(metadata.priceAmount),
    currency: normalizeCurrency(metadata.priceCurrency),
    availability: normalizeAvailability(chooseAvailabilityText(metadata.availability, availabilityText)),
    productName: normalizeOptionalText(productName),
    productUrl: normalizeOptionalText(metadata.productUrl) ?? productUrl,
    imageUrl: normalizeOptionalText(metadata.imageUrl),
    rawMeta: {
      adapter,
      sourceUrl: productUrl,
      ...(metadata.productId ? { externalProductId: metadata.productId } : {}),
      ...(metadata.sku ? { sku: metadata.sku } : {}),
      ...(brand ? { brand } : {}),
      slug,
      ...(panelVariant ? { panelVariant } : {}),
      ogAvailability: metadata.availability,
      ...(availabilityText ? { pageAvailabilityText: availabilityText } : {}),
      priceAmount: metadata.priceAmount,
    },
  };
}

function readProductPageMetadata(html: string): ProductPageMetadata {
  const meta = readMetaTags(html);
  const jsonLd = readProductJsonLdMetadata(html);

  return {
    priceAmount: meta.get('product:price:amount') ?? meta.get('og:price:amount') ?? meta.get('price') ?? jsonLd.priceAmount ?? readEmbeddedMinorUnitPriceAmount(html),
    priceCurrency: meta.get('product:price:currency') ?? meta.get('og:price:currency') ?? meta.get('pricecurrency') ?? jsonLd.priceCurrency ?? null,
    productName: meta.get('og:title') ?? jsonLd.productName ?? readTitle(html),
    productUrl: normalizeProductUrl(meta.get('og:url') ?? meta.get('product:product_link')),
    imageUrl: meta.get('og:image') ?? jsonLd.imageUrl ?? null,
    availability: meta.get('product:availability') ?? meta.get('og:availability') ?? jsonLd.availability ?? null,
    productId: meta.get('productid') ?? jsonLd.productId ?? null,
    sku: meta.get('sku') ?? jsonLd.sku ?? readSku(html),
    brand: meta.get('product:brand') ?? meta.get('brand') ?? meta.get('manufacturer') ?? jsonLd.brand ?? null,
  };
}

function readEmbeddedMinorUnitPriceAmount(html: string): string | null {
  const reducedPrice = readEmbeddedMinorUnitPrice(html, 'reducedPrice');
  const price = readEmbeddedMinorUnitPrice(html, 'price');
  const amountMinor = reducedPrice ?? price;
  return amountMinor === null ? null : (amountMinor / 100).toFixed(2);
}

function readEmbeddedMinorUnitPrice(html: string, fieldName: string): number | null {
  const pattern = new RegExp(`"${escapeRegExp(fieldName)}"\\s*:\\s*(\\d+)`);
  const match = pattern.exec(html);
  if (!match) {
    return null;
  }

  const value = Number.parseInt(match[1], 10);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function readProductJsonLdMetadata(html: string): ProductPageMetadata {
  for (const jsonLd of readJsonLdObjects(html)) {
    const product = findProductJsonLd(jsonLd);
    if (product) {
      const offers = readJsonLdOffer(product);
      return {
        priceAmount: readStringNumberOrNull(offers?.price) ?? null,
        priceCurrency: readStringOrNull(offers?.priceCurrency) ?? null,
        productName: readStringOrNull(product.name),
        productUrl: readStringOrNull(product.url),
        imageUrl: readJsonLdImage(product.image),
        availability: readStringOrNull(offers?.availability),
        productId: readStringNumberOrNull(product.productID) ?? readStringNumberOrNull(product.productId) ?? null,
        sku: readStringNumberOrNull(product.sku) ?? null,
        brand: readJsonLdBrand(product),
      };
    }
  }

  return {
    priceAmount: null,
    priceCurrency: null,
    productName: null,
    productUrl: null,
    imageUrl: null,
    availability: null,
    productId: null,
    sku: null,
    brand: null,
  };
}

function readJsonLdObjects(html: string): unknown[] {
  const objects: unknown[] = [];
  const scriptPattern = /<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>([\s\S]*?)<\/script>/gi;
  let scriptMatch: RegExpExecArray | null;

  while ((scriptMatch = scriptPattern.exec(html))) {
    try {
      objects.push(JSON.parse(decodeHtmlEntities(scriptMatch[1].trim())) as unknown);
    } catch {
      // Ignore malformed structured data; metadata tags may still contain usable product data.
    }
  }

  return objects;
}

function findProductJsonLd(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const product = findProductJsonLd(item);
      if (product) {
        return product;
      }
    }
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const type = value['@type'];
  if (typeof type === 'string' && type.toLowerCase() === 'product') {
    return value;
  }

  if (Array.isArray(type) && type.some((item) => typeof item === 'string' && item.toLowerCase() === 'product')) {
    return value;
  }

  return findProductJsonLd(value['@graph']);
}

function readJsonLdOffer(product: Record<string, unknown>): Record<string, unknown> | null {
  const offers = product.offers;
  if (Array.isArray(offers)) {
    return offers.find(isRecord) ?? null;
  }

  return isRecord(offers) ? offers : null;
}

function readJsonLdImage(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find((item): item is string => typeof item === 'string' && item.trim().length > 0) ?? null;
  }

  if (isRecord(value)) {
    return readStringOrNull(value.url);
  }

  return null;
}

function readJsonLdBrand(product: Record<string, unknown>): string | null {
  const brand = product.brand;
  if (typeof brand === 'string') {
    return readStringOrNull(brand);
  }

  if (isRecord(brand)) {
    const brandName = readStringOrNull(brand.name);
    if (brandName) {
      return brandName;
    }
  }

  return readJsonLdAdditionalProperty(product, 'pa_brand')
    ?? readJsonLdAdditionalProperty(product, 'brand')
    ?? null;
}

function readJsonLdAdditionalProperty(product: Record<string, unknown>, propertyName: string): string | null {
  const additionalProperty = product.additionalProperty;
  const properties = Array.isArray(additionalProperty)
    ? additionalProperty.filter(isRecord)
    : isRecord(additionalProperty)
      ? [additionalProperty]
      : [];

  for (const property of properties) {
    const name = readStringOrNull(property.name);
    if (name?.toLowerCase() !== propertyName) {
      continue;
    }

    const value = readStringNumberOrNull(property.value);
    if (value) {
      return value;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? decodeHtmlEntities(value.trim()) : null;
}

function readStringNumberOrNull(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return readStringOrNull(value);
}

function readMetaTags(html: string): Map<string, string> {
  const metas = new Map<string, string>();
  const metaTagPattern = /<meta\s+([^>]+)>/gi;
  let metaTagMatch: RegExpExecArray | null;

  while ((metaTagMatch = metaTagPattern.exec(html))) {
    const attributes = readHtmlAttributes(metaTagMatch[1]);
    const key = attributes.get('property') ?? attributes.get('itemprop') ?? attributes.get('name');
    const value = attributes.get('content');
    if (key && value) {
      metas.set(key.trim().toLowerCase(), decodeHtmlEntities(value.trim()));
    }
  }

  return metas;
}

function readHtmlAttributes(tagContent: string): Map<string, string> {
  const attributes = new Map<string, string>();
  const attributePattern = /([a-zA-Z_:.-]+)\s*=\s*("([^"]*)"|'([^']*)')/g;
  let attributeMatch: RegExpExecArray | null;

  while ((attributeMatch = attributePattern.exec(tagContent))) {
    attributes.set(attributeMatch[1].toLowerCase(), attributeMatch[3] ?? attributeMatch[4] ?? '');
  }

  return attributes;
}

function parseDecimalPriceMinor(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return null;
  }

  return Math.round(Number.parseFloat(normalized) * 100);
}

function normalizeCurrency(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const currency = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(currency) ? currency : null;
}

function normalizeAvailability(value: string | null): SnapshotAvailability {
  const availability = value?.trim().toLowerCase() ?? '';

  if (availability.includes('preorder') || availability.includes('pre-order')) {
    return 'preorder';
  }

  if (
    availability.includes('backorder')
    || availability.includes('available on order')
    || availability.includes('on order')
    || availability.includes('su ordinazione')
    || /shipping\s+in\s+\d+(?:\s*(?:-|\u2013|to)\s*\d+)?\s+days?/.test(availability)
  ) {
    return 'backorder';
  }

  if (
    availability.includes('discontinued')
    || availability.includes('archived')
  ) {
    return 'discontinued';
  }

  if (
    availability.includes('outofstock')
    || availability.includes('out of stock')
    || availability.includes('not available')
    || availability.includes('unavailable')
    || availability.includes('sold out')
    || availability.includes('sorry folks')
  ) {
    return 'out_of_stock';
  }

  if (
    availability.includes('instock')
    || availability.includes('in stock')
    || availability.includes('available immediately')
    || availability === 'disponibile'
  ) {
    return 'in_stock';
  }

  return 'unknown';
}

function readAvailabilityText(html: string, context: ProductMetadataContext): string | null {
  const archivedText = readFirstAvailabilityMatch(html, [
    /Product is archived/i,
  ]);
  if (archivedText) {
    return archivedText;
  }

  const terminalUnavailableText = readScopedAvailabilityMatch(html, [
    /Sorry folks/i,
    /Sold out/i,
    /Out of stock/i,
    /Currently not available/i,
    /Not available/i,
    /Unavailable/i,
  ]);
  if (terminalUnavailableText) {
    return terminalUnavailableText;
  }

  const storeSpecificOrderStatusText = readStoreSpecificOrderStatusText(html, context);
  if (storeSpecificOrderStatusText) {
    return storeSpecificOrderStatusText;
  }

  const orderStatusText = readScopedAvailabilityMatch(html, [
    /Su ordinazione/i,
    /Available on backorder/i,
    /Available on order/i,
    /On order/i,
    /Backorder/i,
    /Pre-order/i,
    /Preorder/i,
  ]);
  if (orderStatusText) {
    return orderStatusText;
  }

  const availableStatusText = readScopedAvailabilityMatch(html, [
    /Disponibile/i,
    /In stock/i,
  ]);
  if (availableStatusText) {
    return availableStatusText;
  }

  const structuredAvailableText = readStructuredAvailableText(html, context);
  if (structuredAvailableText) {
    return structuredAvailableText;
  }

  return readFirstAvailabilityMatch(html, [
    /Pre-order/i,
    /Preorder/i,
    /Available immediately/i,
    /In stock/i,
  ]);
}

function readStoreSpecificOrderStatusText(html: string, context: ProductMetadataContext): string | null {
  if (context.storeSlug === 'turnlab') {
    return readFirstSnippetAvailabilityMatch(readElementSnippetsByClass(html, 'delivery'), [
      /Shipping in\s+\d+(?:\s*(?:-|\u2013|to)\s*\d+)?\s+days?/i,
    ]);
  }

  return null;
}

function readFirstAvailabilityMatch(html: string, patterns: readonly RegExp[]): string | null {
  for (const pattern of patterns) {
    const availabilityMatch = pattern.exec(html);
    if (availabilityMatch) {
      return availabilityMatch[0];
    }
  }

  return null;
}

function readScopedAvailabilityMatch(html: string, patterns: readonly RegExp[]): string | null {
  return readFirstSnippetAvailabilityMatch(readPrimaryAvailabilitySnippets(html), patterns);
}

function readFirstSnippetAvailabilityMatch(snippets: readonly string[], patterns: readonly RegExp[]): string | null {
  for (const snippet of snippets) {
    const match = readFirstAvailabilityMatch(snippet, patterns);
    if (match) {
      return match;
    }
  }

  return null;
}

function readPrimaryAvailabilitySnippets(html: string): string[] {
  return [
    ...readElementSnippetsByClass(html, 'stock'),
    ...readElementSnippetsByClass(html, 'delivery-information'),
    ...readElementSnippetsByClass(html, 'product-detail-buy'),
    ...readElementSnippetsByClass(html, 'buy-widget'),
    ...readElementSnippetsByClass(html, 'tag'),
    ...readDisabledBuyButtonSnippets(html),
  ];
}

function readElementSnippetsByClass(html: string, className: string): string[] {
  const snippets: string[] = [];
  const pattern = new RegExp(
    `<([a-zA-Z][\\w:-]*)\\b[^>]*class=["'][^"']*\\b${escapeRegExp(className)}\\b[^"']*["'][^>]*>[\\s\\S]*?<\\/\\1>`,
    'gi',
  );
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    snippets.push(match[0]);
  }

  return snippets;
}

function readDisabledBuyButtonSnippets(html: string): string[] {
  const snippets: string[] = [];
  const pattern = /<button\b(?=[^>]*\bdisabled\b)[^>]*>[\s\S]*?<\/button>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html))) {
    snippets.push(match[0]);
  }

  return snippets;
}

function readStructuredAvailableText(html: string, context: ProductMetadataContext): string | null {
  if (context.storeSlug === 'turnlab') {
    return readTurnlabStructuredAvailableText(html);
  }

  if (/schema\.org\/InStock/i.test(html)) {
    return 'In stock';
  }

  if (/<[^>]*\bclass=["'][^"']*\bdelivery-information\b[^"']*\bdelivery-available\b[^"']*["'][^>]*>[\s\S]{0,500}?\bIn stock\b/i.test(html)) {
    return 'In stock';
  }

  if (/<button[^>]*\bclass=["'][^"']*\bbtn-buy\b[^"']*["'][^>]*(?:title|aria-label)=["']Add to cart["'][^>]*>/i.test(html)) {
    return 'In stock';
  }

  if (/<form\b(?=[^>]*\baction=["'][^"']*\/cart\/add\/)[^>]*>[\s\S]{0,1500}?\bAdd to cart\b/i.test(html)) {
    return 'In stock';
  }

  if (/<span\b[^>]*\bclass=["'][^"']*\bsubtitle-product-popup\b[^"']*["'][^>]*>[\s\S]{0,500}?\bAdd to cart\b/i.test(html)) {
    return 'In stock';
  }

  return null;
}

function readTurnlabStructuredAvailableText(html: string): string | null {
  if (/<form\b(?=[^>]*\bid=["']product_configure_form["'])[^>]*>[\s\S]{0,2000}?\bAdd to cart\b/i.test(html)) {
    return 'In stock';
  }

  if (/<form\b(?=[^>]*\baction=["'][^"']*\/cart\/add\/)(?![^>]*\bid=["']popup_form_)[^>]*>[\s\S]{0,1500}?\bAdd to cart\b/i.test(html)) {
    return 'In stock';
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function chooseAvailabilityText(metadataAvailability: string | null, pageAvailabilityText: string | null): string | null {
  const normalizedPageAvailability = normalizeAvailability(pageAvailabilityText);
  if (
    normalizedPageAvailability === 'discontinued'
    || normalizedPageAvailability === 'out_of_stock'
    || normalizedPageAvailability === 'backorder'
    || normalizedPageAvailability === 'preorder'
  ) {
    return pageAvailabilityText;
  }

  return metadataAvailability ?? pageAvailabilityText;
}

function readSku(html: string): string | null {
  const jsonSkuMatch = /"sku"\s*:\s*"([^"]+)"/i.exec(html);
  if (jsonSkuMatch) {
    return decodeHtmlEntities(jsonSkuMatch[1].trim());
  }

  const objectSkuMatch = /\bsku\s*:\s*'([^']+)'/i.exec(html);
  if (objectSkuMatch) {
    return decodeHtmlEntities(objectSkuMatch[1].trim());
  }

  const hiddenSkuMatch = /<span[^>]*class=["'][^"']*\bhide-sku\b[^"']*["'][^>]*>(.*?)<\/span>/is.exec(html);
  return hiddenSkuMatch ? decodeHtmlEntities(hiddenSkuMatch[1].replace(/\s+/g, ' ').trim()) : null;
}

function readPanelVariant(value: string): string | null {
  const tokens = new Set(value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 0));

  for (const variant of PANEL_VARIANTS) {
    if (tokens.has(variant)) {
      return variant;
    }
  }

  return null;
}

function readTitle(html: string): string | null {
  const titleMatch = /<title>(.*?)<\/title>/is.exec(html);
  return titleMatch ? decodeHtmlEntities(titleMatch[1].replace(/\s+/g, ' ').trim()) : null;
}

function normalizeOptionalText(value: string | null): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function normalizeProductName(value: string | null, adapter: ProductMetadataAdapter): string | null {
  if (adapter !== 'custom' || !value) {
    return value;
  }

  const withoutStoreSuffix = CUSTOM_PRODUCT_TITLE_SUFFIXES.reduce(
    (name, suffix) => name.endsWith(suffix) ? name.slice(0, -suffix.length).trim() : name,
    value,
  );
  return withoutStoreSuffix
    .replace(/\s+by\s+[^|]+\s+\|\s+Shop\b.*$/i, '')
    .replace(/\s+\|\s*\d+$/, '')
    .trim();
}

function readSkuBrand(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const delimiterIndex = value.indexOf('_.');
  if (delimiterIndex <= 0) {
    return null;
  }

  return value.slice(0, delimiterIndex).replace(/_/g, ' ').trim() || null;
}

function normalizeProductUrl(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    url.searchParams.delete('source');
    return url.toString();
  } catch {
    return value;
  }
}

function slugFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.pathname.split('/').filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}

const PANEL_VARIANTS = ['black', 'silver', 'white', 'grey', 'gray', 'natural'] as const;
const CUSTOM_PRODUCT_TITLE_SUFFIXES = [
  ' - MachineRoom',
  ' - Milk Audio Store',
  ' - postmodular',
  ' - Escape from Noise',
  ' | Martin Pas',
] as const;

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint: string) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
