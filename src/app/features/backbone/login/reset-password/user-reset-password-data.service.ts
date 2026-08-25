import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  Inject,
  Injectable,
  OnDestroy,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  Subject
} from 'rxjs';
import {
  catchError,
  exhaustMap,
  map,
  take,
  tap
} from 'rxjs/operators';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SupabaseService } from '../../../backend/supabase.service';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import {
  createPasswordUpdateError,
  RECOVERY_EVENT_FRESHNESS_MS
} from 'src/app/features/backend/supabase-auth.helpers';
import {
  clearRecoveryMarker,
  readValidRecoveryMarker,
  writeRecoveryMarker
} from './recovery-session-marker';


const ERROR_MESSAGES = SharedConstants.messages.resetPassword;
const INVALID_OR_EXPIRED_LINK_MESSAGE = 'Invalid or expired password reset link.';

@Injectable()
export class UserResetPasswordDataService extends SubManager implements OnDestroy {
  
  // State management
  public readonly isRecoverySession$ = new BehaviorSubject<boolean>(false);
  public readonly isSessionChecked$ = new BehaviorSubject<boolean>(false);
  public readonly isSubmitting$ = new BehaviorSubject<boolean>(false);
  public readonly errorMessage$ = new BehaviorSubject<string>('');
  public readonly successMessage$ = new BehaviorSubject<string>('');
  public readonly redirectCountdown$ = new BehaviorSubject<number | null>(null);
  public readonly redirectProgress$ = new BehaviorSubject<number>(0);

  /**
   * Lifecycle-aware settlement signal (passthrough of
   * `SupabaseService.auth.authInitializationSettled$`) — the component uses
   * this instead of a fixed timer to know when it is safe to conclude "no
   * recovery event is coming" for a bare/malformed link, without racing a
   * slow-but-legitimate implicit/hash recovery (R12). Assigned in the
   * constructor body (not a field initializer) since it reads a
   * constructor-injected parameter property.
   */
  public readonly authInitializationSettled$: Observable<void>;
  
