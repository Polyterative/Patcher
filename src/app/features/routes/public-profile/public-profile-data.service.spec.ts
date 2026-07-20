import { of, Subject, throwError } from 'rxjs';
import { type MarketplaceListing } from 'src/app/features/marketplace/marketplace-listing.utils';
import { createMarketplaceListing } from 'src/app/features/marketplace/marketplace-test-helpers.spec';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { environment } from 'src/environments/environment';
import { PublicProfileDataService } from './public-profile-data.service';

describe('PublicProfileDataService', () => {
  let createdServices: PublicProfileDataService[];
  let originalMarketplaceEnabled: boolean;

  function build(profileData: any) {
    const backend = {
      get: {
        publicProfileByUsername: jasmine.createSpy().and.returnValue(of({data: profileData})),
      },
      GET: {
        publicUserPatchesPaginated: jasmine.createSpy().and.returnValue(of({data: [], count: 0})),
        publicUserRacksPaginated: jasmine.createSpy().and.returnValue(of({data: [], count: 0})),
        publicUserContributorStats: jasmine.createSpy().and.returnValue(of({approvedPublicModules: 2})),
        activeMarketplaceListingsBySellerProfileId: jasmine.createSpy().and.returnValue(of([])),
      },
    };
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
    const service = new PublicProfileDataService(backend as any, snackBar);
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
    backend.GET.publicUserPatchesPaginated.and.returnValue(require('rxjs').of({data: [], count: 5}));
    backend.GET.publicUserRacksPaginated.and.returnValue(require('rxjs').of({data: [], count: 3}));

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
      require('rxjs').of({data: [{id: 10}], count: 1})
    );
    backend.GET.publicUserRacksPaginated.and.returnValue(
      require('rxjs').of({data: [{id: 20}], count: 1})
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
    const backend = {
      get: {
        publicProfileByUsername: jasmine.createSpy().and.returnValue(
          require('rxjs').throwError(() => new Error('network'))
        ),
      },
      GET: {
        publicUserPatchesPaginated: jasmine.createSpy().and.returnValue(require('rxjs').of({data: [], count: 0})),
        publicUserRacksPaginated: jasmine.createSpy().and.returnValue(require('rxjs').of({data: [], count: 0})),
        publicUserContributorStats: jasmine.createSpy().and.returnValue(require('rxjs').of({})),
        activeMarketplaceListingsBySellerProfileId: jasmine.createSpy().and.returnValue(require('rxjs').of([])),
      },
    };
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
    const service = new PublicProfileDataService(backend as any, snackBar);
    createdServices.push(service);

    service.loadProfile$.next('erroruser');

    expect(service.routeState$.value).toBe('error');
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });

  it('loadMorePatches$ appends results and advances skip', () => {
    const firstPage = [{id: 1}, {id: 2}];
    const secondPage = [{id: 3}, {id: 4}];
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.publicUserPatchesPaginated
      .and.returnValues(
        require('rxjs').of({data: firstPage, count: 4}),
        require('rxjs').of({data: secondPage, count: 4}),
      );
    backend.GET.publicUserRacksPaginated.and.returnValue(require('rxjs').of({data: [], count: 0}));

    service.loadProfile$.next('gooduser');
    expect(service.patchesData$.value).toEqual(firstPage as any);

    service.loadMorePatches$.next();
    expect(service.patchesData$.value).toEqual([...firstPage, ...secondPage] as any);
    expect(service.patchesCount$.value).toBe(4);
  });

  it('loadMoreRacks$ appends results and advances skip', () => {
    const firstPage = [{id: 10}, {id: 11}];
    const secondPage = [{id: 12}];
    const {service, backend} = build({
      id: 'pub-1',
      username: 'gooduser',
      public: true,
    });
    backend.GET.publicUserPatchesPaginated.and.returnValue(require('rxjs').of({data: [], count: 0}));
    backend.GET.publicUserRacksPaginated
      .and.returnValues(
        require('rxjs').of({data: firstPage, count: 3}),
        require('rxjs').of({data: secondPage, count: 3}),
      );

    service.loadProfile$.next('gooduser');
    expect(service.rackData$.value).toEqual(firstPage as any);

    service.loadMoreRacks$.next();
    expect(service.rackData$.value).toEqual([...firstPage, ...secondPage] as any);
    expect(service.racksCount$.value).toBe(3);
  });
});
