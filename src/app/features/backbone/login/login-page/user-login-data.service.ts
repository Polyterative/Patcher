import { Injectable } from '@angular/core';
import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  interval,
  Subject
} from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  take,
  takeUntil,
  tap
} from 'rxjs/operators';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';


@Injectable()
export class UserLoginDataService {
  public readonly updateData$ = new Subject<void>();
  
  // State management for password reset UI
  public readonly showPasswordReset$ = new BehaviorSubject<boolean>(false);
  public readonly isSubmittingReset$ = new BehaviorSubject<boolean>(false);
  public readonly resetSuccessMessage$ = new BehaviorSubject<string>('');
  public readonly resetErrorMessage$ = new BehaviorSubject<string>('');
  
  fields = {
    user: {
      label: 'Email',
      code: 'email',
      flex: '6rem',
      control: new UntypedFormControl('', Validators.compose([
        Validators.email,
        Validators.required,
        Validators.minLength(3)
      ])),
      type: FormTypes.EMAIL
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
      type: FormTypes.PASSWORD_CURRENT
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
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => {
        SharedConstants.successLogin(this.snackBar);
        interval(1000)
          .pipe(take(1))
          .subscribe(() => {
            this.router.navigate([x.returnUrl ? x.returnUrl : '/user/area']);
          });
      });
  }
  
  /**
   * Initialize password reset toggle handler
   */
  private initializePasswordResetToggle(): void {
    this.togglePasswordReset$
      .pipe(takeUntil(this.destroyEvent$))
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
        map(() => this.fields.user.control.value),
        tap(() => {
          this.resetErrorMessage$.next('');
          this.resetSuccessMessage$.next('');
        }),
        // Validate email
        map(email => {
          if (!email || !email.trim()) {
            throw new Error('Please enter your email address.');
          }
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            throw new Error('Please enter a valid email address.');
          }
          return email;
        }),
        tap(() => this.isSubmittingReset$.next(true)),
        switchMap(email =>
          this.loginInteraction.resetPassword$(email).pipe(
            map(() => ({
              success: true,
              message: 'Check your email! We\'ve sent you a link to reset your password.'
            })),
            catchError(() => {
              this.isSubmittingReset$.next(false);
              this.resetErrorMessage$.next('Something went wrong. Please try again.');
              return [];
            })
          )
        ),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(result => {
        if (result?.success) {
          this.isSubmittingReset$.next(false);
          this.resetSuccessMessage$.next(result.message);
        }
      }, error => {
        this.isSubmittingReset$.next(false);
        this.resetErrorMessage$.next(error.message || 'Please enter a valid email address.');
      });
  }
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}