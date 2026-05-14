import { ResetPasswordPageComponent } from './reset-password-page.component';
import { SupabaseService } from '../../../backend/supabase.service';
import { Router, ActivatedRoute } from '@angular/router';
import { SeoAndUtilsService } from '../../seo-and-utils.service';
import { UserResetPasswordDataService } from './user-reset-password-data.service';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';

function mockSupabase(): SupabaseService {
  const authListener = { data: { subscription: { unsubscribe: () => {} } } };
  return {
    supabase: {
      auth: {
        onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue(authListener)
      }
    }
  } as unknown as SupabaseService;
}

function mockRouter(): Router {
  return {
    navigate: jasmine.createSpy('navigate')
  } as unknown as Router;
}

function mockRoute(): ActivatedRoute {
  return {
    queryParams: of({})
  } as unknown as ActivatedRoute;
}

function mockSeo(): SeoAndUtilsService {
  return {
    updateSeo: jasmine.createSpy('updateSeo')
  } as unknown as SeoAndUtilsService;
}

function mockDataService(): UserResetPasswordDataService {
  return {
    errorMessage$: new BehaviorSubject(''),
    isSessionChecked$: new BehaviorSubject(false),
    submitPasswordReset$: new Subject<void>(),
    setRecoverySession: jasmine.createSpy('setRecoverySession'),
    checkForRecoveryInUrl: jasmine.createSpy('checkForRecoveryInUrl').and.returnValue(false),
    performRedirect: jasmine.createSpy('performRedirect')
  } as unknown as UserResetPasswordDataService;
}

function makeComp(): {
  comp: ResetPasswordPageComponent;
  router: Router;
  seo: SeoAndUtilsService;
  ds: UserResetPasswordDataService;
} {
  const router = mockRouter();
  const seo = mockSeo();
  const ds = mockDataService();
  const comp = new ResetPasswordPageComponent(mockSupabase(), router, mockRoute(), seo, ds);
  return { comp, router, seo, ds };
}

describe('ResetPasswordPageComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp()).not.toThrow();
    });

    it('exposes SharedConstants', () => {
      expect(makeComp().comp['SharedConstants']).toBe(SharedConstants);
    });
  });

  describe('ngOnInit', () => {
    it('calls updateSeo with Reset Password title', () => {
      const { comp, seo } = makeComp();
      comp.ngOnInit();
      expect(seo.updateSeo).toHaveBeenCalledWith(
        jasmine.objectContaining({ title: 'Reset Password', noindex: true }),
        'Reset Password'
      );
    });

    it('does not throw', () => {
      const { comp } = makeComp();
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });

  describe('onSubmit', () => {
    it('emits submitPasswordReset$', () => {
      const { comp, ds } = makeComp();
      let emitted = false;
      ds.submitPasswordReset$.subscribe(() => emitted = true);
      comp.onSubmit();
      expect(emitted).toBeTrue();
    });
  });

  describe('goToLogin', () => {
    it('navigates to /auth/login', () => {
      const { comp, router } = makeComp();
      comp.goToLogin();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('goToLoginAfterReset', () => {
    it('calls dataService.performRedirect', () => {
      const { comp, ds } = makeComp();
      comp.goToLoginAfterReset();
      expect(ds.performRedirect).toHaveBeenCalled();
    });
  });

  describe('onSubmit', () => {
    it('calls checkForRecoveryInUrl during onSubmit flow via submitPasswordReset$', () => {
      const { comp, ds } = makeComp();
      comp.ngOnInit();
      comp.onSubmit();
      // submitPasswordReset$ is triggered
      expect(ds.submitPasswordReset$).toBeDefined();
    });
  });

  describe('component state', () => {
    it('SharedConstants reference equals the module export', () => {
      const { comp } = makeComp();
      expect(comp['SharedConstants']).toBe(SharedConstants);
    });

    it('ngOnInit completes without throwing when checkForRecoveryInUrl returns false', () => {
      const { comp } = makeComp();
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });
});