  // Form fields configuration
  public readonly fields: {
    password: IMatFormEntityConfig;
    confirmPassword: IMatFormEntityConfig;
  } = {
    password: {
      type: FormTypes.PASSWORD_NEW,
      label: ERROR_MESSAGES.passwordLabel,
      control: new UntypedFormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(30)
      ]),
      code: 'password',
      flex: '100%',
      iconL1: 'lock',
      ergonomics: {
        autofocus: true,
        enterkeyhint: 'next'
      }
    },
    confirmPassword: {
      type: FormTypes.PASSWORD_NEW,
      label: ERROR_MESSAGES.confirmPasswordLabel,
      control: new UntypedFormControl('', [Validators.required]),
      code: 'confirmPassword',
      flex: '100%',
      iconL1: 'lock',
      ergonomics: {
        enterkeyhint: 'done'
      }
    }
  };
  
  // Action subjects
  public readonly submitPasswordReset$ = new Subject<void>();
  
  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private readonly analytics: AnalyticsService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {
    super();
    this.authInitializationSettled$ = this.supabaseService.auth.authInitializationSettled$;
    this.initializeSubmitHandler();

    // Recovery tokens/events are single-use and session-bound: only the
    // browser may verify or restore them (SSR must never touch this — I-H).
    if (isPlatformBrowser(this.platformId)) {
      this.restoreRecoverySessionFromMarker();
      this.initializeRecoveryEventListener();
    }
  }
  
  /**
   * Initialize the password reset submission handler
   */
  private initializeSubmitHandler(): void {
    this.submitPasswordReset$
      .pipe(
        exhaustMap(() => {
          // Validate form
          const password = this.fields.password.control.value;
          const confirmPassword = this.fields.confirmPassword.control.value;
          
          // Clear previous messages
          this.errorMessage$.next('');
          this.successMessage$.next('');
          
          // Validate required fields
          if (this.fields.password.control.invalid || this.fields.confirmPassword.control.invalid) {
            this.errorMessage$.next('Please fill all required fields.');
            return [];
          }
          
          // Validate password match
          if (password !== confirmPassword) {
            this.errorMessage$.next(ERROR_MESSAGES.passwordMismatch);
            return [];
          }
          
          // Validate password length
          if (password.length < 8) {
            this.errorMessage$.next(ERROR_MESSAGES.passwordTooShort);
            return [];
          }
          
          if (password.length > 30) {
            this.errorMessage$.next(ERROR_MESSAGES.passwordTooLong);
            return [];
          }
          
          // Set loading state
          this.isSubmitting$.next(true);
          
          // Call reset password API
          return this.supabaseService.auth.resetPassword$('', password).pipe(
            map(() => {
              // Success
              this.successMessage$.next(ERROR_MESSAGES.successTitle);
              this.isSubmitting$.next(false);
              this.analytics.capture('auth.password_reset_completed', {});
              
              // Recovery eligibility is single-use: clear it once the
              // password has actually been updated.
              clearRecoveryMarker();

              // Clear form
              this.fields.password.control.setValue('');
              this.fields.confirmPassword.control.setValue('');
              
              // Start countdown from 10 seconds
              this.startRedirectCountdown(10);
              
              return true;
            }),
            catchError((error) => {
              const passwordError = createPasswordUpdateError(error);
              // Handle errors
              console.error('Password reset failed:', {
                errorCode: passwordError.errorCode,
                statusCode: passwordError.statusCode
              });

              // Log detailed error info for debugging, but never surface raw backend
              // error text to the user
              if (passwordError.errorCode) {
                console.error('Error code:', passwordError.errorCode);
              }
              if (passwordError.statusCode) {
                console.error('Status code:', passwordError.statusCode);
              }

              // Update UI state
              this.errorMessage$.next(passwordError.message);
              this.isSubmitting$.next(false);

              // Return empty array to complete the stream without propagating error
              return [];
            })
          );
        }),
        this.takeUntilDestroyed()
      )
      .subscribe();
  }
  
  /**
   * Set the recovery session state
   */
  setRecoverySession(isRecovery: boolean): void {
    this.isRecoverySession$.next(isRecovery);
    this.isSessionChecked$.next(true);
  }

  /**
   * Verifies a query-param `token_hash` recovery link (explicit shape,
   * delegated here from `ResetPasswordPageComponent` per the layering
   * contract: component -> data service -> `SupabaseService.auth` -> SDK).
   * On success, persists a session-bound marker so a same-tab reload/back-
   * forward can restore the recovery state without re-verifying the
   * (single-use) token. On failure, preserves the existing invalid-link
   * copy and writes no marker.
   *
   * Returns an `Observable<boolean>` (this token's own success/failure) so
   * the caller can react to *this specific verification attempt* — never to
   * the aggregate `isRecoverySession$`/`isSessionChecked$` state, which a
   * concurrent, unrelated marker-restore could otherwise flip independently
   * and cause a pre-existing marker to scrub a fresh token's URL before that
   * token's own verification later fails (R8/R9).
   */
  verifyRecoveryToken$(tokenHash: string): Observable<boolean> {
    return this.supabaseService.auth.verifyRecoveryOtp$(tokenHash)
      .pipe(
        tap(recoveryEvent => {
          if (recoveryEvent && recoveryEvent.sessionId) {
            writeRecoveryMarker(recoveryEvent.userId, recoveryEvent.sessionId);
          }
          this.setRecoverySession(!!recoveryEvent);
        }),
        map(recoveryEvent => !!recoveryEvent && !!recoveryEvent.sessionId),
        catchError(() => {
          this.errorMessage$.next(INVALID_OR_EXPIRED_LINK_MESSAGE);
          this.setRecoverySession(false);
          return [false];
        })
      );
  }

  /**
   * Attempts a marker-based restore against the *live*, SDK-verified session
   * on every (re)construction — the only path that satisfies "reload/back-
   * forward restores recovery state without re-verifying" (I-C). URL text
   * alone is never sufficient: with no live session, or an unrelated live
   * session (no matching marker), this simply leaves `isRecoverySession$`
   * at its default `false`.
   */
  private restoreRecoverySessionFromMarker(): void {
    this.supabaseService.auth.getCurrentSessionFingerprint$()
      .pipe(take(1), this.takeUntilDestroyed())
      .subscribe(fingerprint => {
        if (!fingerprint) return;

        const marker = readValidRecoveryMarker(fingerprint.userId, fingerprint.sessionId);
        if (marker) {
          this.setRecoverySession(true);
        }
      });
  }

  /**
   * Reacts to `SupabaseService.auth.passwordRecoverySession$` — the
   * implicit hash-fragment recovery shape, auto-processed by the SDK and
   * observed centrally. A stale replay (older than
   * `RECOVERY_EVENT_FRESHNESS_MS`) never writes a marker (Decision 3(b)). A
   * *later* `null` emission (a genuine `SIGNED_OUT`) durably clears any
   * marker, not merely an in-memory flag, so a later, unrelated visit can
   * never restore it.
   *
   * `passwordRecoverySession$` is a `BehaviorSubject` seeded at `null`
   * (Decision 3(a)'s race-free replay for a late-subscribing lazy route).
   * That seed is indistinguishable, from this subscriber's point of view,
   * from a genuine `SIGNED_OUT`'s `.next(null)` — but treating it as one
   * would clear a still-valid tab marker before
   * `restoreRecoverySessionFromMarker()`'s own async live-session check ever
   * gets to read it, breaking reload/back-forward (R2/R3). Only a value
   * observed *after* this subscriber's first emission is unambiguously a
   * real `.next(...)` call, so only that is ever treated as a genuine clear.
   */
  private hasObservedFirstRecoveryEvent = false;

  private initializeRecoveryEventListener(): void {
    this.supabaseService.auth.passwordRecoverySession$
      .pipe(this.takeUntilDestroyed())
      .subscribe(event => {
        const isAmbiguousInitialReplay = !this.hasObservedFirstRecoveryEvent && !event;
        this.hasObservedFirstRecoveryEvent = true;

        if (isAmbiguousInitialReplay) {
          return;
        }

        if (!event) {
          clearRecoveryMarker();
          return;
        }

        if (!event.sessionId) {
          // Fails closed: an event with a missing/empty sessionId can never
          // be safely bound to a marker (R5).
          return;
        }

        if (Date.now() - event.emittedAt >= RECOVERY_EVENT_FRESHNESS_MS) {
          return;
        }

        writeRecoveryMarker(event.userId, event.sessionId);
        this.setRecoverySession(true);
      });
  }
  
  /**
   * Start the countdown timer for auto-redirect
   */
  private countdownInterval: ReturnType<typeof setInterval> | undefined;
  
  startRedirectCountdown(seconds: number): void {
    this.redirectCountdown$.next(seconds);
    this.redirectProgress$.next(100);
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    const totalSeconds = seconds;
    this.countdownInterval = setInterval(() => {
      const currentCount = this.redirectCountdown$.value;
      if (currentCount !== null && currentCount > 0) {
        const newCount = currentCount - 1;
        this.redirectCountdown$.next(newCount);
        // Update progress bar (100% at start, 0% at end)
        this.redirectProgress$.next((newCount / totalSeconds) * 100);
        
        if (newCount === 0) {
          this.performRedirect();
        }
      }
    }, 1000);
  }
  
  /**
   * Perform the redirect to login
   */
  performRedirect(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(['/auth/login'], {queryParams: {resetSuccess: true}});
  }
  
  ngOnDestroy(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    super.ngOnDestroy();
  }
}
