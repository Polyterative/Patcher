import { BehaviorSubject, of, ReplaySubject } from 'rxjs';
import { PublicProfileComponent } from './public-profile.component';

describe('PublicProfileComponent', () => {
  function build() {
    const dataService = {
      loadProfile$: new ReplaySubject<string>(1),
      racksCount$: new BehaviorSubject<number>(0),
      patchesCount$: new BehaviorSubject<number>(0),
      contributorStats$: new BehaviorSubject<any>(undefined),
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

  it('maps approved public modules into contributor stats', (done) => {
    const { component, dataService } = build();

    dataService.contributorStats$.next({approvedPublicModules: 4});

    component.contributorStats$.subscribe((stats) => {
      expect(stats).toEqual([
        {name: 'Approved public modules', value: 4, icon: 'check_circle'},
      ]);
      done();
    });
  });
});
