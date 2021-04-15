import { Injectable }             from '@angular/core';
import { MatSnackBar }            from '@angular/material/snack-bar';
import { Router }                 from '@angular/router';
import { User }                   from '@supabase/supabase-js';
import { BehaviorSubject }        from 'rxjs';
import { tap }                    from 'rxjs/operators';
import { UserDataHandlerService } from '../../../shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import { SharedConstants }        from '../../../shared-interproject/SharedConstants';
import { SupabaseService }        from '../../backend/supabase.service';

@Injectable()
export class UserManagementIntegrationService {
  user$ = new BehaviorSubject<User | undefined>(undefined);
  
  constructor(
    public snackBar: MatSnackBar,
    public router: Router,
    public backend: SupabaseService,
    public userBoxService: UserDataHandlerService
  ) {
    
    this.user$.subscribe(x => {
      
      if (x) {
        this.userBoxService.store.user$.next({username: x.email});
      } else {
        this.userBoxService.store.user$.next({username: undefined});
      }
    });
    
    this.checkUserInCookies();
    
    userBoxService.logoffButtonClick$.subscribe(x => {
      
      this.user$.next(undefined);
      this.backend.logoff();
      this.router.navigate(['/modules/browser']);
      SharedConstants.successLogout(this.snackBar);
    });
  }
  
  private checkUserInCookies(): void {
    let user: User = this.backend.getUser();
    if (user && user.role === 'authenticated') {
      this.user$.next(user);
    }
  }
  
  login(email: string, password: string) {
    return this.backend.login(email, password)
               .pipe(tap(x => {!x.error ? this.user$.next(x.user) : ''; }));
  }
  
  signup(email: string, password: string) {
    return this.backend.signup(email, password);
  }
}
