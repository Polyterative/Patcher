import {
  MARKETPLACE_DUPLICATE_LISTING_WARNING_STATUSES,
  type MarketplaceDuplicateListingCandidate,
  type MarketplaceDuplicateListingDraftIdentity,
  type MarketplaceDuplicateListingWarningResult,
  type MarketplaceDuplicateListingWarningStatus
} from './marketplace-listing.model';
import { trimOptionalText } from './marketplace-listing-shared.utils';

export function getMarketplaceDuplicateListingWarning(
  existingListings: readonly MarketplaceDuplicateListingCandidate[] | null | undefined,
  draft: MarketplaceDuplicateListingDraftIdentity | null | undefined
): MarketplaceDuplicateListingWarningResult {
  const moduleId = trimOptionalText(draft?.moduleId);
  const sellerProfileId = trimOptionalText(draft?.sellerProfileId);

  if (!moduleId || !sellerProfileId || !Array.isArray(existingListings)) {
    return {hasDuplicate: false};
  }

  const duplicate = existingListings.find((listing) => {
    const listingModuleId = trimOptionalText(listing.moduleId);
    const listingSellerProfileId = trimOptionalText(listing.sellerProfileId);

    return listingModuleId === moduleId
      && listingSellerProfileId === sellerProfileId
      && isMarketplaceDuplicateListingWarningStatus(listing.status);
  });

  if (!duplicate || !isMarketplaceDuplicateListingWarningStatus(duplicate.status)) {
    return {hasDuplicate: false};
  }

  const id = trimOptionalText(duplicate.id);
  const publicId = trimOptionalText(duplicate.publicId);
  const titleOverride = trimOptionalText(duplicate.titleOverride);

  return {
    hasDuplicate: true,
    listing: {
      status: duplicate.status,
      ...(id ? {id} : {}),
      ...(publicId ? {publicId} : {}),
      ...(titleOverride ? {titleOverride} : {})
    },
    message: 'This seller already has an open listing for this module.',
    moduleId
  };
}

export function isMarketplaceDuplicateListingWarningStatus(
  value: unknown
): value is MarketplaceDuplicateListingWarningStatus {
  return typeof value === 'string'
    && MARKETPLACE_DUPLICATE_LISTING_WARNING_STATUSES.includes(value as MarketplaceDuplicateListingWarningStatus);
}
