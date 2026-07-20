import {
  type MarketplaceTransactionSnapshotInput,
  type MarketplaceTransactionSnapshotSummary
} from './marketplace-transaction.models';

export function buildMarketplaceTransactionSnapshotSummary(
  input: MarketplaceTransactionSnapshotInput
): MarketplaceTransactionSnapshotSummary {
  const accepted = input.status === 'accepted';
  const hasAcceptedPriceSnapshot = accepted &&
    typeof input.agreedPriceAmountMinor === 'number' &&
    Number.isInteger(input.agreedPriceAmountMinor) &&
    input.agreedPriceAmountMinor >= 0 &&
    typeof input.agreedPriceCurrency === 'string' &&
    input.agreedPriceCurrency.trim().length > 0;
  const hasBuyerAddressSnapshot = accepted && input.buyerShippingAddressSnapshot !== null &&
    input.buyerShippingAddressSnapshot !== undefined;

  return {
    accepted,
    hasAcceptedPriceSnapshot,
    hasBuyerAddressSnapshot,
    readyToRevealSensitiveDetails: accepted && hasAcceptedPriceSnapshot && hasBuyerAddressSnapshot
  };
}
