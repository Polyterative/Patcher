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
  of,
  Subject
} from 'rxjs';
import {
  filter,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';


@Injectable()
export class UserSignupDataService {
  updateData$ = new Subject<void>();
  
  // user$ = new BehaviorSubject<StaffGet | undefined>(undefined);
  
  fields = {
    username: {
      label: 'Username',
      code: 'username',
      flex: '6rem',
      control: new UntypedFormControl('', Validators.compose([
        Validators.required,
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
        switchMap(x => this.loginInteraction.signup(
          this.fields.username.control.value,
          this.fields.email.control.value,
          this.fields.password.control.value)
        ),
        switchMap(x => {
          if (x) {
            SharedConstants.successSignup(snackBar);
            return this.loginInteraction.login$(this.fields.email.control.value, this.fields.password.control.value);
            
          } else {
            SharedConstants.errorSignup(snackBar, 'Something went wrong, a user with this email address or username may already have been registered');
            return of(undefined);
          }
        }),
        filter(x => !!x),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(x => this.router.navigate(['/user/area']));
    
    // this.googleSignClick$
    //     .pipe(
    //       switchMap(x => this.loginInteraction.signupGoogle()),
    //       takeUntil(this.destroyEvent$)
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
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}