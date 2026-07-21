import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, of, Subject, throwError } from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { type PublicUserContributorStats } from 'src/app/features/backend/supabase-queries';
import { type MarketplaceListing } from 'src/app/features/marketplace/marketplace-listing.utils';
import { createMarketplaceListing } from 'src/app/features/marketplace/marketplace-test-helpers.spec';
import { Patch } from 'src/app/models/patch';
import { Rack } from 'src/app/models/rack';
import { PublicUser } from 'src/app/models/user';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { environment } from 'src/environments/environment';
import { PublicProfileDataService } from './public-profile-data.service';

type PublicProfileBackendRow = {
  id: string;
  username: string;
  public: boolean;
  website?: string | null;
  avatar_url?: string | null;
} | null;

interface BackendResult<T> {
  data: T;
}

interface PaginatedBackendResult<T> {
  data: T[];
  count: number;
}

type PublicProfileByUsername = (username: string) => Observable<BackendResult<PublicProfileBackendRow>>;
type PublicUserPatchesPaginated = (
  authorId: string,
  from?: number,
  to?: number
) => Observable<PaginatedBackendResult<Patch>>;
type PublicUserRacksPaginated = (
  authorId: string,
  from?: number,
  to?: number
) => Observable<PaginatedBackendResult<Rack>>;
type PublicUserContributorStatsQuery = (authorId: string) => Observable<PublicUserContributorStats>;
type ActiveMarketplaceListingsBySellerProfileId = (sellerProfileId: string) => Observable<MarketplaceListing[]>;

interface PublicProfileBackendDouble {
  get: {
    publicProfileByUsername: jasmine.Spy<PublicProfileByUsername>;
  };
  GET: {
    publicUserPatchesPaginated: jasmine.Spy<PublicUserPatchesPaginated>;
    publicUserRacksPaginated: jasmine.Spy<PublicUserRacksPaginated>;
    publicUserContributorStats: jasmine.Spy<PublicUserContributorStatsQuery>;
    activeMarketplaceListingsBySellerProfileId: jasmine.Spy<ActiveMarketplaceListingsBySellerProfileId>;
  };
}

