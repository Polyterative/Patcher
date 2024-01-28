import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  from,
  NEVER,
  Observable,
  of,
  ReplaySubject
} from 'rxjs';
import {
  catchError,
  filter,
  switchMap,
  take,
  tap
} from 'rxjs/operators';
import { UserDataHandlerService } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import {
  RichUserModel,
  SimpleUserModel,
  SupabaseLoginResponse,
  SupabaseService,
  SupabaseSignupResponse,
} from '../../backend/supabase.service';


@Injectable()
export class UserManagementService {
  // minimal data of the user, gets loaded super fast from the session
  loggedUser$ = new ReplaySubject<SimpleUserModel | undefined>(1);
  //contains the full data of the user, gets loaded asynchrounously using the data from the session
  loggedUserFullProfile$ = new ReplaySubject<RichUserModel | undefined>();
  
  constructor(
    public snackBar: MatSnackBar,
    public router: Router,
    public backend: SupabaseService,
    public activated: ActivatedRoute,
    public userBoxService: UserDataHandlerService
  ) {
    this.loggedUser$.next(undefined);
    this.loggedUserFullProfile$.next(undefined);
    
    this.checkUserInCookies();
    
    this.loggedUserFullProfile$
      .pipe()
      .subscribe(x => {
        
        if (x) {
          this.userBoxService.store.user$.next({username: x.username});
        } else {
          this.userBoxService.store.user$.next({username: undefined});
        }
      });
    
    // update loggedUserProfile$ when loggedUser$ changes
    this.loggedUser$
      .pipe(
        tap(x => this.loggedUserFullProfile$.next(undefined)),
        filter(x => !!x),
        switchMap(x => x ? this.backend.getRichUserSession$() : of(undefined)),
        //perform good the check of both values
        filter(x => !!x && !!x.username && !!x.email),
      )
      .subscribe(x => this.loggedUserFullProfile$.next(x));
    
    userBoxService.logoffButtonClick$.subscribe(x => {
      this.logoff$();
    });
  }
  
  // high level login function
  login$(email: string, password: string): Observable<SupabaseLoginResponse> {
    return this.backend.login$(email, password)
      .pipe(
        catchError(x => {
          SharedConstants.errorLogin(this.snackBar);
          return NEVER;
        }),
        
        tap(x => {
          this.loggedUser$.next(x.user);
        })
      );
  }
  
  signup(username: string, email: string, password: string): SupabaseSignupResponse {
    return this.backend.signup$(username, email, password);
  }
  
  // signupGoogle() {
  //   return this.backend.signupGoogle();
  // }
  
  // high level logoff function
  logoff$(): void {
    console.log('Logging out...');
    this.loggedUser$.next(undefined);
    from(this.backend.logoff$())
      .subscribe(x => {
        this.router.navigate(['/auth/login']);
        SharedConstants.successLogout(this.snackBar);
      });
  }
  
  // what we want here is to check if the user is logged in, and if so, to get the user data from the backend in the next pipes
  // this is needed to trigger the initial check of the session
  private checkUserInCookies(): void {
    // const user: User = this.backend.getUser$();
    // if (user && user.role === 'authenticated') {
    //   this.loggedUser$.next(user);
    // }
    
    this.backend.getUserSession$().pipe(
      take(1)
    ).subscribe(x => {
        if (x) {
          this.loggedUser$.next(x);
        }
      }
    );
  }
}