import { Injectable }            from '@angular/core';
import {
  UntypedFormControl,
  Validators
}                                from '@angular/forms';
import { MatSnackBar }           from "@angular/material/snack-bar";
import { Router }                from '@angular/router';
import {
  interval,
  Subject
}                                from 'rxjs';
import {
  switchMap,
  take,
  takeUntil
}                                from 'rxjs/operators';
import { FormTypes }             from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants }       from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';


@Injectable()
export class UserLoginDataService {
  public readonly updateData$ = new Subject<void>();
  
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
  public readonly mailLoginClick$ = new Subject<void>();
  
  // public readonly mailSignClick$ = new Subject<void>();
  
  constructor(
    private router: Router,
    public loginInteraction: UserManagementService,
    private snackBar: MatSnackBar
  ) {
    
    this.mailLoginClick$
      .pipe(
        switchMap(() => this.loginInteraction.login$(this.fields.user.control.value, this.fields.password.control.value)),
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
  
  protected destroyEvent$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}