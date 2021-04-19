import { Injectable }             from '@angular/core';
import { MatSnackBar }            from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
}                                 from '@angular/router';
import { User }                   from '@supabase/supabase-js';
import { BehaviorSubject }        from 'rxjs';
import { fromPromise }            from 'rxjs/internal-compatibility';
import { tap }                    from 'rxjs/operators';
import { UserDataHandlerService } from '../../../shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import { SharedConstants }        from '../../../shared-interproject/SharedConstants';
import { SupabaseService }        from '../../backend/supabase.service';

@Injectable()
export class UserManagementService {
  user$ = new BehaviorSubject<User | undefined>(undefined);
  
  constructor(
    public snackBar: MatSnackBar,
    public router: Router,
    public backend: SupabaseService,
    public activated: ActivatedRoute,
    public userBoxService: UserDataHandlerService
  ) {
    this.checkUserInCookies();
    
    this.user$.subscribe(x => {
  
      if (x) {
        this.userBoxService.store.user$.next({username: x.email});
      } else {
        this.userBoxService.store.user$.next({username: undefined});
      }
    });
  
    userBoxService.logoffButtonClick$.subscribe(x => {
      this.logoff();
    });
  }
  
  login(email: string, password: string) {
    return this.backend.login(email, password)
               .pipe(tap(x => {if (!x.error) {this.user$.next(x.user); } }));
  }
  
  signup(email: string, password: string) {
    return this.backend.signup(email, password);
  }
  
  signupGoogle() {
    return this.backend.signupGoogle();
  }
  
  logoff(): void {
    console.log('Logging out...');
    this.userBoxService.store.user$.next(undefined);
    this.user$.next(undefined);
    fromPromise(this.backend.logoff())
      .subscribe(x => {
        this.router.navigate(['/modules/browser']);
        SharedConstants.successLogout(this.snackBar);
      });
  }
  
  private checkUserInCookies(): void {
    const user: User = this.backend.getUser();
    if (user && user.role === 'authenticated') {
      this.user$.next(user);
    }
  }
}
