import {
  DestroyRef,
  Injectable
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  of,
  ReplaySubject,
  Subject,
} from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';
import { PublicProfile } from 'src/app/models/user';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { PublicUserContributorStats } from 'src/app/features/backend/supabase-queries';
import {
  buildMarketplaceCardViewModel,
  MarketplaceListingCardViewModel
} from 'src/app/features/marketplace/marketplace-view-models';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { environment } from 'src/environments/environment';
import { PublicProfileRouteState } from './public-profile-data.models';
import {
  mapProfile,
  toLimitedProfile
} from './public-profile-data.utils';

export type { PublicProfileRouteState } from './public-profile-data.models';

@Injectable()
export class PublicProfileDataService extends SubManager {
  readonly marketplaceEnabled = environment.features.marketplaceEnabled;

  readonly loadProfile$ = new ReplaySubject<string>(1);

  readonly routeState$ = new BehaviorSubject<PublicProfileRouteState>('loading');
  readonly profile$ = new BehaviorSubject<PublicProfile | null>(null);

  readonly patchesData$ = new BehaviorSubject<Patch[] | undefined>(undefined);
  readonly rackData$ = new BehaviorSubject<Rack[] | undefined>(undefined);
  readonly contributorStats$ = new BehaviorSubject<PublicUserContributorStats | undefined>(undefined);
  readonly marketplaceListings$ = new BehaviorSubject<MarketplaceListingCardViewModel[] | undefined>(undefined);
  readonly marketplaceListingsLoading$ = new BehaviorSubject<boolean>(false);
  readonly marketplaceListingsError$ = new BehaviorSubject<string | null>(null);

  readonly patchesCount$ = new BehaviorSubject<number>(0);
  readonly racksCount$ = new BehaviorSubject<number>(0);

