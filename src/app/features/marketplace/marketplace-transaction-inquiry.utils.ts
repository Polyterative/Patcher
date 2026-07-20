import {
  normalizeMarketplaceCurrency,
  parseMarketplacePriceToMinorUnits
} from './marketplace-money.utils';
import {
  hasMeaningfulInput,
  priceInput,
  stringInput,
  trimOptionalText
} from './marketplace-transaction.internal';
import {
  type MarketplaceInquiryDraft,
  type MarketplaceInquiryDraftField,
  type MarketplaceInquiryDraftValidationResult
} from './marketplace-transaction.models';

const MAX_INQUIRY_MESSAGE_LENGTH = 1000;
const MAX_DESTINATION_SUMMARY_LENGTH = 240;

export function validateAndNormalizeMarketplaceInquiryDraft(
  draft: MarketplaceInquiryDraft | null | undefined
): MarketplaceInquiryDraftValidationResult {
  const source = isObjectRecord(draft) ? draft : {};
  const errors: Partial<Record<MarketplaceInquiryDraftField, string>> = {};
  const listingId = trimOptionalText(source.listingId);
  const buyerProfileId = trimOptionalText(source.buyerProfileId);
  const message = trimOptionalText(source.message);
  const buyerDestinationSummary = trimOptionalText(source.buyerDestinationSummary);
  const proposedPriceProvided = hasMeaningfulInput(source.proposedPrice);
  const proposedPriceCurrencyProvided = hasMeaningfulInput(source.proposedPriceCurrency);
  const proposedPriceCurrency = normalizeMarketplaceCurrency(stringInput(source.proposedPriceCurrency));
  const proposedPriceAmountMinor = proposedPriceCurrency
    ? parseMarketplacePriceToMinorUnits(priceInput(source.proposedPrice), proposedPriceCurrency)
    : undefined;

  if (!listingId) {
    errors.listingId = 'Required';
  }

  if (!buyerProfileId) {
    errors.buyerProfileId = 'Required';
  }

  if (!message) {
    errors.message = 'Required';
  } else if (message.length > MAX_INQUIRY_MESSAGE_LENGTH) {
    errors.message = `Use ${MAX_INQUIRY_MESSAGE_LENGTH} characters or fewer`;
  }

  if (buyerDestinationSummary && buyerDestinationSummary.length > MAX_DESTINATION_SUMMARY_LENGTH) {
    errors.buyerDestinationSummary = `Use ${MAX_DESTINATION_SUMMARY_LENGTH} characters or fewer`;
  }

  if (proposedPriceProvided || proposedPriceCurrencyProvided) {
    if (!proposedPriceCurrency) {
      errors.proposedPriceCurrency = 'Use a three-letter currency code';
    }

    if (proposedPriceAmountMinor === undefined) {
      errors.proposedPrice = 'Enter a valid proposed price';
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      errors,
      valid: false
    };
  }

  return {
    errors: {},
    inquiry: {
      buyerProfileId: buyerProfileId as string,
      listingId: listingId as string,
      message: message as string,
      ...(proposedPriceAmountMinor !== undefined && proposedPriceCurrency
        ? {
            proposedPriceAmountMinor,
            proposedPriceCurrency
          }
        : {}),
      ...(buyerDestinationSummary ? {buyerDestinationSummary} : {})
    },
    valid: true
  };
}

function isObjectRecord(value: unknown): value is MarketplaceInquiryDraft {
  return typeof value === 'object' && value !== null;
}
