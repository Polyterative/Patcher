import { of } from 'rxjs';
import { LoginPageComponent } from './login-page.component';
import { SSOProvider } from '../sso-buttons/sso-buttons.component';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SeoAndUtilsService } from '../../seo-and-utils.service';
import { UserManagementService } from '../user-management.service';
import { UserLoginDataService } from './user-login-data.service';
import { SimpleUserModel } from '../../../backend/supabase.service';

function makeDataServiceMock(): UserLoginDataService {
  return {} as UserLoginDataService;
}

function makeSeoMock(): jasmine.SpyObj<SeoAndUtilsService> {
  return jasmine.createSpyObj<SeoAndUtilsService>('SeoAndUtilsService', ['updateSeo']);
}

function makeLoginInteractionMock(
  loggedUser: SimpleUserModel | null = null
): jasmine.SpyObj<UserManagementService> {
  return jasmine.createSpyObj<UserManagementService>('UserManagementService', ['loginWithSSO'], {
    loggedUser$: of(loggedUser ?? undefined)
  });
}

function makeRouterMock(): jasmine.SpyObj<Router> {
  return jasmine.createSpyObj<Router>('Router', ['navigate']);
}

function makeRouteMock(params: Record<string, string> = {}): ActivatedRoute {
  return { queryParams: of(params) } as ActivatedRoute;
}

function makeSnackBarMock(): jasmine.SpyObj<MatSnackBar> {
  return jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
}

function makeComp(
  overrides: {
    loggedUser?: SimpleUserModel | null;
    routeParams?: Record<string, string>;
    loginInteraction?: jasmine.SpyObj<UserManagementService>;
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
      const { comp, router } = makeComp({
        loggedUser: {
          id: 'u1',
          email: 'u1@example.com',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      });
      comp.ngOnInit();
      expect(router.navigate).toHaveBeenCalledWith(['/user/area']);
    });

    it('does NOT navigate when user is null (not logged in)', () => {
      const { comp, router } = makeComp({ loggedUser: null });
      comp.ngOnInit();
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('calls SharedConstants.successLogin when user is logged in', () => {
      const { comp, snackBar } = makeComp({
        loggedUser: {
          id: 'u1',
          email: 'u1@example.com',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      });
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
