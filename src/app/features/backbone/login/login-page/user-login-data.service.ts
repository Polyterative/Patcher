import { Injectable } from '@angular/core';
import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  concatMap,
  map,
  switchMap,
  takeUntil,
  tap
} from 'rxjs/operators';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';


interface PasswordResetResult {
  success: boolean;
  message: string;
}

@Injectable()
export class UserLoginDataService extends SubManager {
  public readonly updateData$ = new Subject<void>();
  
  // State management for password reset UI
  public readonly showPasswordReset$ = new BehaviorSubject<boolean>(false);
  public readonly isSubmittingReset$ = new BehaviorSubject<boolean>(false);
  public readonly resetSuccessMessage$ = new BehaviorSubject<string>('');
  public readonly resetErrorMessage$ = new BehaviorSubject<string>('');
  
  readonly fields: {
    user: IMatFormEntityConfig;
    password: IMatFormEntityConfig;
  } = {
    user: {
      label: 'Email',
      code: 'email',
      flex: '6rem',
      control: new UntypedFormControl('', Validators.compose([
        Validators.email,
        Validators.required,
        Validators.minLength(3)
      ])),
      type: FormTypes.EMAIL,
      iconL1: 'email',
      ergonomics: {
        autofocus: true,
        enterkeyhint: 'next'
      }
    },
    password: {
      label: 'Password',
      code: 'pass',
      flex: '6rem',
      control: new UntypedFormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(30)
      ])),
      type: FormTypes.PASSWORD_CURRENT,
      iconL1: 'lock',
      ergonomics: {
        enterkeyhint: 'send'
      }
    }
  };
  
  // Action subjects
  public readonly mailLoginClick$ = new Subject<void>();
  public readonly togglePasswordReset$ = new Subject<boolean>();
  public readonly requestPasswordReset$ = new Subject<void>();
  
  constructor(
    private router: Router,
    public loginInteraction: UserManagementService,
    private snackBar: MatSnackBar
  ) {
    super();
    this.initializeLoginHandler();
    this.initializePasswordResetToggle();
    this.initializePasswordResetRequest();
  }
  
  /**
   * Initialize login handler
   */
  private initializeLoginHandler(): void {
    this.mailLoginClick$
      .pipe(
        switchMap(() => this.loginInteraction.login$(
          this.fields.user.control.value,
          this.fields.password.control.value
        )),
        tap(() => SharedConstants.successLogin(this.snackBar)),
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        this.router.navigate([x.returnUrl ? x.returnUrl : '/user/area']);
      });
  }
  
  /**
   * Initialize password reset toggle handler
   */
  private initializePasswordResetToggle(): void {
    this.togglePasswordReset$
      .pipe(takeUntil(this.destroy$))
      .subscribe(show => {
        this.showPasswordReset$.next(show);
        this.resetSuccessMessage$.next('');
        this.resetErrorMessage$.next('');
      });
  }
  
  /**
   * Initialize password reset request handler
   */
  private initializePasswordResetRequest(): void {
    this.requestPasswordReset$
      .pipe(
        map(() => this.fields.user.control.value as string),
        tap(() => {
          this.resetErrorMessage$.next('');
          this.resetSuccessMessage$.next('');
        }),
        concatMap(email => this.validateAndSubmitPasswordReset$(email)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: result => {
          this.isSubmittingReset$.next(false);
          if (result.success) {
            this.resetSuccessMessage$.next(result.message);
          } else {
            this.resetErrorMessage$.next(result.message);
          }
        },
        error: () => {
          this.isSubmittingReset$.next(false);
          this.resetErrorMessage$.next('An unexpected error occurred. Please try again.');
        }
      });
  }
  
  /**
   * Validate email and submit password reset request
   */
  private validateAndSubmitPasswordReset$(email: string): Observable<PasswordResetResult> {
    // Validate email presence
    if (!email || !email.trim()) {
      return of({
        success: false,
        message: 'Please enter your email address.'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return of({
        success: false,
        message: 'Please enter a valid email address.'
      });
    }
    
    // Set loading state and submit
    this.isSubmittingReset$.next(true);
    
    return this.loginInteraction.resetPassword$(email).pipe(
      map(() => ({
        success: true,
        message: 'Check your email! We\'ve sent you a link to reset your password.'
      } as PasswordResetResult)),
      catchError(() => of({
        success: false,
        message: 'Something went wrong. Please try again.'
      } as PasswordResetResult))
    );
  }
}