describe('PublicProfileDataService', () => {
  let createdServices: PublicProfileDataService[];
  let originalMarketplaceEnabled: boolean;

  const publicAuthor: PublicUser = {
    id: 'pub-1',
    username: 'gooduser',
  };

  function paginatedResult<T>(data: T[], count: number): PaginatedBackendResult<T> {
    return {data, count};
  }

  function patchFixture(id: number): Patch {
    return {
      id,
      author: publicAuthor,
      name: `Patch ${ id }`,
      public: true,
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-02T00:00:00Z',
    };
  }

  function rackFixture(id: number): Rack {
    return {
      id,
      author: publicAuthor,
      name: `Rack ${ id }`,
      public: true,
      hp: 84,
      rows: 2,
      locked: false,
      created: '2026-01-01T00:00:00Z',
      updated: '2026-01-02T00:00:00Z',
    };
  }

  function asSupabaseService(backend: PublicProfileBackendDouble): SupabaseService {
    return Object.assign(Object.create(SupabaseService.prototype) as SupabaseService, backend);
  }

  function build(profileData: PublicProfileBackendRow) {
    const backend: PublicProfileBackendDouble = {
      get: {
        publicProfileByUsername: jasmine.createSpy<PublicProfileByUsername>('publicProfileByUsername')
          .and.returnValue(of({data: profileData})),
      },
      GET: {
        publicUserPatchesPaginated: jasmine.createSpy<PublicUserPatchesPaginated>('publicUserPatchesPaginated')
          .and.returnValue(of(paginatedResult([], 0))),
        publicUserRacksPaginated: jasmine.createSpy<PublicUserRacksPaginated>('publicUserRacksPaginated')
          .and.returnValue(of(paginatedResult([], 0))),
        publicUserContributorStats: jasmine.createSpy<PublicUserContributorStatsQuery>('publicUserContributorStats')
          .and.returnValue(of({approvedPublicModules: 2})),
        activeMarketplaceListingsBySellerProfileId:
          jasmine.createSpy<ActiveMarketplaceListingsBySellerProfileId>('activeMarketplaceListingsBySellerProfileId')
            .and.returnValue(of([])),
      },
    };
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
    const service = new PublicProfileDataService(asSupabaseService(backend), snackBar);
    createdServices.push(service);

    return {
      service,
      backend,
    };
  }

  beforeEach(() => {
    createdServices = [];
    originalMarketplaceEnabled = environment.features.marketplaceEnabled;
    environment.features.marketplaceEnabled = true;
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
    environment.features.marketplaceEnabled = originalMarketplaceEnabled;
  });

  it('strips website and avatar data for private profiles before exposing profile state', () => {
    const { service, backend } = build({
      id: 'private-user',
      username: 'private-user',
      public: false,
      website: 'https://private.example',
      avatar_url: 'https://private.example/avatar.png',
    });

    service.loadProfile$.next('private-user');

    expect(service.routeState$.value).toBe('private');
    expect(service.profile$.value).toEqual({
      id: 'private-user',
      username: 'private-user',
      public: false,
      website: null,
      avatarUrl: null,
    });
    expect(backend.GET.publicUserPatchesPaginated).not.toHaveBeenCalled();
    expect(backend.GET.publicUserRacksPaginated).not.toHaveBeenCalled();
    expect(backend.GET.publicUserContributorStats).not.toHaveBeenCalled();
    expect(backend.GET.activeMarketplaceListingsBySellerProfileId).not.toHaveBeenCalled();
  });

  it('patchesCount$ and racksCount$ reflect loaded counts for a public profile', () => {
    const { service, backend } = build({
      id: 'public-user',
      username: 'public-user',
      public: true,
    });
    backend.GET.publicUserPatchesPaginated.and.returnValue(of(paginatedResult([], 5)));
    backend.GET.publicUserRacksPaginated.and.returnValue(of(paginatedResult([], 3)));

    service.loadProfile$.next('public-user');

    expect(service.patchesCount$.value).toBe(5);
    expect(service.racksCount$.value).toBe(3);
  });

  it('loads public contributor stats for public profiles', () => {
    const { service, backend } = build({
      id: 'public-user',
      username: 'public-user',
      public: true,
      website: 'https://public.example',
      avatar_url: 'https://public.example/avatar.png',
    });

    service.loadProfile$.next('public-user');

    expect(backend.GET.publicUserContributorStats).toHaveBeenCalledWith('public-user');
    expect(service.contributorStats$.value).toEqual({approvedPublicModules: 2});
  });

  it('sets routeState$ to not-found when profile data is null', () => {
    const {service} = build(null);

    service.loadProfile$.next('ghost-user');

    expect(service.routeState$.value).toBe('not-found');
    expect(service.profile$.value).toBeNull();
  });

  it('sets routeState$ to incomplete for users with auto-generated usernames (user_ prefix)', () => {
    const {service} = build({
      id: 'anon-1',
      username: 'user_abc123',
      public: true,
    });

    service.loadProfile$.next('user_abc123');

    expect(service.routeState$.value).toBe('incomplete');
    expect(service.profile$.value?.website).toBeNull();
  });

  it('sets routeState$ to ready and loads patches and racks for a public profile', () => {
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.publicUserPatchesPaginated.and.returnValue(
      of(paginatedResult([patchFixture(10)], 1))
    );
    backend.GET.publicUserRacksPaginated.and.returnValue(
      of(paginatedResult([rackFixture(20)], 1))
    );

    service.loadProfile$.next('gooduser');

    expect(service.routeState$.value).toBe('ready');
    expect(backend.GET.publicUserPatchesPaginated).toHaveBeenCalled();
    expect(backend.GET.publicUserRacksPaginated).toHaveBeenCalled();
    expect(backend.GET.activeMarketplaceListingsBySellerProfileId).toHaveBeenCalledWith('pub-1');
    expect(service.patchesCount$.value).toBe(1);
    expect(service.racksCount$.value).toBe(1);
  });

  it('does not request seller marketplace listings when the feature flag is disabled', () => {
    environment.features.marketplaceEnabled = false;
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });

    service.loadProfile$.next('gooduser');

    expect(service.marketplaceEnabled).toBeFalse();
    expect(backend.GET.activeMarketplaceListingsBySellerProfileId).not.toHaveBeenCalled();
    expect(service.marketplaceListings$.value).toBeUndefined();
  });

  it('maps successful public seller marketplace listings for section rendering', () => {
    const listing = createMarketplaceListing({sellerProfileId: 'pub-1'});
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.activeMarketplaceListingsBySellerProfileId.and.returnValue(of([listing]));

    service.loadProfile$.next('gooduser');

    expect(service.marketplaceListingsError$.value).toBeNull();
    expect(service.marketplaceListingsLoading$.value).toBeFalse();
    expect(service.marketplaceListings$.value?.[0]).toEqual(jasmine.objectContaining({
      detailUrl: '/marketplace/maths-public',
      publicId: 'maths-public',
      title: 'Maths',
    }));
  });

  it('keeps a successful empty marketplace response as an empty array', () => {
    const {service} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });

    service.loadProfile$.next('gooduser');

    expect(service.marketplaceListingsError$.value).toBeNull();
    expect(service.marketplaceListingsLoading$.value).toBeFalse();
    expect(service.marketplaceListings$.value).toEqual([]);
  });

  it('surfaces marketplace listing errors without changing the profile route state', () => {
    const consoleSpy = spyOn(console, 'error');
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.activeMarketplaceListingsBySellerProfileId.and.returnValue(throwError(() => new Error('marketplace down')));

    service.loadProfile$.next('gooduser');

    expect(consoleSpy).toHaveBeenCalledWith(
      'PublicProfileDataService marketplace listings load failed:',
      jasmine.any(Error)
    );
    expect(service.routeState$.value).toBe('ready');
    expect(service.marketplaceListingsError$.value).toBe('Marketplace listings could not be loaded.');
    expect(service.marketplaceListings$.value).toBeUndefined();
  });

  it('resets marketplace listings when a later profile load is private', () => {
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.activeMarketplaceListingsBySellerProfileId.and.returnValue(of([createMarketplaceListing()]));

    service.loadProfile$.next('gooduser');
    expect(service.marketplaceListings$.value?.length).toBe(1);

    backend.get.publicProfileByUsername.and.returnValue(of({
      data: {
        id: 'private-user',
        username: 'private-user',
        public: false,
      }
    }));
    service.loadProfile$.next('private-user');

    expect(service.routeState$.value).toBe('private');
    expect(service.marketplaceListings$.value).toBeUndefined();
    expect(service.marketplaceListingsError$.value).toBeNull();
    expect(service.marketplaceListingsLoading$.value).toBeFalse();
  });

  it('retries marketplace listings while the public profile remains ready', () => {
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.activeMarketplaceListingsBySellerProfileId.and.returnValues(
      throwError(() => new Error('marketplace down')),
      of([createMarketplaceListing({publicId: 'retry-public'})])
    );

    service.loadProfile$.next('gooduser');
    service.retryMarketplaceListings$.next();

    expect(backend.GET.activeMarketplaceListingsBySellerProfileId).toHaveBeenCalledTimes(2);
    expect(service.marketplaceListingsError$.value).toBeNull();
    expect(service.marketplaceListings$.value?.[0].publicId).toBe('retry-public');
  });

  it('keeps loading true when a retry replaces an in-flight listing request', () => {
    const firstRequest$ = new Subject<MarketplaceListing[]>();
    const retryRequest$ = new Subject<MarketplaceListing[]>();
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.activeMarketplaceListingsBySellerProfileId.and.returnValues(
      firstRequest$,
      retryRequest$
    );

    service.loadProfile$.next('gooduser');
    service.retryMarketplaceListings$.next();

    expect(service.marketplaceListingsLoading$.value).toBeTrue();

    retryRequest$.next([]);
    retryRequest$.complete();

    expect(service.marketplaceListingsLoading$.value).toBeFalse();
  });

  it('ignores an in-flight listing response after navigating to another profile', () => {
    const firstRequest$ = new Subject<MarketplaceListing[]>();
    const secondListing = createMarketplaceListing({
      publicId: 'second-profile-listing',
      sellerProfileId: 'pub-2',
    });
    const {service, backend} = build({
      id: 'pub-1',
      username: 'first-user',
      public: true,
    });
    backend.GET.activeMarketplaceListingsBySellerProfileId.and.returnValues(
      firstRequest$,
      of([secondListing])
    );

    service.loadProfile$.next('first-user');
    backend.get.publicProfileByUsername.and.returnValue(of({
      data: {
        id: 'pub-2',
        username: 'second-user',
        public: true,
      }
    }));
    service.loadProfile$.next('second-user');
    firstRequest$.next([createMarketplaceListing({publicId: 'stale-listing'})]);

    expect(service.marketplaceListings$.value?.map(listing => listing.publicId))
      .toEqual(['second-profile-listing']);
  });

  it('sets routeState$ to error when profile backend call fails', () => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {});
    const {service, backend} = build(null);
    backend.get.publicProfileByUsername.and.returnValue(throwError(() => new Error('network')));

    service.loadProfile$.next('erroruser');

    expect(service.routeState$.value).toBe('error');
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('loadMorePatches$ appends results and advances skip', () => {
    const firstPage = [patchFixture(1), patchFixture(2)];
    const secondPage = [patchFixture(3), patchFixture(4)];
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.publicUserPatchesPaginated
      .and.returnValues(
        of(paginatedResult(firstPage, 4)),
        of(paginatedResult(secondPage, 4)),
      );
    backend.GET.publicUserRacksPaginated.and.returnValue(of(paginatedResult([], 0)));

    service.loadProfile$.next('gooduser');
    expect(service.patchesData$.value).toEqual(firstPage);

    service.loadMorePatches$.next();
    expect(service.patchesData$.value).toEqual([...firstPage, ...secondPage]);
    expect(service.patchesCount$.value).toBe(4);
  });

  it('loadMoreRacks$ appends results and advances skip', () => {
    const firstPage = [rackFixture(10), rackFixture(11)];
    const secondPage = [rackFixture(12)];
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.publicUserPatchesPaginated.and.returnValue(of(paginatedResult([], 0)));
    backend.GET.publicUserRacksPaginated
      .and.returnValues(
        of(paginatedResult(firstPage, 3)),
        of(paginatedResult(secondPage, 3)),
      );

    service.loadProfile$.next('gooduser');
    expect(service.rackData$.value).toEqual(firstPage);

    service.loadMoreRacks$.next();
    expect(service.rackData$.value).toEqual([...firstPage, ...secondPage]);
    expect(service.racksCount$.value).toBe(3);
  });
});
