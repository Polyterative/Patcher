import {
  normalizeMarketplaceCurrency,
  parseMarketplacePriceToMinorUnits
} from './marketplace-money.utils';
import {
  MARKETPLACE_LISTING_CONDITIONS,
  MARKETPLACE_LISTING_STATUSES,
  type MarketplaceListingCondition,
  type MarketplaceListingDraft,
  type MarketplaceListingDraftField,
  type MarketplaceListingDraftValidationResult,
  type MarketplaceListingStatus
} from './marketplace-listing.model';
import {
  COUNTRY_CODE_PATTERN,
  isHttpUrl,
  isObjectRecord,
  MAX_DESCRIPTION_LENGTH,
  MAX_EXTERNAL_LINK_LENGTH,
  MAX_SHIPPING_NOTES_LENGTH,
  MAX_TITLE_LENGTH,
  priceInput,
  stringInput,
  trimOptionalText
} from './marketplace-listing-shared.utils';

export function normalizeMarketplaceListingCountryCode(value: string | null | undefined): string | undefined {
  const normalized = value?.trim().toUpperCase();

  if (!normalized || !COUNTRY_CODE_PATTERN.test(normalized)) {
    return undefined;
  }

  return normalized;
}

export function isMarketplaceListingStatus(value: unknown): value is MarketplaceListingStatus {
  return typeof value === 'string' && MARKETPLACE_LISTING_STATUSES.includes(value as MarketplaceListingStatus);
}

export function isMarketplaceListingCondition(value: unknown): value is MarketplaceListingCondition {
  return typeof value === 'string' && MARKETPLACE_LISTING_CONDITIONS.includes(value as MarketplaceListingCondition);
}

export function validateAndNormalizeMarketplaceListingDraft(
  draft: MarketplaceListingDraft | null | undefined
): MarketplaceListingDraftValidationResult {
  const source = isObjectRecord(draft) ? draft : {};
  const errors: Partial<Record<MarketplaceListingDraftField, string>> = {};
  const moduleId = trimOptionalText(source.moduleId);
  const sellerProfileId = trimOptionalText(source.sellerProfileId);
  const titleOverride = trimOptionalText(source.titleOverride);
  const description = trimOptionalText(source.description);
  const askingPriceCurrency = normalizeMarketplaceCurrency(stringInput(source.askingPriceCurrency));
  const askingPriceAmountMinor = askingPriceCurrency
    ? parseMarketplacePriceToMinorUnits(priceInput(source.askingPrice), askingPriceCurrency)
    : undefined;
  const shipsFromCountry = normalizeMarketplaceListingCountryCode(stringInput(source.shipsFromCountry));
  const shippingNotes = trimOptionalText(source.shippingNotes);
  const externalLink = trimOptionalText(source.externalLink);
  const statusInputProvided = source.status !== null
    && source.status !== undefined
    && !(typeof source.status === 'string' && source.status.trim().length === 0);
  const status = statusInputProvided ? trimOptionalText(source.status) : 'draft';
  const shippingOptions = normalizeMarketplaceListingShippingOptions(source.shippingOptions);

  if (!moduleId) {
    errors.moduleId = 'Required';
  }

  if (!sellerProfileId) {
    errors.sellerProfileId = 'Required';
  }

  if (!isMarketplaceListingCondition(source.condition)) {
    errors.condition = 'Choose a supported listing condition';
  }

  if (!isMarketplaceListingStatus(status)) {
    errors.status = 'Choose a supported listing status';
  }

  if (!askingPriceCurrency) {
    errors.askingPriceCurrency = 'Use a three-letter currency code';
  }

  if (askingPriceAmountMinor === undefined) {
    errors.askingPrice = 'Enter a valid asking price';
  }

  if (!shipsFromCountry) {
    errors.shipsFromCountry = 'Use a two-letter country code';
  }

  if (titleOverride && titleOverride.length > MAX_TITLE_LENGTH) {
    errors.titleOverride = `Use ${MAX_TITLE_LENGTH} characters or fewer`;
  }

  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    errors.description = `Use ${MAX_DESCRIPTION_LENGTH} characters or fewer`;
  }

  if (externalLink) {
    if (externalLink.length > MAX_EXTERNAL_LINK_LENGTH) {
      errors.externalLink = `Use ${MAX_EXTERNAL_LINK_LENGTH} characters or fewer`;
    } else if (!isHttpUrl(externalLink)) {
      errors.externalLink = 'Use an http(s) URL';
    }
  }

  if (source.shippingOptions !== null && source.shippingOptions !== undefined && !Array.isArray(source.shippingOptions)) {
    errors.shippingOptions = 'Use a list of shipping options';
  }

  if (shippingNotes && shippingNotes.length > MAX_SHIPPING_NOTES_LENGTH) {
    errors.shippingNotes = `Use ${MAX_SHIPPING_NOTES_LENGTH} characters or fewer`;
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      valid: false
    };
  }

  return {
    errors: {},
    listing: {
      askingPriceAmountMinor: askingPriceAmountMinor as number,
      askingPriceCurrency: askingPriceCurrency as string,
      condition: source.condition as MarketplaceListingCondition,
      moduleId: moduleId as string,
      openToOffers: source.openToOffers === true,
      sellerProfileId: sellerProfileId as string,
      shippingOptions,
      ...(shippingNotes ? {shippingNotes} : {}),
      shipsFromCountry: shipsFromCountry as string,
      status: status as MarketplaceListingStatus,
      ...(titleOverride ? {titleOverride} : {}),
      ...(description ? {description} : {}),
      ...(externalLink ? {externalLink} : {})
    },
    valid: true
  };
}

export function normalizeMarketplaceListingShippingOptions(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const option of value) {
    if (typeof option !== 'string') {
      continue;
    }

    const trimmed = option.trim();
    const dedupeKey = trimmed.toLocaleLowerCase();

    if (!trimmed || seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push(trimmed);
  }

  return normalized;
}
