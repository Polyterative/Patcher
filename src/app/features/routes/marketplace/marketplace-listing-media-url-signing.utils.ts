import {
  forkJoin,
  of,
  type Observable
} from 'rxjs';
import {
  catchError,
  map
} from 'rxjs/operators';
import {
  storagePathFromMarketplaceListingImageUrl
} from 'src/app/features/backend/supabase-marketplace-listings';
import {
  type MarketplaceListing,
  type MarketplaceListingMedia
} from 'src/app/features/marketplace/marketplace-listing.utils';

export type MarketplaceListingImageUrlSigner = (storagePath: string) => Observable<string>;

export function resolveMarketplaceListingMediaUrls$(
  listing: MarketplaceListing,
  signImageUrl: MarketplaceListingImageUrlSigner
): Observable<MarketplaceListing> {
  if (!listing.media.length) {
    return of(listing);
  }

  return forkJoin(listing.media.map(media => resolveMarketplaceListingMediaUrl$(media, signImageUrl))).pipe(
    map(media => ({
      ...listing,
      media: media.filter((item): item is MarketplaceListingMedia => item !== null)
    }))
  );
}

export function resolveMarketplaceListingsMediaUrls$(
  listings: MarketplaceListing[],
  signImageUrl: MarketplaceListingImageUrlSigner
): Observable<MarketplaceListing[]> {
  if (!listings.length) {
    return of([]);
  }

  return forkJoin(listings.map(listing => resolveMarketplaceListingMediaUrls$(listing, signImageUrl)));
}

function resolveMarketplaceListingMediaUrl$(
  media: MarketplaceListingMedia,
  signImageUrl: MarketplaceListingImageUrlSigner
): Observable<MarketplaceListingMedia | null> {
  const storagePath = media.storagePath || storagePathFromMarketplaceListingImageUrl(media.url);
  if (!storagePath) {
    return of(media);
  }

  return signImageUrl(storagePath).pipe(
    map(url => ({...media, url})),
    catchError(() => of(null))
  );
}
