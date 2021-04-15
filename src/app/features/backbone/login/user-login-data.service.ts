import { Injectable }                       from '@angular/core';
import {
  FormControl,
  Validators
}                                           from '@angular/forms';
import { MatSnackBar }                      from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
}                                           from '@angular/router';
import { Subject }                          from 'rxjs';
import {
  switchMap,
  takeUntil
}                                           from 'rxjs/operators';
import { FormTypes }                        from '../../../shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants }                  from '../../../shared-interproject/SharedConstants';
import { UserManagementIntegrationService } from './user-management-integration.service';

@Injectable()
export class UserLoginDataService {
  updateData$ = new Subject<void>();
  
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
      type:    FormTypes.TEXT
    },
    password: {
      label:   'Password',
      code:    'pass',
      flex:    '6rem',
      control: new FormControl([], Validators.compose([
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(30)
      ])),
      type:    FormTypes.TEXT
    }
  };
  mailLoginClick$ = new Subject<void>();
  mailSignClick$ = new Subject<void>();
  
  constructor(
    public router: Router,
    public activated: ActivatedRoute,
    public loginInteraction: UserManagementIntegrationService,
    snackBar: MatSnackBar
  ) {
    
    this.mailLoginClick$
        .pipe(switchMap(x => this.loginInteraction.login(this.fields.user.control.value, this.fields.password.control.value)))
        .subscribe(x => {
          if (!!x.error) {
            SharedConstants.errorLogin(snackBar, x.error.message);
          } else {
            SharedConstants.successLogin(snackBar);
            this.router.navigate(['/modules/browser']);
          }
        });
    
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
    
  }
  
  protected destroyEvent$: Subject<void> = new Subject();
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
    
  }
}
