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
}

export function normalizeProductMetadataPage(
  html: string,
  productUrl: string,
  adapter: 'bigcommerce_metadata' | 'shopware_metadata',
): NormalizedStoreListingSnapshot {
  const metadata = readProductPageMetadata(html);
  const availabilityText = readAvailabilityText(html);
  const slug = slugFromUrl(metadata.productUrl ?? productUrl);
  const panelVariant = readPanelVariant(`${metadata.productName ?? ''} ${slug ?? ''}`);

  return {
    priceAmountMinor: parseDecimalPriceMinor(metadata.priceAmount),
    currency: normalizeCurrency(metadata.priceCurrency),
    availability: normalizeAvailability(chooseAvailabilityText(metadata.availability, availabilityText)),
    productName: normalizeOptionalText(metadata.productName),
    productUrl: normalizeOptionalText(metadata.productUrl) ?? productUrl,
    imageUrl: normalizeOptionalText(metadata.imageUrl),
    rawMeta: {
      adapter,
      sourceUrl: productUrl,
      ...(metadata.productId ? { externalProductId: metadata.productId } : {}),
      ...(metadata.sku ? { sku: metadata.sku } : {}),
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

  return {
    priceAmount: meta.get('product:price:amount') ?? meta.get('price') ?? null,
    priceCurrency: meta.get('product:price:currency') ?? meta.get('pricecurrency') ?? null,
    productName: meta.get('og:title') ?? readTitle(html),
    productUrl: meta.get('og:url') ?? meta.get('product:product_link') ?? null,
    imageUrl: meta.get('og:image') ?? null,
    availability: meta.get('og:availability') ?? null,
    productId: meta.get('productid') ?? null,
    sku: meta.get('sku') ?? readSku(html),
  };
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

  if (availability.includes('backorder')) {
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
  ) {
    return 'in_stock';
  }

  return 'unknown';
}

function readAvailabilityText(html: string): string | null {
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

  const structuredAvailableText = readStructuredAvailableText(html);
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
  for (const snippet of readPrimaryAvailabilitySnippets(html)) {
    const match = readFirstAvailabilityMatch(snippet, patterns);
    if (match) {
      return match;
    }
  }

  return null;
}

function readPrimaryAvailabilitySnippets(html: string): string[] {
  return [
    ...readElementSnippetsByClass(html, 'delivery-information'),
    ...readElementSnippetsByClass(html, 'product-detail-buy'),
    ...readElementSnippetsByClass(html, 'buy-widget'),
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

function readStructuredAvailableText(html: string): string | null {
  if (/schema\.org\/InStock/i.test(html)) {
    return 'In stock';
  }

  if (/<[^>]*\bclass=["'][^"']*\bdelivery-information\b[^"']*\bdelivery-available\b[^"']*["'][^>]*>[\s\S]{0,500}?\bIn stock\b/i.test(html)) {
    return 'In stock';
  }

  if (/<button[^>]*\bclass=["'][^"']*\bbtn-buy\b[^"']*["'][^>]*(?:title|aria-label)=["']Add to cart["'][^>]*>/i.test(html)) {
    return 'In stock';
  }

  return null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function chooseAvailabilityText(metadataAvailability: string | null, pageAvailabilityText: string | null): string | null {
  const normalizedPageAvailability = normalizeAvailability(pageAvailabilityText);
  if (normalizedPageAvailability === 'discontinued' || normalizedPageAvailability === 'out_of_stock') {
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

const PANEL_VARIANTS = ['black', 'silver', 'white', 'grey', 'gray', 'natural'] as const;

function normalizeOptionalText(value: string | null): string | null {
  return value && value.trim().length > 0 ? value.trim() : null;
}

function slugFromUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.pathname.split('/').filter(Boolean).at(-1) ?? null;
  } catch {
    return null;
  }
}

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
