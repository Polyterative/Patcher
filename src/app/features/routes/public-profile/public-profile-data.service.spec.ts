import { of } from 'rxjs';
import { PublicProfileDataService } from './public-profile-data.service';

describe('PublicProfileDataService', () => {
  function build(profileData: any) {
    const backend = {
      get: {
        publicProfileByUsername: jasmine.createSpy().and.returnValue(of({data: profileData})),
      },
      GET: {
        publicUserPatchesPaginated: jasmine.createSpy().and.returnValue(of({data: [], count: 0})),
        publicUserRacksPaginated: jasmine.createSpy().and.returnValue(of({data: [], count: 0})),
      },
    };
    const snackBar = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
    const service = new PublicProfileDataService(backend as any, snackBar);

    return {
      service,
      backend,
    };
  }

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
  });
});
