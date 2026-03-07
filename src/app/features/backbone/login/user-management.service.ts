import { Injectable } from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  from,
  NEVER,
  Observable,
  ReplaySubject,
  Subject,
  throwError
} from 'rxjs';
import {
  catchError,
  filter,
  map,
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
import { MatDialog } from '@angular/material/dialog';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';


@Injectable()
export class UserManagementService extends SubManager {
  // STATE - Private subjects
  private _loggedUser$ = new ReplaySubject<SimpleUserModel | undefined>(1);
  private _loggedUserFullProfile$ = new ReplaySubject<RichUserModel | undefined>(1);
  
  // PUBLIC - Read-only observables
  public readonly loggedUser$ = this._loggedUser$.asObservable();
  public readonly loggedUserFullProfile$ = this._loggedUserFullProfile$.asObservable();
  
  // ACTIONS - Event subjects for triggering operations
  /** Emits when user initiates logout */
  public logoffAction$ = new Subject<void>();
  
  /** Emits login credentials when user initiates login */
  public loginAction$ = new Subject<{
    email: string;
    password: string
  }>();
  
  /** Emits email address when user requests password reset */
  public resetPasswordAction$ = new Subject<string>();
  
  /** Emits when user initiates SSO login with a provider */
  public ssoLoginAction$ = new Subject<{
    provider: 'google' | 'apple' | 'github' | 'facebook' | 'azure' | 'twitter';
    redirectUrl?: string;
  }>();
  
  /** Emits when handling OAuth callback after redirect */
  public handleOAuthCallbackAction$ = new Subject<void>();
  
  /** Emits when user wants to update their username */
  public updateUsernameAction$ = new Subject<string>();

  /** Emits when user requests to delete all their data and account */
  public deleteAccountAction$ = new Subject<void>();
  
  /** Emits new password when user submits the inline password-change form */
  public changePassword$ = new Subject<{
    newPassword: string
  }>();
  
  // Password form toggle
  private _showPasswordForm$ = new BehaviorSubject<boolean>(false);
  public readonly showPasswordForm$ = this._showPasswordForm$.asObservable();
  public togglePasswordForm$ = new Subject<boolean>();
  
  // Track current user ID for cross-tab sync comparison
  private currentUserId: string | undefined = undefined;
  
  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private backend: SupabaseService,
    private userBoxService: UserDataHandlerService,
    private dialog: MatDialog
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
    this.initializeSSOLoginHandler();
    this.initializeOAuthCallbackHandler();
    this.initializeUpdateUsernameHandler();
    this.initializeDeleteAccountHandler();
    this.initializeChangePasswordHandler();
    this.initializeTogglePasswordFormHandler();
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
          this.backend.auth.getRichUserSession$().pipe(
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
    // Note: Navigation is NOT handled here - it's the responsibility of the component
    // that initiated the login (e.g., login page navigates to /user/area)
    this.backend.user.login$.pipe(
      switchMap(() => this.backend.auth.getUserSession$()),
      filter(user => !!user),
      // Only update if we're currently logged out or it's a different user
      // This prevents unnecessary updates when already logged in as the same user
      filter(user => !this.currentUserId || this.currentUserId !== user!.id),
      tap(user => {
        this._loggedUser$.next(user);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  private initializeLoginHandler(): void {
    this.loginAction$.pipe(
      switchMap(({email, password}) => this.backend.auth.login$(email, password).pipe(
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
      switchMap(() => from(this.backend.auth.logoff$()).pipe(
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
      switchMap(email => this.backend.auth.resetPassword$(email).pipe(
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
  
  private initializeSSOLoginHandler(): void {
    this.ssoLoginAction$.pipe(
      switchMap(({provider, redirectUrl}) => this.backend.auth.loginWithOAuth$(provider, redirectUrl).pipe(
        catchError((error) => {
          console.error('SSO login failed:', error);
          SharedConstants.errorCustom(
            this.snackBar,
            'Social login failed. Please try again.'
          );
          return NEVER;
        })
      )),
      // OAuth redirect happens automatically, no further action needed
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  private initializeOAuthCallbackHandler(): void {
    this.handleOAuthCallbackAction$.pipe(
      switchMap(() => this.backend.auth.handleOAuthCallback$().pipe(
        catchError((error) => {
          console.error('OAuth callback handling failed:', error);
          SharedConstants.errorCustom(
            this.snackBar,
            'Authentication failed. Please try again.'
          );
          return NEVER;
        })
      )),
      filter(user => !!user),
      tap(user => {
        this._loggedUser$.next(user);
        this._loggedUserFullProfile$.next(user);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  /**
   * @deprecated This should be refactored to use a signup$ action subject
   */
  signup(username: string, email: string, password: string): SupabaseSignupResponse {
    return this.backend.auth.signup$(username, email, password);
  }
  
  /**
   * High-level login function
   * @deprecated Components should eventually use the loginAction$ subject directly
   */
  login$(email: string, password: string) {
    // For backward compatibility, return the backend observable directly
    // This will be handled by the component's subscription
    return this.backend.auth.login$(email, password).pipe(
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
    return this.backend.auth.resetPassword$(email).pipe(
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
  
  /**
   * Initiates SSO login with a social provider
   * This will redirect the user to the provider's authentication page
   *
   * @param provider - The OAuth provider (google, apple, github, etc.)
   * @param redirectUrl - Optional custom redirect URL after successful authentication
   */
  loginWithSSO(provider: 'google' | 'apple' | 'github' | 'facebook' | 'azure' | 'twitter', redirectUrl?: string): void {
    this.ssoLoginAction$.next({provider, redirectUrl});
  }
  
  /**
   * Handles the OAuth callback after user returns from provider
   * Should be called on the callback page to complete authentication
   */
  handleOAuthCallback(): void {
    this.handleOAuthCallbackAction$.next();
  }
  
  /**
   * Checks if user is logged in by verifying session cookies
   * This triggers the initial session check on service initialization
   */
  private checkUserInCookies(): void {
    this.backend.auth.getUserSession$().pipe(
      take(1)
    ).subscribe(x => {
      if (x) {
        // Explicitly set the user since we know they are logged in
        this._loggedUser$.next(x);
      } else {
        // Explicitly set undefined since we know they are not logged in
        this._loggedUser$.next(undefined);
      }
    });
  }
  
  private initializeUpdateUsernameHandler(): void {
    this.updateUsernameAction$.pipe(      withLatestFrom(this.loggedUserFullProfile$),
      filter(([_, profile]) => !!profile),
      switchMap(([newUsername, profile]) =>
        this.backend.auth.updateUsername$(profile!.id, newUsername).pipe(
          map(() => newUsername),
          catchError((error) => {
            const errorMessage = error?.message || SharedConstants.messages.operationFailed;
            SharedConstants.errorCustom(this.snackBar, errorMessage);
            return NEVER;
          })
        )
      ),
      // Refresh the user profile after successful update
      switchMap((newUsername) => this.backend.auth.getRichUserSession$().pipe(map(profile => ({profile, newUsername})))),
      filter(({profile}) => !!profile),
      tap(({profile, newUsername}) => {
        this._loggedUserFullProfile$.next(profile);
        SharedConstants.successCustom(this.snackBar, `Username changed to "${ newUsername }" — your profile has been synced.`);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  /**
   * Updates the username for the currently logged-in user
   * Works for both email/password and SSO users
   *
   * @param newUsername - The new username to set
   * @returns Observable that completes when username is updated
   */
  updateUsername$(newUsername: string): Observable<void> {
    return this.loggedUserFullProfile$.pipe(
      take(1),
      switchMap(profile => {
        if (!profile) {
          SharedConstants.errorCustom(this.snackBar, 'Unable to save: user session not found. Please refresh and try again.');
          return throwError(() => new Error('No user profile available'));
        }
        return this.backend.auth.updateUsername$(profile.id, newUsername).pipe(
          catchError((error) => {
            const errorMessage = error?.message || SharedConstants.messages.operationFailed;
            SharedConstants.errorCustom(this.snackBar, errorMessage);
            return throwError(() => error);
          })
        );
      }),
      // Refresh the user profile after successful update
      switchMap(() => this.backend.auth.getRichUserSession$()),
      filter(x => !!x),
      tap(updatedProfile => {
        this._loggedUserFullProfile$.next(updatedProfile);
        SharedConstants.successCustom(this.snackBar, `Username changed to "${ newUsername }" — your profile has been synced.`);
      }),
      map(() => void 0)
    );
  }

  private initializeDeleteAccountHandler(): void {
    this.deleteAccountAction$.pipe(
      switchMap(() => {
        const dialogData: ConfirmDialogDataInModel = {
          title: 'Delete all your data',
          description: 'This will permanently delete all your patches, racks, collections, and comments. This cannot be undone. You will be signed out immediately after.\n\nNote: your login credentials will remain active — contact support if you need full account removal.',
          positive: { label: 'Delete my data', theme: 'warning' },
          negative: { label: 'Cancel', theme: 'primary' }
        };
        return this.dialog.open<ConfirmDialogComponent, ConfirmDialogDataInModel, ConfirmDialogDataOutModel>(
          ConfirmDialogComponent,
          { data: dialogData, disableClose: true, width: '36rem' }
        ).afterClosed();
      }),
      filter((result): result is ConfirmDialogDataOutModel => !!result?.answer),
      switchMap(() => this.backend.delete.allUserData().pipe(
        catchError((error) => {
          console.error('Data deletion failed:', error);
          SharedConstants.errorCustom(this.snackBar, 'Data deletion failed. Please try again or contact support.');
          return NEVER;
        })
      )),
      tap(() => {
        this._loggedUser$.next(undefined);
        this._loggedUserFullProfile$.next(undefined);
      }),
      switchMap(() => from(this.backend.auth.logoff$()).pipe(
        catchError(() => NEVER)
      )),
      tap(() => {
        SharedConstants.successCustom(this.snackBar, 'All your data has been deleted. You have been signed out.');
        this.router.navigate(['/auth/login']);
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  private initializeTogglePasswordFormHandler(): void {
    this.togglePasswordForm$.pipe(
      tap(show => this._showPasswordForm$.next(show)),
      takeUntil(this.destroy$)
    ).subscribe();
  }
  
  private initializeChangePasswordHandler(): void {
    this.changePassword$.pipe(
      switchMap(({newPassword}) =>
        this.backend.auth.updatePassword$(newPassword).pipe(
          catchError((error) => {
            const msg = error?.message || SharedConstants.messages.operationFailed;
            SharedConstants.errorCustom(this.snackBar, msg);
            return NEVER;
          })
        )
      ),
      tap(() => {
        this._showPasswordForm$.next(false);
        SharedConstants.successCustom(this.snackBar, 'Password updated successfully.');
      }),
      takeUntil(this.destroy$)
    ).subscribe();
  }
}