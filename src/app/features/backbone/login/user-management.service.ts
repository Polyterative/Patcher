import { Injectable }             from '@angular/core';
import { MatSnackBar }            from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
}                                 from '@angular/router';
import { User }                   from '@supabase/supabase-js';
import {
  BehaviorSubject,
  from,
  of
}                                 from 'rxjs';
import {
  filter,
  switchMap,
  tap
}                                 from 'rxjs/operators';
import { UserDataHandlerService } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import { SharedConstants }        from 'src/app/shared-interproject/SharedConstants';
import { SupabaseService }        from '../../backend/supabase.service';

@Injectable()
export class UserManagementService {
  user$ = new BehaviorSubject<User | undefined>(undefined);
  userProfile$ = new BehaviorSubject<{ username: string, email: string } | undefined>(undefined);
  
  constructor(
    public snackBar: MatSnackBar,
    public router: Router,
    public backend: SupabaseService,
    public activated: ActivatedRoute,
    public userBoxService: UserDataHandlerService
  ) {
    this.checkUserInCookies();
  
    this.userProfile$
        .pipe()
        .subscribe(x => {
    
          if (x) {
            this.userBoxService.store.user$.next({username: x.username});
          } else {
            this.userBoxService.store.user$.next({username: undefined});
          }
        });
  
    this.user$
        .pipe(
          tap(x => this.userProfile$.next(undefined)),
          filter(x => !!x),
          switchMap(x => !!x ? this.backend.get.userWithId(x.id) : of(undefined))
        )
        .subscribe(x => this.userProfile$.next(x.data));
    
    userBoxService.logoffButtonClick$.subscribe(x => {
      this.logoff();
    });
  }
  
  login(email: string, password: string) {
    return this.backend.login(email, password)
               .pipe(tap(x => {if (!x.error) {this.user$.next(x.user); } }));
  }
  
  signup(username: string, email: string, password: string) {
    return this.backend.signup(username, email, password);
  }
  
  signupGoogle() {
    return this.backend.signupGoogle();
  }
  
  logoff(): void {
    console.log('Logging out...');
    this.user$.next(undefined);
    from(this.backend.logoff())
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
