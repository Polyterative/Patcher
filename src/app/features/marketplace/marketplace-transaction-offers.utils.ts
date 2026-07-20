import {
  normalizeMarketplaceCurrency,
  parseMarketplacePriceToMinorUnits
} from './marketplace-money.utils';
import {
  AGREED_PRICE_STATUSES,
  hasMeaningfulInput,
  INACTIVE_OFFER_STATUSES,
  isMarketplaceTransactionStatus,
  MARKETPLACE_OFFER_PARTICIPANT_SET,
  priceInput
} from './marketplace-transaction.internal';
import {
  type MarketplaceLatestOfferSource,
  type MarketplaceLatestOfferSummary,
  type MarketplaceLatestOfferSummaryInput,
  type MarketplaceOfferParticipantRole,
  type MarketplaceTransactionStatus
} from './marketplace-transaction.models';

interface MarketplaceLatestOfferCandidateInput {
  amountMinor?: number | null;
  currency?: string | null;
  price?: string | number | null;
  source: MarketplaceLatestOfferSource;
}

type MarketplaceLatestOfferCandidate =
  | {
      valid: true;
      amountMinor: number;
      currency: string;
      source: MarketplaceLatestOfferSource;
    }
  | {
      valid: false;
      source: MarketplaceLatestOfferSource;
    };

export function buildMarketplaceLatestOfferSummary(
  input: MarketplaceLatestOfferSummaryInput | null | undefined
): MarketplaceLatestOfferSummary {
  const status = input?.status;

  if (!input || !isMarketplaceTransactionStatus(status) || INACTIVE_OFFER_STATUSES.has(status)) {
    return {available: false, reason: 'inactive_status'};
  }

  const candidate = latestOfferCandidateForStatus(status, input);

  if (!candidate) {
    return {available: false, reason: 'missing_price'};
  }

  if (!candidate.valid) {
    return {available: false, reason: 'invalid_price'};
  }

  const awaitingActorRole = awaitingActorRoleForLatestOffer(candidate.source, input?.latestActorRole);
  const summary: MarketplaceLatestOfferSummary = {
    amountMinor: candidate.amountMinor,
    available: true,
    canCurrentActorRespond: input?.currentActorRole === awaitingActorRole,
    currency: candidate.currency,
    label: latestOfferLabel(candidate.source, input?.latestActorRole),
    source: candidate.source
  };

  return awaitingActorRole
    ? {
        ...summary,
        awaitingActorRole
      }
    : summary;
}

function latestOfferCandidateForStatus(
  status: MarketplaceTransactionStatus,
  input: MarketplaceLatestOfferSummaryInput
): MarketplaceLatestOfferCandidate | undefined {
  if (AGREED_PRICE_STATUSES.has(status)) {
    return latestOfferCandidate({
      amountMinor: input.agreedPriceAmountMinor,
      currency: input.agreedPriceCurrency,
      price: input.agreedPrice,
      source: 'agreed_price'
    });
  }

  if (status !== 'proposed' && status !== 'negotiating') {
    return undefined;
  }

  const counterCandidate = latestOfferCandidate({
    amountMinor: input.counterPriceAmountMinor,
    currency: input.counterPriceCurrency,
    price: input.counterPrice,
    source: 'counter_price'
  });

  if (counterCandidate) {
    return counterCandidate;
  }

  const proposedCandidate = latestOfferCandidate({
    amountMinor: input.proposedPriceAmountMinor,
    currency: input.proposedPriceCurrency,
    price: input.proposedPrice,
    source: 'proposed_price'
  });

  return proposedCandidate ?? counterCandidate;
}

function latestOfferCandidate(
  input: MarketplaceLatestOfferCandidateInput
): MarketplaceLatestOfferCandidate | undefined {
  if (!hasMeaningfulInput(input.price) && !hasMeaningfulInput(input.amountMinor) && !hasMeaningfulInput(input.currency)) {
    return undefined;
  }

  const currency = normalizeMarketplaceCurrency(input.currency);
  const amountMinor = normalizeMarketplaceOfferAmountMinor(input.amountMinor, input.price, currency);

  if (!currency || amountMinor === undefined) {
    return {
      source: input.source,
      valid: false
    };
  }

  return {
    amountMinor,
    currency,
    source: input.source,
    valid: true
  };
}

function normalizeMarketplaceOfferAmountMinor(
  amountMinor: number | null | undefined,
  price: string | number | null | undefined,
  currency: string | undefined
): number | undefined {
  if (amountMinor !== null && amountMinor !== undefined) {
    return Number.isInteger(amountMinor) && amountMinor >= 0 ? amountMinor : undefined;
  }

  return currency
    ? parseMarketplacePriceToMinorUnits(priceInput(price), currency)
    : undefined;
}

function awaitingActorRoleForLatestOffer(
  source: MarketplaceLatestOfferSource,
  latestActorRole: MarketplaceOfferParticipantRole | null | undefined
): MarketplaceOfferParticipantRole | undefined {
  if (source === 'agreed_price') {
    return undefined;
  }

  const actorRole = MARKETPLACE_OFFER_PARTICIPANT_SET.has(latestActorRole ?? '')
    ? latestActorRole
    : defaultLatestActorRoleForSource(source);

  return actorRole === 'buyer' ? 'seller' : 'buyer';
}

function defaultLatestActorRoleForSource(source: MarketplaceLatestOfferSource): MarketplaceOfferParticipantRole {
  return source === 'counter_price' ? 'seller' : 'buyer';
}

function latestOfferLabel(
  source: MarketplaceLatestOfferSource,
  latestActorRole: MarketplaceOfferParticipantRole | null | undefined
): string {
  if (source === 'agreed_price') {
    return 'Agreed price';
  }

  const actorRole = MARKETPLACE_OFFER_PARTICIPANT_SET.has(latestActorRole ?? '')
    ? latestActorRole
    : defaultLatestActorRoleForSource(source);

  return actorRole === 'seller' ? 'Seller counter offer' : 'Buyer offer';
}
