import { Injectable } from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import {
  from,
  NEVER,
  Observable,
  ReplaySubject
} from 'rxjs';
import {
  catchError,
  filter,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
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
export class UserManagementService extends SubManager {
  // minimal data of the user, gets loaded super fast from the session
  loggedUser$ = new ReplaySubject<SimpleUserModel | undefined>(1);
  //contains the full data of the user, gets loaded asynchrounously using the data from the session
  loggedUserFullProfile$ = new ReplaySubject<RichUserModel | undefined>(1);
  
  // Track current user ID for cross-tab sync comparison
  private currentUserId: string | undefined = undefined;
  
  constructor(
    public snackBar: MatSnackBar,
    public router: Router,
    public backend: SupabaseService,
    public activated: ActivatedRoute,
    public userBoxService: UserDataHandlerService
  ) {
    super();
    // these should not be activated here, as the undefinedness should be checked on the cookie check
    // this.loggedUser$.next(undefined);
    // this.loggedUserFullProfile$.next(undefined);
    
    this.checkUserInCookies();
    
    this.loggedUserFullProfile$
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        
        if (x) {
          this.userBoxService.store.user$.next({username: x.username});
        } else {
          this.userBoxService.store.user$.next({username: undefined});
        }
      });

    // update loggedUserProfile$ when loggedUser$ changes
    // This handles session restoration (page loads) where we have a user from session
    // but need to fetch the full profile. During login, the full profile is set directly.
    this.loggedUser$
      .pipe(
        tap((user) => {
          this.currentUserId = user?.id;
        }),
        filter(x => !!x),
        // Check if we already have a profile for this user
        withLatestFrom(this.loggedUserFullProfile$.pipe(startWith(undefined))),
        // Only fetch if we don't have a profile or it's for a different user
        filter(([user, profile]) => !profile || profile.id !== user.id),
        switchMap(([user]) =>
          this.backend.getRichUserSession$().pipe(
            filter(x => !!x && !!x.username && !!x.email)
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        this.loggedUserFullProfile$.next(x);
      });
    
    userBoxService.logoffButtonClick$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.logoff$();
    });
    
    // Listen to logout events from Supabase for cross-tab synchronization
    // This enables cross-tab logout without showing the success message again
    this.backend.user.logout$.pipe(
      tap(() => {
        this.loggedUser$.next(undefined);
        this.loggedUserFullProfile$.next(undefined);
      }),
      filter(() => !this.router.url.includes('/auth/login')),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
    
    // Listen to login events from Supabase for cross-tab synchronization
    // This enables cross-tab login sync when user logs in from another tab
    this.backend.user.login$.pipe(
      switchMap(() => this.backend.getUserSession$()),
      filter(user => !!user),
      // Only update if we're currently logged out or it's a different user
      // This prevents unnecessary updates when already logged in as the same user
      filter(user => !this.currentUserId || this.currentUserId !== user!.id),
      tap(user => {
        this.loggedUser$.next(user);
      }),
      filter(() => this.router.url.includes('/auth/login')),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.router.navigate(['/']);
    });
  }
  
  // high level login function
  login$(email: string, password: string): Observable<SupabaseLoginResponse> {
    return this.backend.login$(email, password)
      .pipe(
        catchError(() => {
          SharedConstants.errorLogin(this.snackBar);
          return NEVER;
        }),
        tap(x => {
          // Emit the full user data directly to avoid duplicate database calls
          // The login$ already fetches the username, so we have complete data
          this.loggedUser$.next(x.user);
          this.loggedUserFullProfile$.next(x.user);
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
    from(this.backend.logoff$())
      .pipe(
        take(1),
        catchError((error) => {
          console.error('Logout failed:', error);
          SharedConstants.errorCustom(this.snackBar, SharedConstants.messages.operationFailed);
          return NEVER;
        })
      )
      .subscribe(() => {
        // State will be cleared by the auth state change listener
        // which triggers the cross-tab logout handler
        this.router.navigate(['/auth/login']);
        SharedConstants.successLogout(this.snackBar);
      });
  }
  
  /**
   * Sends a password reset email to the user (for both authenticated and unauthenticated users).
   * @param email The email address of the user.
   */
  resetPassword$(email: string) {
    return this.backend.resetPassword$(email).pipe(
      catchError((error) => {
        if (error?.error_code === 'over_email_send_rate_limit') {
          SharedConstants.errorCustom(
            this.snackBar,
            SharedConstants.messages.overEmailSendRateLimit
          );
        } else {
          SharedConstants.errorCustom(
            this.snackBar,
            SharedConstants.messages.operationFailed
          );
        }
        return NEVER;
      }),
      tap(() => SharedConstants.successCustom(this.snackBar, SharedConstants.messages.passwordResetEmailSent))
    );
  }
  
  // what we want here is to check if the user is logged in, and if so, to get the user data from the backend in the next pipes
  // this is needed to trigger the initial check of the session
  private checkUserInCookies(): void {
    this.backend.getUserSession$().pipe(
      take(1)
    ).subscribe(x => {
        if (x) {
          // explicitly set the user to x since we know that the user is logged in for sure
          this.loggedUser$.next(x);
        } else {
          // explicitly set the user to undefined since we know that the user is not logged in for sure
          this.loggedUser$.next(undefined);
      }
      }
    );
  }
}