import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  forkJoin,
  of,
  ReplaySubject,
  type Observable
} from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import {
  storagePathFromMarketplaceListingImageUrl
} from 'src/app/features/backend/supabase-marketplace-listings';
import {
  type MarketplaceListing,
  type MarketplaceListingMedia,
  type MarketplaceListingStatus
} from 'src/app/features/marketplace/marketplace-listing.utils';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  buildMarketplaceDetailViewModel,
  MarketplaceListingDetailViewModel
} from 'src/app/features/marketplace/marketplace-view-models';

export interface MarketplaceDetailViewState {
  error: string | null;
  listing: MarketplaceListingDetailViewModel | null;
  loading: boolean;
  notFound: boolean;
}

const EMPTY_DETAIL_STATE: MarketplaceDetailViewState = {
  error: null,
  listing: null,
  loading: false,
  notFound: false
};
const PUBLIC_MARKETPLACE_DETAIL_STATUSES = new Set<MarketplaceListingStatus>(['active', 'reserved']);

@Injectable()
export class MarketplaceDetailDataService extends SubManager {
  private readonly _vm$ = new BehaviorSubject<MarketplaceDetailViewState>(EMPTY_DETAIL_STATE);

  readonly vm$ = this._vm$.asObservable();
  readonly loadListing$ = new ReplaySubject<string>(1);

  constructor(
    private readonly backend: SupabaseService,
    private readonly snackBar: MatSnackBar
  ) {
    super();
    this.initializeLoadHandler();
  }

  private initializeLoadHandler(): void {
    this.loadListing$.pipe(
      tap(() => this._vm$.next({error: null, listing: null, loading: true, notFound: false})),
      switchMap(publicId => this.backend.GET.marketplaceListingByPublicId(publicId).pipe(
        switchMap(listing => {
          const publicListing = publicActiveListingOrNull(listing);
          return publicListing ? this.resolveListingMediaUrls$(publicListing) : of(null);
        }),
        map(publicListing => {
          return {
            error: null,
            listing: publicListing ? buildMarketplaceDetailViewModel(publicListing) : null,
            loading: false,
            notFound: !publicListing
          } satisfies MarketplaceDetailViewState;
        }),
        catchError(error => {
          const message = this.errorMessage(error);
          SharedConstants.errorCustom(this.snackBar, message);
          return of({
            error: message,
            listing: null,
            loading: false,
            notFound: false
          } satisfies MarketplaceDetailViewState);
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe(vm => this._vm$.next(vm));
  }

  private resolveListingMediaUrls$(listing: MarketplaceListing): Observable<MarketplaceListing> {
    if (!listing.media.length) {
      return of(listing);
    }

    return forkJoin(listing.media.map(media => this.resolveListingMediaUrl$(media))).pipe(
      map(media => ({
        ...listing,
        media: media.filter((item): item is MarketplaceListingMedia => item !== null)
      }))
    );
  }

  private resolveListingMediaUrl$(media: MarketplaceListingMedia): Observable<MarketplaceListingMedia | null> {
    const storagePath = media.storagePath || storagePathFromMarketplaceListingImageUrl(media.url);
    if (!storagePath) {
      return of(media);
    }

    return this.backend.storage.createMarketplaceListingImageSignedUrl(storagePath).pipe(
      map(url => ({...media, url})),
      catchError(() => of(null))
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error && error.message
      ? error.message
      : 'Marketplace listing could not be loaded.';
  }
}

function publicActiveListingOrNull(listing: MarketplaceListing | null): MarketplaceListing | null {
  return !!listing
    && PUBLIC_MARKETPLACE_DETAIL_STATUSES.has(listing.status)
    && listing.seller?.public === true
    ? listing
    : null;
}
