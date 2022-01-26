import { Injectable }             from '@angular/core';
import { MatSnackBar }            from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
}                                 from '@angular/router';
import { User }                   from '@supabase/supabase-js';
import {
  from,
  of,
  ReplaySubject
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
  loggedUser$ = new ReplaySubject<User | undefined>(1);
  loggedUserProfile$ = new ReplaySubject<{ username: string, email: string } | undefined>();
  
  constructor(
    public snackBar: MatSnackBar,
    public router: Router,
    public backend: SupabaseService,
    public activated: ActivatedRoute,
    public userBoxService: UserDataHandlerService
  ) {
    this.loggedUser$.next(undefined);
    this.loggedUserProfile$.next(undefined);
    
    this.checkUserInCookies();
  
    this.loggedUserProfile$
        .pipe()
        .subscribe(x => {
      
          if (x) {
            this.userBoxService.store.user$.next({username: x.username});
          } else {
            this.userBoxService.store.user$.next({username: undefined});
          }
        });
  
    this.loggedUser$
        .pipe(
          tap(x => this.loggedUserProfile$.next(undefined)),
          filter(x => !!x),
          switchMap(x => !!x ? this.backend.get.userWithId(x.id) : of(undefined))
        )
        .subscribe(x => this.loggedUserProfile$.next(x.data));
    
    userBoxService.logoffButtonClick$.subscribe(x => {
      this.logoff();
    });
  }
  
  login(email: string, password: string) {
    return this.backend.login(email, password)
               .pipe(tap(x => {if (!x.error) {this.loggedUser$.next(x.user); } }));
  }
  
  signup(username: string, email: string, password: string) {
    return this.backend.signup(username, email, password);
  }
  
  signupGoogle() {
    return this.backend.signupGoogle();
  }
  
  logoff(): void {
    console.log('Logging out...');
    this.loggedUser$.next(undefined);
    from(this.backend.logoff())
      .subscribe(x => {
        this.router.navigate(['/auth/login']);
        SharedConstants.successLogout(this.snackBar);
      });
  }
  
  private checkUserInCookies(): void {
    const user: User = this.backend.getUser();
    if (user && user.role === 'authenticated') {
      this.loggedUser$.next(user);
    }
  }
}
