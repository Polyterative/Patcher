import { ModulePriceListing } from 'src/app/features/backend/supabase-queries.models';
import { SearchLink } from './module-browser-detail.constants';

export function getAvailableRetailerSearchLinks(
  retailerSearchLinks: SearchLink[],
  listings: readonly ModulePriceListing[] | null | undefined
): SearchLink[] {
  if (!listings) {
    return retailerSearchLinks;
  }

  const verifiedListings = listings.filter(listing => listing.verificationStatus === 'verified');
  const listedStoreSlugs = new Set(
    verifiedListings
      .map(listing => normalizeStoreSlug(listing.storeSlug))
      .filter((slug): slug is string => !!slug)
  );
  const listedStoreIds = new Set(
    verifiedListings
      .map(listing => listing.storeId)
      .filter((storeId): storeId is number => Number.isFinite(storeId))
  );

  return retailerSearchLinks.filter(link => !searchLinkHasPriceListing(link, listedStoreSlugs, listedStoreIds));
}

function searchLinkHasPriceListing(
  link: SearchLink,
  listedStoreSlugs: ReadonlySet<string>,
  listedStoreIds: ReadonlySet<number>
): boolean {
  return (link.storeSlugs ?? []).some(slug => {
    const normalizedSlug = normalizeStoreSlug(slug);
    return !!normalizedSlug && listedStoreSlugs.has(normalizedSlug);
  }) || (link.storeIds ?? []).some(storeId => listedStoreIds.has(storeId));
}

function normalizeStoreSlug(slug: string | null | undefined): string | null {
  const normalizedSlug = slug?.trim().toLowerCase();
  return normalizedSlug || null;
}

export function getManufacturerSearchLinks(
  links: readonly SearchLink[],
  manufacturerId: number | null | undefined
): SearchLink[] {
  if (!manufacturerId) {
    return [];
  }

  return links.filter(link => (link.manufacturerIds ?? []).includes(manufacturerId));
}
