import { PLATFORM_ID } from '@angular/core';
import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  of,
  Subject
} from 'rxjs';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import type { RecoveryEventSession } from 'src/app/features/backend/supabase-auth.helpers';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  clearRecoveryMarker,
  writeRecoveryMarker
} from './recovery-session-marker';
import {
  ResetPasswordPageComponent
} from './reset-password-page.component';
import { SeoAndUtilsService } from '../../seo-and-utils.service';
import { UserResetPasswordDataService } from './user-reset-password-data.service';

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

function mockDataService(authInitializationSettled$: Observable<void> = of(undefined)): UserResetPasswordDataService {
  return {
    errorMessage$: new BehaviorSubject(''),
    successMessage$: new BehaviorSubject(''),
    isSessionChecked$: new BehaviorSubject(false),
    isRecoverySession$: new BehaviorSubject(false),
    isSubmitting$: new BehaviorSubject(false),
    redirectCountdown$: new BehaviorSubject<number | null>(null),
    redirectProgress$: new BehaviorSubject(0),
    submitPasswordReset$: new Subject<void>(),
    authInitializationSettled$,
    setRecoverySession: jasmine.createSpy('setRecoverySession'),
    verifyRecoveryToken$: jasmine.createSpy('verifyRecoveryToken$').and.returnValue(of(false)),
    performRedirect: jasmine.createSpy('performRedirect'),
    fields: {
      password: {control: {invalid: false}},
      confirmPassword: {control: {invalid: false}}
    }
  } as unknown as UserResetPasswordDataService;
}

function makeComp(options: {
  platformId?: string;
  queryParams?: Record<string, string>;
  authInitializationSettled$?: Observable<void>;
} = {}): {
  comp: ResetPasswordPageComponent;
  router: Router;
  seo: SeoAndUtilsService;
  ds: UserResetPasswordDataService;
} {
  const router = mockRouter();
  const seo = mockSeo();
  const ds = mockDataService(options.authInitializationSettled$);
  const comp = new ResetPasswordPageComponent(
    router,
    mockRoute(options.queryParams),
    seo,
    ds,
    (options.platformId ?? 'browser') as unknown as object
  );
  return {comp, router, seo, ds};
}

