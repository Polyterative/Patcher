import { from as rxFrom, Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { Cacheable } from 'ts-cacheable';
import { MarketplaceListing } from 'src/app/features/marketplace/marketplace-listing.utils';
import { DbPaths } from './DatabaseStrings';
import {
  cacheBuster$,
  defaultCacheTime,
  remapErrors,
  throwIfSupabaseError
} from './supabase.cache';
import { type SupabaseSingleResponse } from './supabase-db.types';
import { SupabaseQueriesBase } from './supabase-queries.base';
import {
  MARKETPLACE_LISTING_WITH_RELATIONS_COLUMNS,
  mapMarketplaceListingRow,
  type MarketplaceListingRow
} from './supabase-marketplace-listings';

export class SupabaseMarketplaceListingQueries extends SupabaseQueriesBase {
  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$
  })
  getActiveMarketplaceListings(from = 0, to: number = this.defaultPag): Observable<MarketplaceListing[]> {
    return rxFrom(
      this.supabase
        .from(DbPaths.marketplace_listings)
        .select(MARKETPLACE_LISTING_WITH_RELATIONS_COLUMNS)
        .in('status', ['active', 'reserved'])
        .order('updated_at', {ascending: false})
        .order('id', {ascending: false})
        .range(from, to)
    ).pipe(
      throwIfSupabaseError<SupabaseSingleResponse<MarketplaceListingRow[]>>(),
      remapErrors(),
      map(response => ((response.data ?? []) as MarketplaceListingRow[]).map(mapMarketplaceListingRow))
    );
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$
  })
  getActiveMarketplaceListingsBySellerProfileId(sellerProfileId: string): Observable<MarketplaceListing[]> {
    return rxFrom(
      this.supabase
        .from(DbPaths.marketplace_listings)
        .select(MARKETPLACE_LISTING_WITH_RELATIONS_COLUMNS)
        .eq('seller_profileid', sellerProfileId)
        .in('status', ['active', 'reserved'])
        .order('updated_at', {ascending: false})
        .order('id', {ascending: false})
    ).pipe(
      throwIfSupabaseError<SupabaseSingleResponse<MarketplaceListingRow[]>>(),
      remapErrors(),
      map(response => ((response.data ?? []) as MarketplaceListingRow[]).map(mapMarketplaceListingRow))
    );
  }

  @Cacheable({
    maxAge: defaultCacheTime,
    cacheBusterObserver: cacheBuster$
  })
  getMarketplaceListingByPublicId(publicId: string): Observable<MarketplaceListing | null> {
    return rxFrom(
      this.supabase
        .from(DbPaths.marketplace_listings)
        .select(MARKETPLACE_LISTING_WITH_RELATIONS_COLUMNS)
        .eq('public_id', publicId)
        .maybeSingle()
    ).pipe(
      throwIfSupabaseError<SupabaseSingleResponse<MarketplaceListingRow | null>>(),
      remapErrors(),
      map(response => response.data ? mapMarketplaceListingRow(response.data as MarketplaceListingRow) : null)
    );
  }

  getCurrentUserMarketplaceListings(): Observable<MarketplaceListing[]> {
    return this.getUserSession$().pipe(
      switchMap(user => {
        if (!user) {
          return of({data: [], error: null} as SupabaseSingleResponse<MarketplaceListingRow[]>);
        }

        return rxFrom(
          this.supabase
            .from(DbPaths.marketplace_listings)
            .select(MARKETPLACE_LISTING_WITH_RELATIONS_COLUMNS)
            .eq('seller_profileid', user.id)
            .order('updated_at', {ascending: false})
            .order('id', {ascending: false})
        );
      }),
      throwIfSupabaseError<SupabaseSingleResponse<MarketplaceListingRow[]>>(),
      remapErrors(),
      map(response => ((response.data ?? []) as MarketplaceListingRow[]).map(mapMarketplaceListingRow))
    );
  }
}
