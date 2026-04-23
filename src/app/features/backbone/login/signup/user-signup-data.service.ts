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
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';
import { SubManager } from "src/app/shared-interproject/directives/subscription-manager";


@Injectable()
export class UserSignupDataService extends SubManager {
  updateData$ = new Subject<void>();
  
  // user$ = new BehaviorSubject<StaffGet | undefined>(undefined);
  
  fields = {
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
      type: FormTypes.TEXT
    },
    email: {
      label: 'Email',
      code: 'email',
      flex: '6rem',
      control: new UntypedFormControl('', Validators.compose([
        Validators.required,
        Validators.email
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
      type: FormTypes.PASSWORD_NEW
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
      type: FormTypes.PASSWORD_NEW
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
    
    // this.mailLoginClick$
    //     .pipe(switchMap(x => this.loginInteraction.login(this.fields.user.control.value, this.fields.password.control.value)))
    //     .subscribe(x => {
    //       if (!!x.error) {
    //         SharedConstants.errorLogin(snackBar, x.error.message);
    //       } else {
    //         SharedConstants.successLogin(snackBar);
    //         this.router.navigate(['/modules/browser']);
    //       }
    //     });
    
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
    
    // this.googleSignClick$
    //     .pipe(
    //       switchMap(x => this.loginInteraction.signupGoogle()),
    //       takeUntil(this.destroy$)
    //     )
    //     .subscribe(x => {
    //       if (!!x.error) {
    //         SharedConstants.errorSignup(snackBar, x.error.message);
    //       } else {
    //         SharedConstants.confirmMail(snackBar);
    //       }
    //
    //     });
    
  }
}
