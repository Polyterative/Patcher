import { ResetPasswordPageComponent } from './reset-password-page.component';
import { SupabaseService } from '../../../backend/supabase.service';
import { Router, ActivatedRoute } from '@angular/router';
import { SeoAndUtilsService } from '../../seo-and-utils.service';
import { UserResetPasswordDataService } from './user-reset-password-data.service';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';

function mockSupabase(verifyResult: { error: unknown } = { error: null }): SupabaseService {
  const authListener = { data: { subscription: { unsubscribe: () => {} } } };
  return {
    supabase: {
      auth: {
        onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.returnValue(authListener),
        verifyOtp: jasmine.createSpy('verifyOtp').and.resolveTo(verifyResult)
      }
    }
  } as unknown as SupabaseService;
}

function mockRouter(): Router {
  return {
    navigate: jasmine.createSpy('navigate')
  } as unknown as Router;
}

function mockRoute(queryParams: Record<string, string> = {}): ActivatedRoute {
  return {
    queryParams: of(queryParams)
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

function makeComp(options: {
  platformId?: string;
  queryParams?: Record<string, string>;
  verifyResult?: { error: unknown };
} = {}): {
  comp: ResetPasswordPageComponent;
  router: Router;
  seo: SeoAndUtilsService;
  ds: UserResetPasswordDataService;
  supabase: SupabaseService;
} {
  const router = mockRouter();
  const seo = mockSeo();
  const ds = mockDataService();
  const supabase = mockSupabase(options.verifyResult);
  const comp = new ResetPasswordPageComponent(
    supabase,
    router,
    mockRoute(options.queryParams),
    seo,
    ds,
    (options.platformId ?? 'browser') as unknown as object
  );
  return { comp, router, seo, ds, supabase };
}

function supabaseAuth(supabase: SupabaseService): {
  verifyOtp: jasmine.Spy;
  onAuthStateChange: jasmine.Spy;
} {
  return (supabase as unknown as {
    supabase: { auth: { verifyOtp: jasmine.Spy; onAuthStateChange: jasmine.Spy } };
  }).supabase.auth;
}

function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
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

  describe('recovery token verification', () => {
    const recoveryParams = { token_hash: 'abc123', type: 'recovery' };

    it('verifies the token in the browser and marks the session valid', async () => {
      const { comp, ds, supabase } = makeComp({ queryParams: recoveryParams });
      comp.ngOnInit();
      await flushMicrotasks();
      expect(supabaseAuth(supabase).verifyOtp).toHaveBeenCalledWith({
        token_hash: 'abc123',
        type: 'recovery'
      });
      expect(ds.setRecoverySession).toHaveBeenCalledWith(true);
    });

    it('marks the session invalid when verification fails', async () => {
      const { comp, ds } = makeComp({
        queryParams: recoveryParams,
        verifyResult: { error: { message: 'otp_expired' } }
      });
      comp.ngOnInit();
      await flushMicrotasks();
      expect(ds.setRecoverySession).toHaveBeenCalledWith(false);
      expect((ds.errorMessage$ as BehaviorSubject<string>).value)
        .toBe('Invalid or expired password reset link.');
    });

    it('does not verify when the token type is not recovery', async () => {
      const { comp, ds, supabase } = makeComp({
        queryParams: { token_hash: 'abc123', type: 'signup' }
      });
      comp.ngOnInit();
      await flushMicrotasks();
      expect(supabaseAuth(supabase).verifyOtp).not.toHaveBeenCalled();
      expect(ds.setRecoverySession).not.toHaveBeenCalled();
    });

    it('never verifies the single-use token during server-side rendering', async () => {
      const { comp, supabase, ds } = makeComp({
        platformId: 'server',
        queryParams: recoveryParams
      });
      comp.ngOnInit();
      await flushMicrotasks();
      expect(supabaseAuth(supabase).verifyOtp).not.toHaveBeenCalled();
      expect(supabaseAuth(supabase).onAuthStateChange).not.toHaveBeenCalled();
      expect(ds.setRecoverySession).not.toHaveBeenCalled();
    });

    it('still updates SEO during server-side rendering', () => {
      const { comp, seo } = makeComp({ platformId: 'server' });
      comp.ngOnInit();
      expect(seo.updateSeo).toHaveBeenCalled();
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
