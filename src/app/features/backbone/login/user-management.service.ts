import { Injectable } from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from '@angular/router';
import {
  from,
  NEVER,
  ReplaySubject,
  Subject
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
  SupabaseService,
  SupabaseSignupResponse,
} from '../../backend/supabase.service';


@Injectable()
export class UserManagementService extends SubManager {
  // STATE - Private subjects
  private _loggedUser$ = new ReplaySubject<SimpleUserModel | undefined>(1);
  private _loggedUserFullProfile$ = new ReplaySubject<RichUserModel | undefined>(1);
  
  // PUBLIC - Read-only observables
  public readonly loggedUser$ = this._loggedUser$.asObservable();
  public readonly loggedUserFullProfile$ = this._loggedUserFullProfile$.asObservable();
  
  // ACTIONS - Event subjects
  public logoffAction$ = new Subject<void>();
  public loginAction$ = new Subject<{
    email: string;
    password: string
  }>();
  public resetPasswordAction$ = new Subject<string>();
  
  // Track current user ID for cross-tab sync comparison
  private currentUserId: string | undefined = undefined;
  
  constructor(
    public snackBar: MatSnackBar,
    public router: Router,
    public backend: SupabaseService,
    public userBoxService: UserDataHandlerService
  ) {
    super();
    
    this.checkUserInCookies();
    
    this.initializeUserBoxHandler();
    this.initializeProfileFetchHandler();
    this.initializeUserBoxLogoffHandler();
    this.initializeCrossTabLogoutHandler();
    this.initializeCrossTabLoginHandler();
    this.initializeLoginHandler();
    this.initializeLogoffHandler();
    this.initializeResetPasswordHandler();
  }
  
  private initializeUserBoxHandler(): void {
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
  }
  
  private initializeProfileFetchHandler(): void {
    // Update loggedUserProfile$ when loggedUser$ changes
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
        switchMap(([_user]) =>
          this.backend.getRichUserSession$().pipe(
            filter(x => !!x && !!x.username && !!x.email)
          )
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(x => {
        this._loggedUserFullProfile$.next(x);
      });
  }
  
  private initializeUserBoxLogoffHandler(): void {
    this.userBoxService.logoffButtonClick$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.logoffAction$.next();
    });
  }
  
  private initializeCrossTabLogoutHandler(): void {
    // Listen to logout events from Supabase for cross-tab synchronization
    // This enables cross-tab logout without showing the success message again
    this.backend.user.logout$.pipe(
      tap(() => {
        this._loggedUser$.next(undefined);
        this._loggedUserFullProfile$.next(undefined);
      }),
      filter(() => !this.router.url.includes('/auth/login')),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }
  
  private initializeCrossTabLoginHandler(): void {
    // Listen to login events from Supabase for cross-tab synchronization
    // This enables cross-tab login sync when user logs in from another tab
    this.backend.user.login$.pipe(
      switchMap(() => this.backend.getUserSession$()),
      filter(user => !!user),
      // Only update if we're currently logged out or it's a different user
      // This prevents unnecessary updates when already logged in as the same user
      filter(user => !this.currentUserId || this.currentUserId !== user!.id),
      tap(user => {
        this._loggedUser$.next(user);
      }),
      filter(() => this.router.url.includes('/auth/login')),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.router.navigate(['/']);
    });
  }
  
  private initializeLoginHandler(): void {
    this.loginAction$.pipe(
      switchMap(({email, password}) => this.backend.login$(email, password).pipe(
        catchError(() => {
          SharedConstants.errorLogin(this.snackBar);
          return NEVER;
        })
      )),
      tap(x => {
        // Emit the full user data directly to avoid duplicate database calls
        // The login$ already fetches the username, so we have complete data
        this._loggedUser$.next(x.user);
        this._loggedUserFullProfile$.next(x.user);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  private initializeLogoffHandler(): void {
    this.logoffAction$.pipe(
      switchMap(() => from(this.backend.logoff$()).pipe(
        catchError((error) => {
          console.error('Logout failed:', error);
          SharedConstants.errorCustom(this.snackBar, SharedConstants.messages.operationFailed);
          return NEVER;
        })
      )),
      tap(() => {
        // State will be cleared by the auth state change listener
        // which triggers the cross-tab logout handler
        this.router.navigate(['/auth/login']);
        SharedConstants.successLogout(this.snackBar);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  private initializeResetPasswordHandler(): void {
    this.resetPasswordAction$.pipe(
      switchMap(email => this.backend.resetPassword$(email).pipe(
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
        })
      )),
      tap(() => SharedConstants.successCustom(this.snackBar, SharedConstants.messages.passwordResetEmailSent)),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  /**
   * @deprecated This should be refactored to use a signup$ action subject
   */
  signup(username: string, email: string, password: string): SupabaseSignupResponse {
    return this.backend.signup$(username, email, password);
  }
  
  /**
   * High-level login function
   * @deprecated Components should eventually use the loginAction$ subject directly
   */
  login$(email: string, password: string) {
    // For backward compatibility, return the backend observable directly
    // This will be handled by the component's subscription
    return this.backend.login$(email, password).pipe(
      catchError(() => {
        SharedConstants.errorLogin(this.snackBar);
        return NEVER;
      }),
      tap(x => {
        this._loggedUser$.next(x.user);
        this._loggedUserFullProfile$.next(x.user);
      })
    );
  }
  
  /**
   * High-level logoff function
   * Triggers the logout action subject
   */
  logoff$(): void {
    this.logoffAction$.next();
  }
  
  /**
   * Sends a password reset email to the user
   * @deprecated Components should eventually use the resetPasswordAction$ subject directly
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
          this._loggedUser$.next(x);
        } else {
          // explicitly set the user to undefined since we know that the user is not logged in for sure
          this._loggedUser$.next(undefined);
      }
      }
    );
  }
}