function flushMicrotasks(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

type RecoveryAuthMock = jasmine.SpyObj<Pick<SupabaseService['auth'],
  'verifyRecoveryOtp$' | 'getCurrentSessionFingerprint$'
>> & {
  passwordRecoverySession$: Observable<RecoveryEventSession | null>;
  authInitializationSettled$: Observable<void>;
};

function buildRecoveryAuthMock(authInitializationSettled$: Observable<void> = of(undefined)): RecoveryAuthMock {
  const auth = jasmine.createSpyObj<Pick<SupabaseService['auth'],
    'verifyRecoveryOtp$' | 'getCurrentSessionFingerprint$'
  >>('auth', ['verifyRecoveryOtp$', 'getCurrentSessionFingerprint$']) as RecoveryAuthMock;
  auth.verifyRecoveryOtp$.and.returnValue(of(null));
  auth.getCurrentSessionFingerprint$.and.returnValue(of(null));
  auth.passwordRecoverySession$ = of(null);
  auth.authInitializationSettled$ = authInitializationSettled$;
  return auth;
}

function configureRealFixtureModule(auth: RecoveryAuthMock, queryParams: Record<string, string> = {}): void {
  TestBed.configureTestingModule({
    imports: [ResetPasswordPageComponent],
    providers: [
      provideNoopAnimations(),
      {provide: ActivatedRoute, useValue: mockRoute(queryParams)},
      {provide: Router, useValue: mockRouter()},
      {provide: SupabaseService, useValue: {auth}},
      {provide: AnalyticsService, useValue: jasmine.createSpyObj('AnalyticsService', ['capture', 'identify', 'reset'])},
      {provide: PLATFORM_ID, useValue: 'browser'}
    ]
  });
}

describe('ResetPasswordPageComponent', () => {
  afterEach(() => {
    clearRecoveryMarker();
  });

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

    it('delegates token verification to the data service in the browser', async () => {
      const { comp, ds } = makeComp({ queryParams: recoveryParams });
      comp.ngOnInit();
      await flushMicrotasks();
      expect(ds.verifyRecoveryToken$).toHaveBeenCalledWith('abc123');
    });

    it('does not verify when the token type is not recovery', async () => {
      const { comp, ds } = makeComp({
        queryParams: { token_hash: 'abc123', type: 'signup' }
      });
      comp.ngOnInit();
      await flushMicrotasks();
      expect(ds.verifyRecoveryToken$).not.toHaveBeenCalled();
    });

    it('never verifies the single-use token during server-side rendering', async () => {
      const { comp, ds } = makeComp({
        platformId: 'server',
        queryParams: recoveryParams
      });
      comp.ngOnInit();
      await flushMicrotasks();
      expect(ds.verifyRecoveryToken$).not.toHaveBeenCalled();
    });

    it('does not mark a recovery token invalid during server-side rendering', async () => {
      const settled$ = new Subject<void>();
      const { comp, ds } = makeComp({
        platformId: 'server',
        queryParams: recoveryParams,
        authInitializationSettled$: settled$.asObservable()
      });

      comp.ngOnInit();
      settled$.next();
      await flushMicrotasks();

      expect(ds.verifyRecoveryToken$).not.toHaveBeenCalled();
      expect(ds.setRecoverySession).not.toHaveBeenCalledWith(false);
    });

    it('still updates SEO during server-side rendering', () => {
      const { comp, seo } = makeComp({ platformId: 'server' });
      comp.ngOnInit();
      expect(seo.updateSeo).toHaveBeenCalled();
    });
  });

  describe('URL scrub after successful verification (ST-13)', () => {
    const recoveryParams = { token_hash: 'abc123', type: 'recovery' };

    it('scrubs token_hash and type from the visible URL after successful verification, without navigating', async () => {
      const { comp, ds, router } = makeComp({ queryParams: recoveryParams });
      (ds.verifyRecoveryToken$ as jasmine.Spy).and.returnValue(of(true));
      spyOn(history, 'replaceState');

      comp.ngOnInit();
      await flushMicrotasks();

      expect(history.replaceState).toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      const args = (history.replaceState as jasmine.Spy).calls.mostRecent().args;
      const scrubbedUrl = args[2] as string;
      expect(scrubbedUrl).not.toContain('token_hash');
      expect(scrubbedUrl).not.toContain('type=recovery');
    });

    it('does not scrub the URL when verification fails', async () => {
      const { comp, ds } = makeComp({ queryParams: recoveryParams });
      (ds.verifyRecoveryToken$ as jasmine.Spy).and.returnValue(of(false));
      spyOn(history, 'replaceState');

      comp.ngOnInit();
      await flushMicrotasks();

      expect(history.replaceState).not.toHaveBeenCalled();
    });

    it('preserves unrelated query params when removing recovery credentials after success', async () => {
      const { comp, ds } = makeComp({
        queryParams: {
          token_hash: 'abc123',
          type: 'recovery',
          next: '/modules/browser',
          campaign: 'reset-help'
        }
      });
      (ds.verifyRecoveryToken$ as jasmine.Spy).and.returnValue(of(true));
      spyOn(history, 'replaceState');

      comp.ngOnInit();
      await flushMicrotasks();

      const scrubbedUrl = (history.replaceState as jasmine.Spy).calls.mostRecent().args[2] as string;
      expect(scrubbedUrl).toContain('next=%2Fmodules%2Fbrowser');
      expect(scrubbedUrl).toContain('campaign=reset-help');
      expect(scrubbedUrl).not.toContain('token_hash');
      expect(scrubbedUrl).not.toContain('type=recovery');
    });

    it('does not scrub until the asynchronous verification result actually arrives (R11 — reproduces the scrub race)', fakeAsync(() => {
      const { comp, ds } = makeComp({ queryParams: recoveryParams });
      const result$ = new Subject<boolean>();
      (ds.verifyRecoveryToken$ as jasmine.Spy).and.returnValue(result$.asObservable());
      spyOn(history, 'replaceState');

      comp.ngOnInit();
      tick();

      // Verification is still in flight — must not have scrubbed yet.
      expect(history.replaceState).not.toHaveBeenCalled();

      result$.next(true);
      tick();

      expect(history.replaceState).toHaveBeenCalled();
    }));

    it('never scrubs a fresh token whose own verification later fails, even while a concurrent unrelated marker-restore has already flipped the aggregate isRecoverySession$/isSessionChecked$ state to true (R9)', fakeAsync(() => {
      const { comp, ds } = makeComp({ queryParams: recoveryParams });
      // Simulate an unrelated, already-settled marker-restore (this must
      // never be read by the scrub decision at all).
      (ds.isSessionChecked$ as BehaviorSubject<boolean>).next(true);
      (ds.isRecoverySession$ as BehaviorSubject<boolean>).next(true);

      const result$ = new Subject<boolean>();
      (ds.verifyRecoveryToken$ as jasmine.Spy).and.returnValue(result$.asObservable());
      spyOn(history, 'replaceState');

      comp.ngOnInit();
      tick();

      result$.next(false);
      tick();

      expect(history.replaceState).not.toHaveBeenCalled();
    }));
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

  describe('component state', () => {
    it('SharedConstants reference equals the module export', () => {
      const { comp } = makeComp();
      expect(comp['SharedConstants']).toBe(SharedConstants);
    });

    it('ngOnInit completes without throwing with no query params', () => {
      const { comp } = makeComp();
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });

  describe('accessibility (S2, ATP-A11-02)', () => {
    it('gives the invalid-recovery-link block role="alert"', () => {
      const auth = buildRecoveryAuthMock();
      configureRealFixtureModule(auth);

      const fixture = TestBed.createComponent(ResetPasswordPageComponent);
      fixture.componentInstance.dataService.setRecoverySession(false);
      fixture.detectChanges();

      const block: HTMLElement = fixture.nativeElement.querySelector('.error-message');
      expect(block.getAttribute('role')).toBe('alert');
    });
  });

  describe('recovery integrity across destroy/recreate (S2, ATP-S2-18)', () => {
    it('does not call verifyRecoveryOtp$ a second time when the component is destroyed and recreated after a successful verification, with a valid marker present', () => {
      const auth = buildRecoveryAuthMock();
      auth.verifyRecoveryOtp$.and.returnValue(of({userId: 'u1', sessionId: 's1', emittedAt: Date.now()}));
      auth.getCurrentSessionFingerprint$.and.returnValue(of({userId: 'u1', sessionId: 's1'}));

      configureRealFixtureModule(auth, {token_hash: 'abc123', type: 'recovery'});
      const fixture1 = TestBed.createComponent(ResetPasswordPageComponent);
      fixture1.detectChanges();
      expect(fixture1.componentInstance.dataService.isRecoverySession$.value).toBeTrue();
      fixture1.destroy();

      // Simulate router back/forward: the URL has already been scrubbed, so the
      // second instance sees no query params — only the marker can restore it.
      TestBed.resetTestingModule();
      configureRealFixtureModule(auth, {});
      const fixture2 = TestBed.createComponent(ResetPasswordPageComponent);
      fixture2.detectChanges();

      expect(auth.verifyRecoveryOtp$).toHaveBeenCalledTimes(1);
      expect(fixture2.componentInstance.dataService.isRecoverySession$.value).toBeTrue();
      const passwordHint = fixture2.nativeElement.querySelector('.password-hint');
      expect(passwordHint).toBeTruthy();
      const invalidBlock = fixture2.nativeElement.querySelector('.error-message');
      expect(invalidBlock).toBeFalsy();
    });
  });

  describe('URL text alone is never sufficient (component-level, ATP-S2-10/11 strengthened, R10)', () => {
    it('never renders the password form from a bare "type=recovery" query param with no live session and no marker, and settles to Invalid', fakeAsync(() => {
      const auth = buildRecoveryAuthMock();
      // No token_hash, no live session — URL text alone.
      configureRealFixtureModule(auth, {type: 'recovery'});
      const fixture = TestBed.createComponent(ResetPasswordPageComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.password-hint')).toBeFalsy();

      tick();
      fixture.detectChanges();

      expect(fixture.componentInstance.dataService.isRecoverySession$.value).toBeFalse();
      expect(fixture.nativeElement.querySelector('.password-hint')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.error-message')).toBeTruthy();
    }));

    it('never renders the password form from a bare "type=recovery" query param when an unrelated live session exists but no marker matches it', fakeAsync(() => {
      const auth = buildRecoveryAuthMock();
      auth.getCurrentSessionFingerprint$.and.returnValue(of({userId: 'existing-user', sessionId: 'existing-session'}));
      configureRealFixtureModule(auth, {type: 'recovery'});
      const fixture = TestBed.createComponent(ResetPasswordPageComponent);
      fixture.detectChanges();
      tick();
      fixture.detectChanges();

      expect(fixture.componentInstance.dataService.isRecoverySession$.value).toBeFalse();
      expect(fixture.nativeElement.querySelector('.password-hint')).toBeFalsy();
      expect(fixture.nativeElement.querySelector('.error-message')).toBeTruthy();
    }));
  });

  describe('Invalid fallback never races live restoration or token verification (R6/R7)', () => {
    it('does not conclude Invalid while live-session marker restoration is still pending, however long it takes', fakeAsync(() => {
      const authSettled$ = new Subject<void>();
      const auth = buildRecoveryAuthMock(authSettled$.asObservable());
      const fingerprint$ = new Subject<{userId: string; sessionId: string} | null>();
      auth.getCurrentSessionFingerprint$.and.returnValue(fingerprint$.asObservable());
      configureRealFixtureModule(auth, {});
      const fixture = TestBed.createComponent(ResetPasswordPageComponent);
      fixture.detectChanges();

      tick(10000);
      expect(fixture.componentInstance.dataService.isSessionChecked$.value).toBeFalse();

      // Marker restoration and auth-initialization settlement share the same
      // underlying SDK signal in production (both derive from
      // `getSettledAuthSession$`) — restoration always resolves first, and
      // only then does the settlement signal fire.
      fingerprint$.next(null);
      tick();
      authSettled$.next();
      tick();
      fixture.detectChanges();

      // No valid marker existed, so this correctly settles Invalid — but only
      // after auth initialization genuinely settled, never racing the
      // pending restoration.
      expect(fixture.componentInstance.dataService.isSessionChecked$.value).toBeTrue();
      expect(fixture.componentInstance.dataService.isRecoverySession$.value).toBeFalse();
    }));

    it('never arms the Invalid fallback while a token verification is genuinely pending, however long it takes', fakeAsync(() => {
      const { comp, ds } = makeComp({ queryParams: { token_hash: 'abc123', type: 'recovery' } });
      const result$ = new Subject<boolean>();
      (ds.verifyRecoveryToken$ as jasmine.Spy).and.returnValue(result$.asObservable());

      comp.ngOnInit();
      tick(50000);

      // No competing fallback ever forced Invalid while verification was
      // still in flight.
      expect(ds.setRecoverySession).not.toHaveBeenCalled();

      result$.next(true);
      tick();

      expect(ds.setRecoverySession).not.toHaveBeenCalledWith(false);
    }));
    it('lets a valid marker restore succeed even when auth-initialization settlement fires only after it resolves, with no prior forced-Invalid call', fakeAsync(() => {
      writeRecoveryMarker('user-1', 'sess-1', Date.now());
      const authSettled$ = new Subject<void>();
      const auth = buildRecoveryAuthMock(authSettled$.asObservable());
      const fingerprint$ = new Subject<{userId: string; sessionId: string} | null>();
      auth.getCurrentSessionFingerprint$.and.returnValue(fingerprint$.asObservable());
      configureRealFixtureModule(auth, {});
      const fixture = TestBed.createComponent(ResetPasswordPageComponent);
      const setRecoverySessionSpy = spyOn(fixture.componentInstance.dataService, 'setRecoverySession').and.callThrough();
      fixture.detectChanges();

      tick(1800);
      // Restoration settles late with a genuinely matching marker.
      fingerprint$.next({userId: 'user-1', sessionId: 'sess-1'});
      tick();

      expect(setRecoverySessionSpy).not.toHaveBeenCalledWith(false);
      expect(fixture.componentInstance.dataService.isRecoverySession$.value).toBeTrue();

      // Auth-initialization settlement fires afterward — must never
      // retroactively force Invalid over an already-restored recovery
      // session.
      authSettled$.next();
      tick();
      expect(setRecoverySessionSpy).not.toHaveBeenCalledWith(false);
    }));
  });

  describe('Implicit/hash recovery lifecycle-aware settlement (S2 delta — no Invalid flash before auth initialization settles)', () => {
    it('never concludes Invalid while auth initialization has not settled, even when the SDK recovery event legitimately arrives well past the old fixed 2-second fallback window', fakeAsync(() => {
      const settled$ = new Subject<void>();
      const { comp, ds } = makeComp({ queryParams: {}, authInitializationSettled$: settled$.asObservable() });

      comp.ngOnInit();

      // Far past the old fixed SESSION_CHECK_FALLBACK_MS (2000ms) window —
      // the SDK is still validating a slow implicit/hash recovery over the
      // network. The fallback must never have fired yet.
      tick(10000);
      expect(ds.setRecoverySession).not.toHaveBeenCalled();

      // The SDK's own recovery event finally lands — the data service's own
      // listener settles the aggregate state before auth initialization
      // itself settles.
      (ds.isSessionChecked$ as BehaviorSubject<boolean>).next(true);
      (ds.isRecoverySession$ as BehaviorSubject<boolean>).next(true);

      settled$.next();
      tick();

      // No Invalid->Valid flash: the fallback never fired at all.
      expect(ds.setRecoverySession).not.toHaveBeenCalledWith(false);
      expect(ds.isRecoverySession$.value).toBeTrue();
    }));

    it('still fails closed to Invalid for a genuinely bare/malformed link once auth initialization settles with nothing verified, however long settlement itself takes', fakeAsync(() => {
      const settled$ = new Subject<void>();
      const { comp, ds } = makeComp({ queryParams: {}, authInitializationSettled$: settled$.asObservable() });

      comp.ngOnInit();
      tick(10000);
      expect(ds.setRecoverySession).not.toHaveBeenCalled();

      settled$.next();
      tick();

      expect(ds.setRecoverySession).toHaveBeenCalledWith(false);
    }));
  });
});
