import { of } from 'rxjs';
import { LoginPageComponent } from './login-page.component';
import { SSOProvider } from '../sso-buttons/sso-buttons.component';

function makeDataServiceMock() {
  return {} as any;
}

function makeSeoMock() {
  return { updateSeo: jasmine.createSpy('updateSeo') } as any;
}

function makeLoginInteractionMock(loggedUser: any = null) {
  return {
    loggedUser$: of(loggedUser),
    loginWithSSO: jasmine.createSpy('loginWithSSO')
  } as any;
}

function makeRouterMock() {
  return { navigate: jasmine.createSpy('navigate') } as any;
}

function makeRouteMock(params: Record<string, string> = {}) {
  return { queryParams: of(params) } as any;
}

function makeSnackBarMock() {
  return { open: jasmine.createSpy('open') } as any;
}

function makeComp(
  overrides: {
    loggedUser?: any;
    routeParams?: Record<string, string>;
    loginInteraction?: any;
  } = {}
) {
  const seo = makeSeoMock();
  const loginInteraction = overrides.loginInteraction ?? makeLoginInteractionMock(overrides.loggedUser ?? null);
  const router = makeRouterMock();
  const route = makeRouteMock(overrides.routeParams ?? {});
  const snackBar = makeSnackBarMock();

  const comp = new LoginPageComponent(
    makeDataServiceMock(),
    seo,
    loginInteraction,
    router,
    route,
    snackBar
  );

  return { comp, seo, loginInteraction, router, route, snackBar };
}

describe('LoginPageComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp().comp).not.toThrow();
    });

    it('calls updateSeo with noindex:true on construction', () => {
      const { seo } = makeComp();
      expect(seo.updateSeo).toHaveBeenCalledOnceWith(
        jasmine.objectContaining({ noindex: true }),
        jasmine.any(String)
      );
    });
  });

  describe('ngOnInit — checkResetSuccessParam', () => {
    it('opens snackBar when resetSuccess=true query param is present', () => {
      const { comp, snackBar } = makeComp({ routeParams: { resetSuccess: 'true' } });
      comp.ngOnInit();
      expect(snackBar.open).toHaveBeenCalledWith(
        jasmine.stringContaining('Password updated'),
        undefined,
        jasmine.objectContaining({ panelClass: 'snack-success' })
      );
    });

    it('does NOT open snackBar when resetSuccess is absent', () => {
      const { comp, snackBar } = makeComp({ routeParams: {} });
      comp.ngOnInit();
      expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('does NOT open snackBar when resetSuccess=false', () => {
      const { comp, snackBar } = makeComp({ routeParams: { resetSuccess: 'false' } });
      comp.ngOnInit();
      expect(snackBar.open).not.toHaveBeenCalled();
    });
  });

  describe('ngOnInit — checkLoggedInUser', () => {
    it('navigates to /user/area when user is already logged in', () => {
      const { comp, router } = makeComp({ loggedUser: { id: 'u1' } });
      comp.ngOnInit();
      expect(router.navigate).toHaveBeenCalledWith(['/user/area']);
    });

    it('does NOT navigate when user is null (not logged in)', () => {
      const { comp, router } = makeComp({ loggedUser: null });
      comp.ngOnInit();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('calls SharedConstants.successLogin when user is logged in', () => {
      const { comp, snackBar } = makeComp({ loggedUser: { id: 'u1' } });
      comp.ngOnInit();
      // successLogin opens the snackBar
      expect(snackBar.open).toHaveBeenCalled();
    });
  });

  describe('handleSSOLogin', () => {
    it('delegates to loginInteraction.loginWithSSO', () => {
      const loginInteraction = makeLoginInteractionMock(null);
      const { comp } = makeComp({ loginInteraction });
      comp.handleSSOLogin('google' as SSOProvider);
      expect(loginInteraction.loginWithSSO).toHaveBeenCalledOnceWith('google');
    });

    it('passes the provider argument through', () => {
      const loginInteraction = makeLoginInteractionMock(null);
      const { comp } = makeComp({ loginInteraction });
      comp.handleSSOLogin('github' as SSOProvider);
      expect(loginInteraction.loginWithSSO).toHaveBeenCalledWith('github');
    });
  });
});
