import { Injectable } from '@angular/core';
import {
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  EMPTY,
  of,
  Subject
} from 'rxjs';
import {
  catchError,
  exhaustMap,
  filter,
  switchMap,
  tap
} from 'rxjs/operators';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";
import { AnalyticsService } from '../../analytics-integration/analytics.service';
import { ErrorCodes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/app-form-utils';
import {
  applyUsernameAvailabilityError,
  usernameValidators
} from '../username-validation';
import { normalizeInternalReturnUrl } from '../safe-return-url';


@Injectable()
export class UserSignupDataService extends SubManager {
  updateData$ = new Subject<void>();
  
  readonly fields: {
    username: IMatFormEntityConfig;
    email: IMatFormEntityConfig;
    password: IMatFormEntityConfig;
    passwordAgain: IMatFormEntityConfig;
  } = {
    username: {
      label: 'Username',
      code: 'username',
      flex: '6rem',
      control: new UntypedFormControl('', Validators.compose(usernameValidators())),
      type: FormTypes.TEXT,
      hint: 'Visible by other users',
      iconL1: 'person',
      ergonomics: {
        autofocus: true,
        enterkeyhint: 'next'
      }
    },
    email: {
      label: 'Email',
      code: 'email',
      flex: '6rem',
      control: new UntypedFormControl('', Validators.compose([
        Validators.required,
        Validators.email
      ])),
      type: FormTypes.EMAIL,
      hint: 'NOT visible by other users',
      iconL1: 'email',
      ergonomics: {
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
      type: FormTypes.PASSWORD_NEW,
      iconL1: 'lock',
      ergonomics: {
        enterkeyhint: 'next'
      }
    },
    passwordAgain: {
      label: 'Repeat Password',
      code: 'pass-pass',
      flex: '6rem',
      control: new UntypedFormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(30)
      ])),
      type: FormTypes.PASSWORD_NEW,
      iconL1: 'lock',
      ergonomics: {
        enterkeyhint: 'done'
      }
    }
  };
  mailSignClick$ = new Subject<void>();
  googleSignClick$ = new Subject<void>();
  
  constructor(
    public router: Router,
    public activated: ActivatedRoute,
    public loginInteraction: UserManagementService,
    snackBar: MatSnackBar,
    private analytics: AnalyticsService
  ) {
    super();
    
    this.mailSignClick$
      .pipe(
        exhaustMap(() => {
          const username = `${ this.fields.username.control.value ?? '' }`.trim();
          this.fields.username.control.setValue(username);
          applyUsernameAvailabilityError(this.fields.username.control, null);
          this.fields.username.control.updateValueAndValidity();

          if (this.fields.username.control.invalid ||
            this.fields.email.control.invalid ||
            this.fields.password.control.invalid ||
            this.fields.passwordAgain.control.invalid ||
            this.fields.password.control.value !== this.fields.passwordAgain.control.value) {
            this.fields.username.control.markAsTouched();
            this.fields.email.control.markAsTouched();
            this.fields.password.control.markAsTouched();
            this.fields.passwordAgain.control.markAsTouched();
            return EMPTY;
          }

          return this.loginInteraction.isUsernameAvailableForSignup$(username).pipe(
            catchError((error: Error) => {
              applyUsernameAvailabilityError(this.fields.username.control, ErrorCodes.form.errorCode.custom.usernameAvailabilityCheckFailed);
              SharedConstants.errorSignup(snackBar, error?.message);
              return EMPTY;
            }),
            switchMap(isAvailable => {
              if (!isAvailable) {
                applyUsernameAvailabilityError(this.fields.username.control, ErrorCodes.form.errorCode.custom.usernameTaken);
                return EMPTY;
              }

              return this.loginInteraction.signup(
                username,
                this.fields.email.control.value,
                this.fields.password.control.value
              ).pipe(
                catchError((error: Error) => {
                  SharedConstants.errorSignup(snackBar, error?.message);
                  return EMPTY;
                })
              );
            })
          );
        }),
        tap(result => {
          this.analytics.capture('auth.signed_up', {
            method: 'password',
            email_confirmation_required: result.requiresEmailConfirmation
          });
        }),
        switchMap(result => {
          if (result.requiresEmailConfirmation) {
            SharedConstants.confirmMail(snackBar);
            return of(undefined);
          }

          SharedConstants.successSignup(snackBar);
          return this.loginInteraction.login$(this.fields.email.control.value, this.fields.password.control.value);
        }),
        filter(x => !!x),
        this.takeUntilDestroyed()
      )
      .subscribe(x => {
        const returnUrl = this.activated.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(normalizeInternalReturnUrl(returnUrl || x.returnUrl));
      });
    
  }
}
