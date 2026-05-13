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
  filter,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";


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
      control: new UntypedFormControl('', Validators.compose([
        Validators.required,
        Validators.pattern(/\S/),
        Validators.maxLength(128),
        Validators.minLength(3)
      ])),
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
    snackBar: MatSnackBar
  ) {
    super();
    
    this.mailSignClick$
      .pipe(
        switchMap(() => this.loginInteraction.signup(
          this.fields.username.control.value.trim(),
          this.fields.email.control.value,
          this.fields.password.control.value
        ).pipe(
          catchError((error: Error) => {
            SharedConstants.errorSignup(snackBar, error?.message);
            return EMPTY;
          })
        )),
        switchMap(result => {
          if (result.requiresEmailConfirmation) {
            SharedConstants.confirmMail(snackBar);
            return of(undefined);
          }

          SharedConstants.successSignup(snackBar);
          return this.loginInteraction.login$(this.fields.email.control.value, this.fields.password.control.value);
        }),
        filter(x => !!x),
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        const returnUrl = this.activated.snapshot.queryParamMap.get('returnUrl');
        this.router.navigate([returnUrl || x.returnUrl || '/user/area']);
      });
    
  }
}
