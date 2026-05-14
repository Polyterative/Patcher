import { of } from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { PublicProfileDataService } from './public-profile-data.service';

describe('PublicProfileDataService', () => {
  let createdServices: PublicProfileDataService[];

  function build(profileData: any) {
    const backend = {
      get: {
        publicProfileByUsername: jasmine.createSpy().and.returnValue(of({data: profileData})),
      },
      GET: {
        publicUserPatchesPaginated: jasmine.createSpy().and.returnValue(of({data: [], count: 0})),
        publicUserRacksPaginated: jasmine.createSpy().and.returnValue(of({data: [], count: 0})),
        publicUserContributorStats: jasmine.createSpy().and.returnValue(of({approvedPublicModules: 2})),
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
  });

  afterEach(() => {
    createdServices.forEach((service) => service.ngOnDestroy());
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
    expect(service.patchesCount$.value).toBe(1);
    expect(service.racksCount$.value).toBe(1);
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
      },
    };
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
    const service = new PublicProfileDataService(backend as any, snackBar);
    createdServices.push(service);

    service.loadProfile$.next('erroruser');

    expect(service.routeState$.value).toBe('error');
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  });
});
