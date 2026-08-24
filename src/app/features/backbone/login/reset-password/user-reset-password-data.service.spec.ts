import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import type { RecoveryEventSession } from 'src/app/features/backend/supabase-auth.helpers';
import {
  BehaviorSubject,
  Observable,
  of,
  Subject,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  clearRecoveryMarker,
  readValidRecoveryMarker,
  writeRecoveryMarker
} from './recovery-session-marker';
import { UserResetPasswordDataService } from './user-reset-password-data.service';


describe('UserResetPasswordDataService', () => {
  type ResetPasswordAuthMock = jasmine.SpyObj<Pick<SupabaseService['auth'],
    'resetPassword$' | 'verifyRecoveryOtp$' | 'getCurrentSessionFingerprint$'
  >> & {
    passwordRecoverySession$: Observable<RecoveryEventSession | null>;
    authInitializationSettled$: Observable<void>;
  };
  type ResetPasswordSupabaseServiceMock = {
    readonly auth: ResetPasswordAuthMock;
  };
  type ResetPasswordAnalyticsMock = jasmine.SpyObj<Pick<AnalyticsService, 'capture' | 'identify' | 'reset'>>;

  function build(options: {
    platform?: 'browser' | 'server';
    passwordRecoverySession$?: Observable<RecoveryEventSession | null>;
    fingerprint$?: Observable<{userId: string; sessionId: string} | null>;
    authInitializationSettled$?: Observable<void>;
  } = {}): {
    service: UserResetPasswordDataService;
    supabaseService: ResetPasswordSupabaseServiceMock;
    router: jasmine.SpyObj<Router>;
    analytics: ResetPasswordAnalyticsMock;
  } {
    const auth = jasmine.createSpyObj<Pick<SupabaseService['auth'],
      'resetPassword$' | 'verifyRecoveryOtp$' | 'getCurrentSessionFingerprint$'
    >>('auth', ['resetPassword$', 'verifyRecoveryOtp$', 'getCurrentSessionFingerprint$']) as ResetPasswordAuthMock;
    auth.resetPassword$.and.returnValue(of(undefined));
    auth.verifyRecoveryOtp$.and.returnValue(of(null));
    auth.getCurrentSessionFingerprint$.and.returnValue(options.fingerprint$ ?? of(null));
    auth.passwordRecoverySession$ = options.passwordRecoverySession$ ?? of(null);
    auth.authInitializationSettled$ = options.authInitializationSettled$ ?? of(undefined);

    const supabaseService: ResetPasswordSupabaseServiceMock = {auth};
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    const analytics = jasmine.createSpyObj<Pick<AnalyticsService, 'capture' | 'identify' | 'reset'>>(
      'AnalyticsService',
      ['capture', 'identify', 'reset']
    );

    TestBed.configureTestingModule({
      providers: [
        UserResetPasswordDataService,
        {provide: Router, useValue: router},
        {provide: SupabaseService, useValue: supabaseService},
        {provide: AnalyticsService, useValue: analytics},
        {provide: PLATFORM_ID, useValue: options.platform ?? 'browser'}
      ]
    });

    const service = TestBed.inject(UserResetPasswordDataService);
    return {service, supabaseService, router, analytics};
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    sessionStorage.clear();
  });

  it('exposes SupabaseService.auth.authInitializationSettled$ verbatim as its own authInitializationSettled$ (S2 delta, R12)', () => {
    const settled$ = new Subject<void>();
    const {service} = build({authInitializationSettled$: settled$.asObservable()});

    let emitted = false;
    service.authInitializationSettled$.subscribe(() => emitted = true);
    expect(emitted).toBeFalse();

    settled$.next();
    expect(emitted).toBeTrue();
  });

  it('setRecoverySession sets isRecoverySession$ and marks session as checked', () => {
    const {service} = build();

    service.setRecoverySession(true);

    expect(service.isRecoverySession$.value).toBeTrue();
    expect(service.isSessionChecked$.value).toBeTrue();
  });

  it('setRecoverySession(false) marks session as non-recovery', () => {
    const {service} = build();

    service.setRecoverySession(false);

    expect(service.isRecoverySession$.value).toBeFalse();
    expect(service.isSessionChecked$.value).toBeTrue();
  });

  it('sets error and does not call API when fields are invalid', () => {
    const {service, supabaseService} = build();
    // leave fields at empty/invalid defaults

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).not.toHaveBeenCalled();
    expect(service.errorMessage$.value).toContain('required');
    expect(service.isSubmitting$.value).toBeFalse();
  });

  it('sets password mismatch error when passwords differ', () => {
    const {service, supabaseService} = build();
    service.fields.password.control.setValue('password123');
    service.fields.confirmPassword.control.setValue('different99');

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).not.toHaveBeenCalled();
    expect(service.errorMessage$.value).toBe(SharedConstants.messages.resetPassword.passwordMismatch);
  });

  it('sets too-short error when password has fewer than 8 characters (service-level guard)', () => {
    const {service, supabaseService} = build();
    // clear Angular validators to reach the service-level length guard
    service.fields.password.control.clearValidators();
    service.fields.password.control.updateValueAndValidity();
    service.fields.confirmPassword.control.clearValidators();
    service.fields.confirmPassword.control.updateValueAndValidity();

    service.fields.password.control.setValue('abc1234');
    service.fields.confirmPassword.control.setValue('abc1234');

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).not.toHaveBeenCalled();
    expect(service.errorMessage$.value).toBe(SharedConstants.messages.resetPassword.passwordTooShort);
  });

  it('sets too-long error when password exceeds 30 characters (service-level guard)', () => {
    const {service, supabaseService} = build();
    service.fields.password.control.clearValidators();
    service.fields.password.control.updateValueAndValidity();
    service.fields.confirmPassword.control.clearValidators();
    service.fields.confirmPassword.control.updateValueAndValidity();

    const longPassword = 'a'.repeat(31);
    service.fields.password.control.setValue(longPassword);
    service.fields.confirmPassword.control.setValue(longPassword);

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).not.toHaveBeenCalled();
    expect(service.errorMessage$.value).toBe(SharedConstants.messages.resetPassword.passwordTooLong);
  });

  it('calls API and sets success message with countdown on valid matching passwords', fakeAsync(() => {
    const {service, supabaseService} = build();
    service.fields.password.control.setValue('ValidPass1!');
    service.fields.confirmPassword.control.setValue('ValidPass1!');

    service.submitPasswordReset$.next();

    expect(supabaseService.auth.resetPassword$).toHaveBeenCalled();
    expect(service.successMessage$.value).toBe(SharedConstants.messages.resetPassword.successTitle);
    expect(service.redirectCountdown$.value).toBe(10);
    expect(service.isSubmitting$.value).toBeFalse();

    // clear interval to avoid async leak
    service.ngOnDestroy();
  }));

  it('sets error message when API call fails', () => {
    const {service, supabaseService} = build();
    supabaseService.auth.resetPassword$.and.returnValue(
      throwError(() => ({message: 'Token expired'}))
    );
    service.fields.password.control.setValue('ValidPass1!');
    service.fields.confirmPassword.control.setValue('ValidPass1!');

    service.submitPasswordReset$.next();

    expect(service.errorMessage$.value).toBe(SharedConstants.messages.resetPassword.resetFailed);
    expect(service.isSubmitting$.value).toBeFalse();
  });

  it('performRedirect navigates to login with resetSuccess param', () => {
    const {service, router} = build();

    service.performRedirect();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/auth/login'],
      jasmine.objectContaining({queryParams: {resetSuccess: true}})
    );
  });

  it('countdown decrements redirectCountdown$ each second', fakeAsync(() => {
    const {service} = build();
    service.startRedirectCountdown(3);

    tick(1000);
    expect(service.redirectCountdown$.value).toBe(2);

    tick(1000);
    expect(service.redirectCountdown$.value).toBe(1);

    service.ngOnDestroy();
  }));

  it('startRedirectCountdown initializes progress to 100 and decrements proportionally', fakeAsync(() => {
    const {service} = build();
    service.startRedirectCountdown(4);

    expect(service.redirectProgress$.value).toBe(100);

    tick(1000);
    expect(service.redirectProgress$.value).toBeCloseTo(75, 0);

    tick(1000);
    expect(service.redirectProgress$.value).toBeCloseTo(50, 0);

    service.ngOnDestroy();
  }));

  it('isSubmitting$ starts as false', () => {
    const {service} = build();
    expect(service.isSubmitting$.value).toBeFalse();
  });

  describe('recovery session integrity (S2)', () => {
    const RECOVERY_EVENT_FRESHNESS_MS = 15_000;

    afterEach(() => {
      clearRecoveryMarker();
    });

    it('never sets isRecoverySession$ true from URL text alone when no marker and no live session exist', () => {
      const {service} = build({fingerprint$: of(null)});

      expect(service.isRecoverySession$.value).toBeFalse();
    });

    it('keeps isRecoverySession$ false when a live, unrelated session exists alongside a malformed recovery link', () => {
      const {service} = build({
        fingerprint$: of({userId: 'existing-user', sessionId: 'existing-session'})
      });

      expect(service.isRecoverySession$.value).toBeFalse();
    });

    it('restores isRecoverySession$ true from a valid marker matching the live session, without a new verifyRecoveryOtp$ call', () => {
      writeRecoveryMarker('user-1', 'sess-1', Date.now());

      const {service, supabaseService} = build({
        fingerprint$: of({userId: 'user-1', sessionId: 'sess-1'})
      });

      expect(service.isRecoverySession$.value).toBeTrue();
      expect(supabaseService.auth.verifyRecoveryOtp$).not.toHaveBeenCalled();
    });

    it('preserves a valid tab marker across the recovery subject\'s initial BehaviorSubject(null) replay, even when live-session restoration resolves asynchronously', fakeAsync(() => {
      writeRecoveryMarker('user-1', 'sess-1', Date.now());
      const fingerprint$ = new Subject<{userId: string; sessionId: string} | null>();

      const {service} = build({
        fingerprint$: fingerprint$.asObservable(),
        // A fresh BehaviorSubject(null) — the exact ambiguous seed value a
        // real reload/back-forward produces on every new SupabaseService
        // instance, indistinguishable from a genuine SIGNED_OUT at the
        // moment of subscription (R2/R3).
        passwordRecoverySession$: new BehaviorSubject<RecoveryEventSession | null>(null).asObservable()
      });

      // The marker must still be present — the ambiguous initial replay must
      // never be treated as a real SIGNED_OUT clear.
      expect(readValidRecoveryMarker('user-1', 'sess-1', Date.now())).not.toBeNull();
      expect(service.isRecoverySession$.value).toBeFalse();

      // Live-session restoration settles later (asynchronously) — the exact
      // timing a real reload produces while the SDK/auth session stream is
      // still settling.
      fingerprint$.next({userId: 'user-1', sessionId: 'sess-1'});
      tick();

      expect(service.isRecoverySession$.value).toBeTrue();
    }));

    it('does not write a marker or grant recovery eligibility for a passwordRecoverySession$ event with an empty sessionId', fakeAsync(() => {
      const event$ = new BehaviorSubject<RecoveryEventSession | null>({
        userId: 'u1',
        sessionId: '',
        emittedAt: Date.now()
      });
      const {service} = build({passwordRecoverySession$: event$.asObservable()});
      tick();

      expect(service.isRecoverySession$.value).toBeFalse();
      expect(readValidRecoveryMarker('u1', '', Date.now())).toBeNull();
    }));

    it('does not write a recovery marker from a passwordRecoverySession$ event older than RECOVERY_EVENT_FRESHNESS_MS', fakeAsync(() => {
      const stale$ = new BehaviorSubject<RecoveryEventSession | null>({
        userId: 'u1',
        sessionId: 's1',
        emittedAt: Date.now() - RECOVERY_EVENT_FRESHNESS_MS - 1
      });
      const {service} = build({passwordRecoverySession$: stale$.asObservable()});
      tick();

      expect(readValidRecoveryMarker('u1', 's1', Date.now())).toBeNull();
      expect(service.isRecoverySession$.value).toBeFalse();
    }));

    it('does not leave a stale marker restorable after passwordRecoverySession$ emits null (SIGNED_OUT)', () => {
      const recovery$ = new BehaviorSubject<RecoveryEventSession | null>({
        userId: 'u1',
        sessionId: 's1',
        emittedAt: Date.now()
      });
      build({passwordRecoverySession$: recovery$.asObservable()});
      recovery$.next(null);

      TestBed.resetTestingModule();
      const second = build({
        passwordRecoverySession$: of(null),
        fingerprint$: of({userId: 'u1', sessionId: 's1'})
      });

      expect(second.service.isRecoverySession$.value).toBeFalse();
    });

    it('verifyRecoveryToken$ success sets isRecoverySession$ true and resolves true', () => {
      const {service, supabaseService} = build();
      supabaseService.auth.verifyRecoveryOtp$.and.returnValue(
        of({userId: 'u1', sessionId: 's1', emittedAt: Date.now()})
      );

      let result: boolean | undefined;
      service.verifyRecoveryToken$('abc123').subscribe(r => result = r);

      expect(supabaseService.auth.verifyRecoveryOtp$).toHaveBeenCalledWith('abc123');
      expect(service.isRecoverySession$.value).toBeTrue();
      expect(result).toBeTrue();
    });

    it('verifyRecoveryToken$ failure marks the session invalid with the existing message, writes no marker, and resolves false', () => {
      const {service, supabaseService} = build();
      supabaseService.auth.verifyRecoveryOtp$.and.returnValue(
        throwError(() => ({message: 'otp_expired'}))
      );

      let result: boolean | undefined;
      service.verifyRecoveryToken$('abc123').subscribe(r => result = r);

      expect(service.isRecoverySession$.value).toBeFalse();
      expect(service.errorMessage$.value).toBe('Invalid or expired password reset link.');
      expect(readValidRecoveryMarker('u1', 's1', Date.now())).toBeNull();
      expect(result).toBeFalse();
    });

    it('verifyRecoveryToken$ resolves false and stays invalid when the SDK succeeds but returns no bindable session (e.g. unextractable sessionId), without writing a marker', () => {
      const {service, supabaseService} = build();
      supabaseService.auth.verifyRecoveryOtp$.and.returnValue(of(null));

      let result: boolean | undefined;
      service.verifyRecoveryToken$('abc123').subscribe(r => result = r);

      expect(service.isRecoverySession$.value).toBeFalse();
      expect(result).toBeFalse();
    });

    it('never calls verifyRecoveryOtp$, getCurrentSessionFingerprint$, or subscribes to passwordRecoverySession$-driven marker logic during server-side rendering', () => {
      const {service, supabaseService} = build({platform: 'server'});

      expect(supabaseService.auth.verifyRecoveryOtp$).not.toHaveBeenCalled();
      expect(supabaseService.auth.getCurrentSessionFingerprint$).not.toHaveBeenCalled();
      expect(service.isRecoverySession$.value).toBeFalse();
    });
  });
});
