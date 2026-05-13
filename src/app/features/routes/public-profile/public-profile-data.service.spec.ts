import { of } from 'rxjs';
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
});
