import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  of,
  ReplaySubject
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
  type MarketplaceListing,
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
        map(listing => {
          const publicListing = publicActiveListingOrNull(listing);
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
