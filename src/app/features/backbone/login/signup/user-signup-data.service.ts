import { Injectable }            from '@angular/core';
import {
  FormControl,
  Validators
}                                from '@angular/forms';
import { MatSnackBar }           from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
}                                from '@angular/router';
import { Subject }               from 'rxjs';
import {
  switchMap,
  takeUntil
}                                from 'rxjs/operators';
import { FormTypes }             from '../../../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants }       from '../../../../shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';

@Injectable()
export class UserSignupDataService {
  updateData$ = new Subject<void>();
  
  // user$ = new BehaviorSubject<StaffGet | undefined>(undefined);
  
  fields = {
    user:          {
      label:   'Email',
      code:    'email',
      flex:    '6rem',
      control: new FormControl('', Validators.compose([
        Validators.email,
        Validators.required
      ])),
      type:    FormTypes.EMAIL
    },
    password:      {
      label:   'Password',
      code:    'pass',
      flex:    '6rem',
      control: new FormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(30)
      ])),
      type:    FormTypes.PASSWORD
    },
    passwordAgain: {
      label:   'Repeat Password',
      code:    'pass-pass',
      flex:    '6rem',
      control: new FormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(30)
      ])),
      type:    FormTypes.PASSWORD
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
          switchMap(x => this.loginInteraction.signup(this.fields.user.control.value, this.fields.password.control.value)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => {
          if (!!x.error) {
            SharedConstants.errorSignup(snackBar, x.error.message);
          } else {
            SharedConstants.confirmMail(snackBar);
          }
  
        });
    this.googleSignClick$
        .pipe(
          switchMap(x => this.loginInteraction.signupGoogle()),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(x => {
          if (!!x.error) {
            SharedConstants.errorSignup(snackBar, x.error.message);
          } else {
            SharedConstants.confirmMail(snackBar);
          }
    
        });
  
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
