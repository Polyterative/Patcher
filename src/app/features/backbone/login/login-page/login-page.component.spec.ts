import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import {
  BehaviorSubject,
  of,
  Subject
} from 'rxjs';
import { LoginPageComponent } from './login-page.component';
import { SSOProvider } from '../sso-buttons/sso-buttons.component';
import {
  ActivatedRoute,
  convertToParamMap,
  Router
} from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SeoAndUtilsService } from '../../seo-and-utils.service';
import { UserManagementService } from '../user-management.service';
import { UserLoginDataService } from './user-login-data.service';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
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
  return jasmine.createSpyObj<Router>('Router', ['navigate', 'navigateByUrl']);
}

function makeRouteMock(params: Record<string, string> = {}): ActivatedRoute {
  return {
    queryParams: of(params),
    snapshot: { queryParamMap: convertToParamMap(params) }
  } as ActivatedRoute;
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
    const loggedUser: SimpleUserModel = {
      id: 'u1',
      email: 'u1@example.com',
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z'
    };

    it('navigates to /user/area when user is already logged in and no returnUrl is present', () => {
      const { comp, router } = makeComp({ loggedUser });
      comp.ngOnInit();
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/user/area');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('navigates to the sanitized returnUrl when it is present and safe', () => {
      const { comp, router } = makeComp({
        loggedUser,
        routeParams: { returnUrl: '/modules/browser?query=1#rack' }
      });
      comp.ngOnInit();
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/modules/browser?query=1#rack');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('falls back to /user/area when returnUrl is an external open-redirect attempt', () => {
      const { comp, router } = makeComp({
        loggedUser,
        routeParams: { returnUrl: 'https://evil.example/path' }
      });
      comp.ngOnInit();
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/user/area');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('falls back to /user/area when returnUrl is malformed', () => {
      const { comp, router } = makeComp({
        loggedUser,
        routeParams: { returnUrl: '/\\evil' }
      });
      comp.ngOnInit();
      expect(router.navigateByUrl).toHaveBeenCalledOnceWith('/user/area');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('does NOT navigate when user is null (not logged in)', () => {
      const { comp, router } = makeComp({ loggedUser: null });
      comp.ngOnInit();
      expect(router.navigate).not.toHaveBeenCalled();
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('calls SharedConstants.successLogin when user is logged in', () => {
      const { comp, snackBar } = makeComp({ loggedUser });
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

  describe('reset-request error accessibility (fixture-rendered)', () => {
    function makeFakeDataService(): UserLoginDataService {
      return {
        showPasswordReset$: new BehaviorSubject<boolean>(true),
        resetSuccessMessage$: new BehaviorSubject<string>(''),
        resetErrorMessage$: new BehaviorSubject<string>(''),
        isSubmittingReset$: new BehaviorSubject<boolean>(false),
        requestPasswordReset$: new Subject<void>(),
        togglePasswordReset$: new Subject<boolean>(),
        mailLoginClick$: new Subject<void>(),
        fields: {
          user: {
            label: 'Email',
            code: 'email',
            flex: '6rem',
            control: new UntypedFormControl(''),
            type: FormTypes.EMAIL,
            iconL1: 'email',
            ergonomics: { autofocus: true, enterkeyhint: 'next' }
          },
          password: {
            label: 'Password',
            code: 'pass',
            flex: '6rem',
            control: new UntypedFormControl(''),
            type: FormTypes.PASSWORD_CURRENT,
            iconL1: 'lock',
            ergonomics: { enterkeyhint: 'send' }
          }
        }
      } as unknown as UserLoginDataService;
    }

    it('gives the reset-request error block role="alert" and moves focus to its message when resetErrorMessage$ emits', fakeAsync(() => {
      const fakeDataService = makeFakeDataService();
      TestBed.configureTestingModule({
        declarations: [LoginPageComponent],
        providers: [
          { provide: UserLoginDataService, useValue: fakeDataService },
          { provide: SeoAndUtilsService, useValue: makeSeoMock() },
          { provide: UserManagementService, useValue: makeLoginInteractionMock(null) },
          { provide: Router, useValue: makeRouterMock() },
          { provide: ActivatedRoute, useValue: makeRouteMock() },
          { provide: MatSnackBar, useValue: makeSnackBarMock() }
        ],
        schemas: [NO_ERRORS_SCHEMA]
      });

      const fixture = TestBed.createComponent(LoginPageComponent);
      fixture.detectChanges();
      fakeDataService.resetErrorMessage$.next('You\'ve requested too many resets...');
      fixture.detectChanges();
      tick();

      const block: HTMLElement = fixture.nativeElement.querySelector('.error-notification');
      expect(block.getAttribute('role')).toBe('alert');
      expect(document.activeElement).toBe(block.querySelector('p'));
    }));
  });
});