  readonly patchesPagination = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(10),
  };

  readonly racksPagination = {
    skip$: new BehaviorSubject<number>(0),
    take$: new BehaviorSubject<number>(10),
  };

  readonly updatePatchesData$ = new Subject<void>();
  readonly updateRacksData$ = new Subject<void>();
  readonly updateContributorStats$ = new Subject<void>();
  readonly updateMarketplaceListings$ = new Subject<void>();
  readonly retryMarketplaceListings$ = new Subject<void>();
  readonly loadMorePatches$ = new Subject<void>();
  readonly loadMoreRacks$ = new Subject<void>();

  private readonly cancelMarketplaceListings$ = new Subject<void>();

  constructor(
    private readonly backend: SupabaseService,
    private readonly snackBar: MatSnackBar,
    destroyRef?: DestroyRef,
  ) {
    super(destroyRef);

    this.initializeProfileLoadHandler();
    this.initializePatchLoadHandler();
    this.initializeRackLoadHandler();
    this.initializeContributorLoadHandler();
    this.initializeMarketplaceListingsLoadHandler();
  }

  private initializeProfileLoadHandler(): void {
    this.loadProfile$
      .pipe(
        tap(() => {
          this.cancelMarketplaceListings$.next();
          this.routeState$.next('loading');
          this.profile$.next(null);
          this.patchesData$.next(undefined);
          this.rackData$.next(undefined);
          this.contributorStats$.next(undefined);
          this.resetMarketplaceListings();
          this.patchesCount$.next(0);
          this.racksCount$.next(0);
          this.patchesPagination.skip$.next(0);
          this.racksPagination.skip$.next(0);
        }),
        switchMap((username) => this.backend.get.publicProfileByUsername(username)),
        this.takeUntilDestroyed(),
      )
      .subscribe({
        next: (response) => {
          const profile = mapProfile(response?.data);

          if (!profile) {
            this.routeState$.next('not-found');
            this.resetPublicCollections();
            return;
          }

          if (profile.username.startsWith('user_')) {
            this.profile$.next(toLimitedProfile(profile));
            this.routeState$.next('incomplete');
            this.resetPublicCollections();
            return;
          }

          if (!profile.public) {
            this.profile$.next(toLimitedProfile(profile));
            this.routeState$.next('private');
            this.resetPublicCollections();
            return;
          }

          this.profile$.next(profile);
          this.routeState$.next('ready');
          this.updatePatchesData$.next();
          this.updateRacksData$.next();
          this.updateContributorStats$.next();
          if (this.marketplaceEnabled) {
            this.updateMarketplaceListings$.next();
          }
        },
        error: (error) => {
          console.error('PublicProfileDataService profile load failed:', error);
          SharedConstants.errorCustom(this.snackBar, 'Public profile data could not be loaded.');
          this.routeState$.next('error');
          this.resetPublicCollections();
        },
      });
  }

  private initializeContributorLoadHandler(): void {
    this.updateContributorStats$
      .pipe(
        withLatestFrom(this.profile$),
        filter(([, profile]) => !!profile && profile.public),
        tap(() => this.contributorStats$.next(undefined)),
        switchMap(([, profile]) => this.backend.GET.publicUserContributorStats(profile!.id)),
        this.takeUntilDestroyed(),
      )
      .subscribe({
        next: (stats) => {
          this.contributorStats$.next(stats);
        },
        error: (error) => {
          console.error('PublicProfileDataService contributor stats load failed:', error);
          SharedConstants.errorCustom(this.snackBar, 'Public contributor stats could not be loaded.');
          this.contributorStats$.next({approvedPublicModules: 0});
        },
      });
  }

  private initializeMarketplaceListingsLoadHandler(): void {
    this.retryMarketplaceListings$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => this.updateMarketplaceListings$.next());

    this.updateMarketplaceListings$
      .pipe(
        withLatestFrom(this.profile$, this.routeState$),
        filter(([, profile, state]) => this.marketplaceEnabled && state === 'ready' && !!profile && profile.public),
        tap(() => {
          this.marketplaceListingsLoading$.next(true);
          this.marketplaceListingsError$.next(null);
          this.marketplaceListings$.next(undefined);
        }),
        switchMap(([, profile]) => this.backend.GET.activeMarketplaceListingsBySellerProfileId(profile!.id).pipe(
          takeUntil(this.cancelMarketplaceListings$),
          map(listings => ({
            error: null,
            listings: listings.map(listing => buildMarketplaceCardViewModel(listing)),
          })),
          catchError(error => {
            console.error('PublicProfileDataService marketplace listings load failed:', error);
            return of({
              error: 'Marketplace listings could not be loaded.',
              listings: undefined,
            });
          })
        )),
        this.takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.marketplaceListingsError$.next(result.error);
        this.marketplaceListings$.next(result.listings);
        this.marketplaceListingsLoading$.next(false);
      });
  }

  private initializePatchLoadHandler(): void {
    this.loadMorePatches$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.patchesPagination.skip$.next(this.patchesData$.value?.length ?? 0);
        this.updatePatchesData$.next();
      });

    this.updatePatchesData$
      .pipe(
        withLatestFrom(this.profile$),
        filter(([, profile]) => !!profile && profile.public),
        tap(() => {
          if (this.patchesPagination.skip$.value === 0) {
            this.patchesData$.next(undefined);
          }
        }),
        switchMap(([, profile]) => {
          const skip = this.patchesPagination.skip$.value;
          const take = this.patchesPagination.take$.value;

          return this.backend.GET.publicUserPatchesPaginated(
            profile!.id,
            skip,
            skip + take - 1,
          );
        }),
        this.takeUntilDestroyed(),
      )
      .subscribe({
        next: (response) => {
          const skip = this.patchesPagination.skip$.value;
          const incoming = (response?.data as Patch[]) ?? [];
          const current = this.patchesData$.value ?? [];
          this.patchesData$.next(skip === 0 ? incoming : [...current, ...incoming]);
          this.patchesCount$.next(response?.count ?? 0);
        },
        error: (error) => {
          console.error('PublicProfileDataService patch load failed:', error);
          SharedConstants.errorCustom(this.snackBar, 'Public patches could not be loaded.');
          this.patchesData$.next([]);
          this.patchesCount$.next(0);
        },
      });
  }

  private initializeRackLoadHandler(): void {
    this.loadMoreRacks$
      .pipe(this.takeUntilDestroyed())
      .subscribe(() => {
        this.racksPagination.skip$.next(this.rackData$.value?.length ?? 0);
        this.updateRacksData$.next();
      });

    this.updateRacksData$
      .pipe(
        withLatestFrom(this.profile$),
        filter(([, profile]) => !!profile && profile.public),
        tap(() => {
          if (this.racksPagination.skip$.value === 0) {
            this.rackData$.next(undefined);
          }
        }),
        switchMap(([, profile]) => {
          const skip = this.racksPagination.skip$.value;
          const take = this.racksPagination.take$.value;

          return this.backend.GET.publicUserRacksPaginated(
            profile!.id,
            skip,
            skip + take - 1,
          );
        }),
        this.takeUntilDestroyed(),
      )
      .subscribe({
        next: (response) => {
          const skip = this.racksPagination.skip$.value;
          const incoming = (response?.data as Rack[]) ?? [];
          const current = this.rackData$.value ?? [];
          this.rackData$.next(skip === 0 ? incoming : [...current, ...incoming]);
          this.racksCount$.next(response?.count ?? 0);
        },
        error: (error) => {
          console.error('PublicProfileDataService rack load failed:', error);
          SharedConstants.errorCustom(this.snackBar, 'Public racks could not be loaded.');
          this.rackData$.next([]);
          this.racksCount$.next(0);
        },
      });
  }

  private resetPublicCollections(): void {
    this.patchesData$.next([]);
    this.rackData$.next([]);
    this.resetMarketplaceListings();
  }

  private resetMarketplaceListings(): void {
    this.marketplaceListings$.next(undefined);
    this.marketplaceListingsLoading$.next(false);
    this.marketplaceListingsError$.next(null);
  }

}
