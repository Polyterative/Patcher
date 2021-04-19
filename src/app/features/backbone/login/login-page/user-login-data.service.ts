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
import {
  BehaviorSubject,
  interval,
  Subject
}                                from 'rxjs';
import {
  switchMap,
  take
}                                from 'rxjs/operators';
import { FormTypes }             from '../../../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants }       from '../../../../shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';

@Injectable()
export class UserLoginDataService {
  updateData$ = new Subject<void>();
  private preLoginImage = 'assets/doorc.png';
  private postLoginImage = 'assets/dooro.png';
  loginImage$ = new BehaviorSubject<string>(this.preLoginImage);
  // user$ = new BehaviorSubject<StaffGet | undefined>(undefined);
  
  fields = {
    user:     {
      label:   'Email',
      code:    'email',
      flex:    '6rem',
      control: new FormControl('', Validators.compose([
        Validators.email,
        Validators.required
      ])),
      type:    FormTypes.EMAIL
    },
    password: {
      label:   'Password',
      code:    'pass',
      flex:    '6rem',
      control: new FormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(8),
        Validators.maxLength(30)
      ])),
      type:    FormTypes.PASSWORD
    }
  };
  mailLoginClick$ = new Subject<void>();
  mailSignClick$ = new Subject<void>();
  
  constructor(
    public router: Router,
    public activated: ActivatedRoute,
    public loginInteraction: UserManagementService,
    snackBar: MatSnackBar
  ) {
  
    this.mailLoginClick$
        .pipe(
          switchMap(x => this.loginInteraction.login(this.fields.user.control.value, this.fields.password.control.value))
        )
        .subscribe(x => {
          if (!!x.error) {
            SharedConstants.errorLogin(snackBar, x.error.message);
          } else {
            SharedConstants.successLogin(snackBar);
            this.loginImage$.next(this.postLoginImage);
            interval(1000)
              .pipe(take(1))
              .subscribe(z => {
      
                this.router.navigate([x.returnUrl ? x.returnUrl : '/modules/browser']);
              });
          }
        });
  
    // this.mailSignClick$
    //     .pipe(
    //       switchMap(x => this.loginInteraction.signup(this.fields.user.control.value, this.fields.password.control.value)),
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
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
