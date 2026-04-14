import { BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { PublicProfileComponent } from './public-profile.component';

describe('PublicProfileComponent', () => {
  function build() {
    const dataService = {
      loadProfile$: new ReplaySubject<string>(1),
      racksCount$: new BehaviorSubject<number>(0),
      patchesCount$: new BehaviorSubject<number>(0),
      profile$: new BehaviorSubject<any>(null),
      routeState$: new BehaviorSubject<any>('loading'),
    };
    const userService = {
      loggedUserFullProfile$: new BehaviorSubject<any>(null),
      updateProfileVisibility$: jasmine.createSpy().and.returnValue(of(void 0)),
    };
    const seoAndUtilsService = {
      updateSeo: jasmine.createSpy(),
    };
    const urlCreatorService = {
      copyLinkToClipboard: jasmine.createSpy(),
    };
    const route = {
      params: of({username: 'viewer'}),
    };

    const component = new PublicProfileComponent(
      dataService as any,
      userService as any,
      route as any,
      seoAndUtilsService as any,
      urlCreatorService as any,
    );

    return {
      component,
      dataService,
      userService,
      seoAndUtilsService,
      urlCreatorService,
    };
  }

  it('reloads the profile after making it public', () => {
    const { component, dataService, userService } = build();
    const loadProfileSpy = spyOn(dataService.loadProfile$, 'next').and.callThrough();

    component.makeProfilePublic('viewer');

    expect(userService.updateProfileVisibility$).toHaveBeenCalledWith(true);
    expect(loadProfileSpy).toHaveBeenCalledWith('viewer');
  });
});
