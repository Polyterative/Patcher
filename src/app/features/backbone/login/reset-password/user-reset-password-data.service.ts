import {
  Injectable,
  OnDestroy
} from '@angular/core';
import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { SupabaseService } from '../../../backend/supabase.service';


const ERROR_MESSAGES = SharedConstants.messages.resetPassword;

@Injectable()
export class UserResetPasswordDataService implements OnDestroy {
  
  // State management
  public readonly isRecoverySession$ = new BehaviorSubject<boolean>(false);
  public readonly isSessionChecked$ = new BehaviorSubject<boolean>(false);
  public readonly isSubmitting$ = new BehaviorSubject<boolean>(false);
  public readonly errorMessage$ = new BehaviorSubject<string>('');
  public readonly successMessage$ = new BehaviorSubject<string>('');
  public readonly redirectCountdown$ = new BehaviorSubject<number | null>(null);
  public readonly redirectProgress$ = new BehaviorSubject<number>(0);
  
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
  
  private readonly destroyEvent$ = new Subject<void>();
  
  constructor(
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    this.initializeSubmitHandler();
  }
  
  /**
   * Initialize the password reset submission handler
   */
  private initializeSubmitHandler(): void {
    this.submitPasswordReset$
      .pipe(
        switchMap(() => {
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
              
              // Clear form
              this.fields.password.control.setValue('');
              this.fields.confirmPassword.control.setValue('');
              
              // Start countdown from 10 seconds
              this.startRedirectCountdown(10);
              
              return true;
            }),
            catchError((error) => {
              // Handle errors
              console.error('Password reset failed:', error);
              
              // Extract user-friendly error message
              let errorMessage = ERROR_MESSAGES.resetFailed;
              
              if (error?.message) {
                errorMessage = error.message;
              } else if (error?.msg) {
                errorMessage = error.msg;
              } else if (error?.error_description) {
                errorMessage = error.error_description;
              }
              
              // Log detailed error info for debugging
              if (error?.errorCode) {
                console.error('Error code:', error.errorCode);
              }
              if (error?.statusCode) {
                console.error('Status code:', error.statusCode);
              }
              
              // Update UI state
              this.errorMessage$.next(errorMessage);
              this.isSubmitting$.next(false);
              
              // Return empty array to complete the stream without propagating error
              return [];
            })
          );
        }),
        takeUntil(this.destroyEvent$)
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
   * Check if URL contains recovery parameters
   */
  checkForRecoveryInUrl(): boolean {
    const hash = window.location.hash;
    const isRecovery = hash.includes('type=recovery') || hash.includes('type%3Drecovery');
    this.setRecoverySession(isRecovery);
    return isRecovery;
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
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
}
