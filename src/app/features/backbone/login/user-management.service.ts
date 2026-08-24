import {
  DestroyRef,
  Injectable
} from '@angular/core';
import { MatSnackBar } from "@angular/material/snack-bar";
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  of,
  ReplaySubject,
  Subject
} from 'rxjs';
import {
  catchError,
  startWith,
  switchMap,
  take
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
import { AnalyticsService } from '../analytics-integration/analytics.service';
import { SentryContextService } from '../sentry-integration/sentry-context.service';
import { UserManagementAccountActionsService } from './user-management-account-actions.service';
import { UserManagementAuthFlowService } from './user-management-auth-flow.service';
import {
  OAuthProvider,
  UserManagementContext
} from './user-management-internals';
import { UserManagementSessionSyncService } from './user-management-session-sync.service';


@Injectable({ providedIn: 'root' })
export class UserManagementService extends SubManager {
  // STATE - Private subjects
  private readonly _loggedUser$ = new ReplaySubject<SimpleUserModel | undefined>(1);
  private readonly _loggedUserFullProfile$ = new ReplaySubject<RichUserModel | undefined>(1);
  private readonly _authRestored$ = new BehaviorSubject<boolean>(false);
  private readonly _profileRestored$ = new BehaviorSubject<boolean>(false);
  private readonly _oauthCallbackFailed$ = new Subject<void>();
  private readonly _oauthCallbackSucceeded$ = new Subject<RichUserModel>();
  
  // PUBLIC - Read-only observables
  public readonly loggedUser$ = this._loggedUser$.asObservable();
  public readonly loggedUserFullProfile$ = this._loggedUserFullProfile$.asObservable();
  public readonly authRestored$ = this._authRestored$.asObservable();
  public readonly profileRestored$ = this._profileRestored$.asObservable();
  /** Emits once per OAuth callback attempt that settles to failure (provider denial, timeout, missing session, or a thrown error). */
  public readonly oauthCallbackFailed$ = this._oauthCallbackFailed$.asObservable();
  /** Emits once per OAuth callback attempt that settles to a successful current callback user. */
  public readonly oauthCallbackSucceeded$ = this._oauthCallbackSucceeded$.asObservable();
  public readonly isAdmin$ = this.loggedUser$.pipe(
    startWith(undefined),
    switchMap(user => user ? this._getAdminRole() : of(false))
  );
  
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
    provider: OAuthProvider;
    redirectUrl?: string;
  }>();
  
  /** Emits when handling OAuth callback after redirect */
  public handleOAuthCallbackAction$ = new Subject<void>();
  
  /** Emits when user wants to update their username */
  public updateUsernameAction$ = new Subject<string>();

  /** Emits when user requests to delete only their app data */
  public resetUserDataAction$ = new Subject<void>();

  /** Emits when user requests full permanent account deletion */
  public deleteAccountAction$ = new Subject<void>();
  
  /** Emits new password when user submits the inline password-change form */
  public changePassword$ = new Subject<{
    newPassword: string
  }>();
  
  // Account form toggles
  private readonly _showUsernameForm$ = new BehaviorSubject<boolean>(false);
  public readonly showUsernameForm$ = this._showUsernameForm$.asObservable();
  public toggleUsernameForm$ = new Subject<boolean>();

  private readonly _showPasswordForm$ = new BehaviorSubject<boolean>(false);
  public readonly showPasswordForm$ = this._showPasswordForm$.asObservable();
  public togglePasswordForm$ = new Subject<boolean>();
  
  // Track current user ID for cross-tab sync comparison
  private currentUserId: string | undefined = undefined;

  private readonly context: UserManagementContext;
  
  constructor(
    private snackBar: MatSnackBar,
    private router: Router,
    private backend: SupabaseService,
    private userBoxService: UserDataHandlerService,
    private dialog: MatDialog,
    private sentryContext: SentryContextService,
    private analytics: AnalyticsService,
    private sessionSync: UserManagementSessionSyncService,
    private authFlow: UserManagementAuthFlowService,
    private accountActions: UserManagementAccountActionsService,
    destroyRef: DestroyRef
  ) {
    super(destroyRef);

    this.context = this.createContext();
    this.checkUserInCookies();
    this.sessionSync.register(this.context);
    this.authFlow.register(this.context);
    this.accountActions.register(this.context);
  }

  private createContext(): UserManagementContext {
    return {
      snackBar: this.snackBar,
      router: this.router,
      backend: this.backend,
      userBoxService: this.userBoxService,
      sentryContext: this.sentryContext,
      analytics: this.analytics,
      destroy$: this.destroy$,
      loggedUser$: this.loggedUser$,
      loggedUserFullProfile$: this.loggedUserFullProfile$,
      logoffAction$: this.logoffAction$,
      loginAction$: this.loginAction$,
      resetPasswordAction$: this.resetPasswordAction$,
      ssoLoginAction$: this.ssoLoginAction$,
      handleOAuthCallbackAction$: this.handleOAuthCallbackAction$,
      updateUsernameAction$: this.updateUsernameAction$,
      resetUserDataAction$: this.resetUserDataAction$,
      deleteAccountAction$: this.deleteAccountAction$,
      changePassword$: this.changePassword$,
      toggleUsernameForm$: this.toggleUsernameForm$,
      togglePasswordForm$: this.togglePasswordForm$,
      showUsernameFormSubject$: this._showUsernameForm$,
      showPasswordFormSubject$: this._showPasswordForm$,
      getDialog: () => this.dialog,
      getCurrentUserId: () => this.currentUserId,
      setCurrentUserId: userId => this.currentUserId = userId,
      setProfileRestored: restored => this._profileRestored$.next(restored),
      publishLoggedUser: user => this.publishLoggedUser(user),
      publishSignedInProfile: profile => this.publishSignedInProfile(profile),
      publishSignedOut: () => this.publishSignedOut(),
      publishRestoredProfile: profile => this.publishRestoredProfile(profile),
      publishOAuthCallbackFailed: () => this.publishOAuthCallbackFailed(),
      publishOAuthCallbackSucceeded: user => this.publishOAuthCallbackSucceeded(user),
      showOperationError: error => this.showOperationError(error)
    };
  }

  private publishLoggedUser(user: SimpleUserModel | undefined): void {
    this.currentUserId = user?.id;
    this._loggedUser$.next(user);
    this._authRestored$.next(true);
  }

  private publishSignedInProfile(profile: RichUserModel): void {
    this._loggedUserFullProfile$.next(profile);
    this._profileRestored$.next(true);
    this.publishLoggedUser(profile);
  }

  private publishSignedOut(): void {
    this.currentUserId = undefined;
    this._loggedUser$.next(undefined);
    this._loggedUserFullProfile$.next(undefined);
    this._authRestored$.next(true);
    this._profileRestored$.next(true);
  }

  private publishRestoredProfile(profile: RichUserModel | undefined): void {
    this._loggedUserFullProfile$.next(profile);
    this._profileRestored$.next(true);
  }
  
  private publishOAuthCallbackFailed(): void {
    this._oauthCallbackFailed$.next();
  }

  private publishOAuthCallbackSucceeded(user: RichUserModel): void {
    this._oauthCallbackSucceeded$.next(user);
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
    return this.authFlow.login$(email, password, this.context);
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
    return this.authFlow.resetPassword$(email, this.context);
  }
  
  /**
   * Initiates SSO login with a social provider
   * This will redirect the user to the provider's authentication page
   *
   * @param provider - The OAuth provider (google, apple, github, etc.)
   * @param redirectUrl - Optional custom redirect URL after successful authentication
   */
  loginWithSSO(provider: OAuthProvider, redirectUrl?: string): void {
    this.authFlow.loginWithSSO(provider, redirectUrl, this.context);
  }
  
  /**
   * Handles the OAuth callback after user returns from provider
   * Should be called on the callback page to complete authentication
   */
  handleOAuthCallback(): void {
    this.authFlow.handleOAuthCallback(this.context);
  }
  
  /**
   * Checks if user is logged in by verifying session cookies
   * This triggers the initial session check on service initialization
   */
  private checkUserInCookies(): void {
    this.backend.auth.getUserSession$().pipe(
      take(1),
      catchError(() => of(undefined))
    ).subscribe(x => {
      this.publishLoggedUser(x ?? undefined);
    });
  }
  
  /**
   * Updates the username for the currently logged-in user
   * Works for both email/password and SSO users
   *
   * @param newUsername - The new username to set
   * @returns Observable that completes when username is updated
   */
  updateUsername$(newUsername: string): Observable<void> {
    return this.accountActions.updateUsername$(newUsername, this.context);
  }

  isUsernameAvailable$(username: string): Observable<boolean> {
    return this.accountActions.isUsernameAvailable$(username, this.context);
  }

  isUsernameAvailableForSignup$(username: string): Observable<boolean> {
    return this.backend.auth.isUsernameAvailable$(username);
  }

  updateProfileVisibility$(isPublic: boolean): Observable<void> {
    return this.accountActions.updateProfileVisibility$(isPublic, this.context);
  }

  private showOperationError(error: unknown): void {
    const msg = typeof error === 'object'
      && error !== null
      && 'message' in error
      && typeof error.message === 'string'
      && error.message
      ? error.message
      : SharedConstants.messages.operationFailed;
    SharedConstants.errorCustom(this.snackBar, msg);
  }

  private _getAdminRole(): Observable<boolean> {
    return this.backend.auth.hasAdminRole$();
  }
}
