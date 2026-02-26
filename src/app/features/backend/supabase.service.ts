import {
  EventEmitter,
  Injectable
} from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import {
  AuthError,
  createClient,
  LockFunc,
  navigatorLock,
  User
} from '@supabase/supabase-js';
import {
  from,
  from as rxFrom,
  Observable,
  of,
  ReplaySubject,
  shareReplay,
  throwError
} from 'rxjs';
import {
  catchError,
  map,
  switchMap,
  withLatestFrom
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { Database } from 'src/backend/database.types';
import { environment } from 'src/environments/environment';
import { DbPaths } from './DatabaseStrings';
import { cacheBuster$ } from './supabase.cache';
import {
  CurrentUserModulesOrderConfig,
  CurrentUserModulesOrderDirection,
  CurrentUserModulesOrderKey,
  OAuthProvider,
  RichUserModel,
  SimpleUserModel,
  SupabaseLoginResponse,
  SupabaseSignupResponse,
  SupabaseStorageFile
} from './supabase.types';
import { createAddNamespace } from './supabase-add';
import { createDeleteNamespace } from './supabase-delete';
import { createUpdateNamespace } from './supabase-update';
import { createStorageNamespace } from './supabase-storage';
import { SupabaseQueriesService } from './supabase-queries';
import { createGetNamespace } from './supabase-get';


export type {
  CurrentUserModulesOrderConfig,
  CurrentUserModulesOrderDirection,
  CurrentUserModulesOrderKey,
  OAuthProvider,
  RichUserModel,
  SimpleUserModel,
  SupabaseLoginResponse,
  SupabaseSignupResponse,
  SupabaseStorageFile
};

@Injectable()
export class SupabaseService extends SubManager {
  private authStateSubscription: {
    unsubscribe: () => void
  } | null = null;
  
  constructor(
    public activated: ActivatedRoute,
    public snackBar: MatSnackBar
  ) {
    super();
    // console.clear();
    
    // Listen to auth state changes for cross-tab synchronization
    const {data: authListener} = this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        this.user.logout$.emit();
      } else if (event === 'SIGNED_IN' && session) {
        this.user.login$.emit();
      }
    });
    
    // Store the subscription for cleanup on destroy
    if (authListener?.subscription) {
      this.authStateSubscription = authListener.subscription;
    }
    
    this.add = createAddNamespace(
      this.supabase,
      this.snackBar,
      () => this.getUserSession$()
    );
    
    this.storage = createStorageNamespace(
      this.supabase,
      this.snackBar,
      () => this.getUserSession$()
    );

    this.delete = createDeleteNamespace(
      this.supabase,
      this.snackBar,
      () => this.getUserSession$(),
      (filename: string) => this.storage.deletePanelFile(filename),
      this.defaultPag
    );
    
    this.update = createUpdateNamespace(
      this.supabase,
      this.snackBar,
      () => this.getUserSession$(),
      (id: number) => this.delete.patchConnectionsForPatch(id)
    );
    
    this.queries = new SupabaseQueriesService(
      this.supabase,
      () => this.getUserSession$(),
      this.defaultPag
    );
    
    this.GET = {
      currentUserModules: this.queries.getCurrentUserModules.bind(this.queries),
      modules: this.queries.getModules.bind(this.queries),
      manufacturers: this.queries.getManufacturers.bind(this.queries),
      comments: this.queries.getComments.bind(this.queries),
      tags: this.queries.getTags.bind(this.queries),
      moduleWithId: this.queries.getModuleWithId.bind(this.queries),
      patchConnections: this.queries.getPatchConnections.bind(this.queries),
      patchModuleInstances: this.queries.getPatchModuleInstances.bind(this.queries),
      currentUserComments: this.queries.getCurrentUserComments.bind(this.queries),
      patches: this.queries.getPatches.bind(this.queries),
      rackWithId: this.queries.getRackWithId.bind(this.queries),
      racksMinimal: this.queries.getRacksMinimal.bind(this.queries)
    };
    
    this.get = createGetNamespace(
      this.supabase,
      this.queries,
      this.defaultPag,
      () => this.getUserSession$()
    );
  }
  
  override ngOnDestroy(): void {
    // Clean up auth state listener
    if (this.authStateSubscription) {
      this.authStateSubscription.unsubscribe();
    }
    super.ngOnDestroy();
  }
  
  
  user = {
    user$: new ReplaySubject(),
    login$: new EventEmitter<void>(),
    logout$: new EventEmitter<void>()
  };
  private defaultPag = 20;
  
  readonly GET!: {
    // infer types and return types
    currentUserModules: typeof SupabaseQueriesService.prototype.getCurrentUserModules;
    modules: typeof SupabaseQueriesService.prototype.getModules;
    manufacturers: typeof SupabaseQueriesService.prototype.getManufacturers;
    comments: typeof SupabaseQueriesService.prototype.getComments;
    tags: typeof SupabaseQueriesService.prototype.getTags;
    moduleWithId: typeof SupabaseQueriesService.prototype.getModuleWithId;
    patchConnections: typeof SupabaseQueriesService.prototype.getPatchConnections;
    patchModuleInstances: typeof SupabaseQueriesService.prototype.getPatchModuleInstances;
    currentUserComments: typeof SupabaseQueriesService.prototype.getCurrentUserComments;
    patches: typeof SupabaseQueriesService.prototype.getPatches;
    rackWithId: typeof SupabaseQueriesService.prototype.getRackWithId;
    racksMinimal: typeof SupabaseQueriesService.prototype.getRacksMinimal;
  };
  
  private queries!: SupabaseQueriesService;
  readonly cacheResetter$ = cacheBuster$;
  
  /**
   * Custom lock wrapper to prevent NavigatorLockAcquireTimeoutError.
   * This fixes the issue where Supabase's _autoRefreshTokenTick uses 0ms timeout,
   * which causes lock acquisition to fail when multiple locks are requested simultaneously.
   * See: https://github.com/supabase/auth-js/issues/873
   */
  private customLock: LockFunc = (name, acquireTimeout, fn) => {
    // Ensure timeout is at least 1ms to avoid the ifAvailable flag issue
    return navigatorLock(name, acquireTimeout || 1, fn);
  };
  
  private supabase = createClient<Database>(
    environment.supabase.url,
    environment.supabase.key,
    {
      auth: {
        lock: this.customLock
      }
    }
  );
  readonly get!: ReturnType<typeof createGetNamespace>;
  
  readonly add!: ReturnType<typeof createAddNamespace>;
  readonly delete!: ReturnType<typeof createDeleteNamespace>;
  readonly update!: ReturnType<typeof createUpdateNamespace>;
  storage!: ReturnType<typeof createStorageNamespace>;


  login$(email: string, password: string): Observable<SupabaseLoginResponse> {
    const params$ = of('')
      .pipe(withLatestFrom(this.activated.queryParams), map(([x, data]) => data));
    
    return rxFrom(this.supabase.auth.signInWithPassword({
      email,
      password
    }))
      .pipe(
        switchMap(authResponse => {
            const updateConfirmed$ = rxFrom(
              this.supabase
                .from(DbPaths.profiles)
                .update({
                  confirmed: true
                })
                .filter('id', 'eq', authResponse.data.user.id)
            )
              .pipe(map(z => authResponse));
          
          return authResponse.error ? of(authResponse) : updateConfirmed$.pipe(
              map(x => authResponse)
            );
          }
        ),
        withLatestFrom(params$),
        switchMap(([authResponse, params]) => {
            // now select the user profile of the current user
          
          return rxFrom(
              this.supabase
                .from(DbPaths.profiles)
                .select('username')
                .filter('id', 'eq', authResponse.data.user.id)
            )
              .pipe(
                map(usernameGetterResponse => ({
                  returnUrl: params.returnUrl,
                  user: {
                    ...authResponse.data.user,
                    username: usernameGetterResponse.data[0].username
                  }
                }))
              )
          }
        ),
      );
  }
  
  /**
   * Initiates OAuth login with a social provider (Google, Apple, GitHub, etc.)
   * This will redirect the user to the provider's login page
   * After successful authentication, the user will be redirected to the callback URL
   *
   * @param provider - The OAuth provider to use
   * @param redirectTo - Optional custom redirect URL after successful authentication
   * @returns Observable that completes after initiating the OAuth flow
   */
  loginWithOAuth$(provider: OAuthProvider, redirectTo?: string): Observable<void> {
    const redirectUrl = redirectTo || `${ window.location.origin }/auth/callback`;
    
    return from(
      this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          // Request email scope to ensure we get the user's email
          scopes: 'email'
        }
      })
    ).pipe(
      map((response) => {
        if (response.error) {
          throw response.error;
        }
        // OAuth flow initiated successfully
        // User will be redirected to provider's login page
        return void 0;
      })
    );
  }
  
  /**
   * Handles the OAuth callback after user returns from provider
   * This should be called on the callback page to complete the authentication
   *
   * @returns Observable with the authenticated user or null if authentication failed
   */
  handleOAuthCallback$(): Observable<RichUserModel | null> {
    return from(this.supabase.auth.getSession()).pipe(
      switchMap((sessionResponse) => {
        if (sessionResponse.error || !sessionResponse.data.session) {
          return of(null);
        }
        
        const user = sessionResponse.data.session.user;
        
        // Check if user has a profile/username already
        return this.getRichUserSession$().pipe(
          switchMap((richUser) => {
            // If no username exists, this is a new OAuth user
            if (!richUser || !richUser.username) {
              // Create profile entry if it doesn't exist
              return this.ensureOAuthUserProfile$(user).pipe(
                map(() => richUser)
              );
            }
            return of(richUser);
          })
        );
      })
    );
  }
  
  /**
   * Ensures an OAuth user has a profile entry
   * Creates a profile with a temporary username that the user can change later
   *
   * @param user - The authenticated Supabase user
   * @returns Observable that completes when profile is created/verified
   */
  private ensureOAuthUserProfile$(user: User): Observable<void> {
    const email = user.email || '';
    // Generate a temporary username from email or user_id
    const tempUsername = email.split('@')[0] || `user_${ user.id.substring(0, 8) }`;
    
    return rxFrom(
      this.supabase
        .from(DbPaths.profiles)
        .upsert({
          id: user.id,
          email: email,
          username: tempUsername,
          confirmed: true,
          created_at: user.created_at,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
    ).pipe(
      map(() => void 0)
    );
  }
  
  signup$(username: string, email: string, password: string): SupabaseSignupResponse {
    return from(this.supabase.auth.signUp({
      email,
      password
    }))
      .pipe(switchMap(x => x.error ? of(x.data) : this.updateUserProfile(email, password, username)));
  }
  
  getUserSession$(): Observable<SimpleUserModel | null> {
    return from(rxFrom(this.supabase.auth.getSession())
    )
      .pipe(
        switchMap(sessionOutput => {
          
          // perform additional checks,and if data is not good to throw error
          if (sessionOutput.data.session == null) {
            // console.log('User is not logged in')
            return of(null);
          }
          
          // console.log('User is currently logged in')
          
          const userFullData: SimpleUserModel = {
            id: sessionOutput.data.session.user.id,
            email: sessionOutput.data.session.user.email,
            created_at: sessionOutput.data.session.user.created_at,
            updated_at: sessionOutput.data.session.user.updated_at
          };
          
          return of(userFullData);
        }),
        shareReplay(1)
      );
  }
  
  getRichUserSession$(): Observable<RichUserModel | null> {
    return this.getUserSession$()
      .pipe(
        switchMap(simpleUserData => {
          if (simpleUserData == null) {
            return of(null);
          }
          // TODO in some situation this is getting called twice, and it should not,for example when logging in
          return this.getUserNameFromDatabase(simpleUserData.id)
            .pipe(
              map(usernameGetterResponse => ({
                ...simpleUserData,
                username: usernameGetterResponse.data[0].username,
                email: simpleUserData.email // Ensure email is retained
              }))
            );
        }),
        shareReplay(1)
      );
  }
  
  private getUserNameFromDatabase(userId: string) {
    return rxFrom(
      this.supabase
        .from(DbPaths.profiles)
        .select('username')
        .filter('id', 'eq', userId)
    );
  }
  
  logoff$(): Observable<{
    error: AuthError | null
  }> {
    // burst the caches, all of them
    this.burstAllCaches();
    return from(this.supabase.auth.signOut())
  }
  
  private errorMsg() {
    return SharedConstants.errorHandlerOperation(this.snackBar);
  }

  private burstAllCaches() {
    cacheBuster$.next([
      "comments",
      "modules",
      "currentUserModules",
      "moduleWithId",
      "manufacturers",
      "currentUserModules",
      "patchConnections",
      "patchModuleInstances",
      "rackWithId",
      "patches",
      "currentUserComments"
    ]);
  }

// logs in, updates profile, logs out
  private updateUserProfile(email: string, password: string, username: string): Observable<SupabaseLoginResponse> {
    return this.login$(email, password)
      .pipe(
        switchMap(x => rxFrom(
            this.supabase
              .from(DbPaths.profiles)
              .update({
                confirmed: true,
                username
              })
              .eq('id', x.user.id)
          )
            .pipe(
              map(() => x),
              switchMap(x => rxFrom(this.supabase.auth.signOut())
                .pipe(map(_ => x)))
            )
        )
      );
  }
  
  
  /**
   * Handles both sending a password reset email and resetting the password with a token.
   * If newPassword is provided, performs a token-based password reset. Otherwise, sends a reset email.
   * @param emailOrToken The email address (for email-based) or token (for token-based).
   * @param newPassword The new password to set (for token-based reset).
   */
  resetPassword$(emailOrToken: string, newPassword?: string): Observable<void> {
    if (newPassword) {
      // Token-based password reset
      return from(
        this.supabase.auth.updateUser({
          password: newPassword
        })
      ).pipe(
        map((response) => {
          // Check for errors in the response
          if (response.error) {
            throw this.createPasswordResetError(response.error);
          }
          console.log(SharedConstants.messages.resetPassword?.resetPasswordTitle);
        }),
        catchError((error) => {
          console.error(SharedConstants.messages.resetPassword?.resetFailed, error);
          // Parse and format the error
          const formattedError = this.createPasswordResetError(error);
          return throwError(() => formattedError);
        })
      );
    } else {
      // Email-based password reset
      if (!this.isValidEmail(emailOrToken)) {
        return throwError(() => new Error('Invalid email address.'));
      }
      const redirectTo = `${ window.location.origin }/auth/reset-password`;
      return from(this.supabase.auth.resetPasswordForEmail(emailOrToken, {redirectTo})).pipe(
        map((response) => {
          if (response.error) {
            throw new PasswordResetError('Failed to send password reset email.', response.error.message);
          }
        }),
        catchError((error) => {
          console.error('Password reset request failed:', error);
          return throwError(() => error);
        })
      );
    }
  }
  
  /**
   * Creates a formatted error from Supabase error responses
   */
  private createPasswordResetError(error: any): PasswordResetError {
    // Handle various error formats from Supabase
    let errorCode = error?.error_code || error?.code || error?.name;
    let message = error?.msg || error?.message || error?.error_description;
    let statusCode = error?.code;
    
    // Map error codes to user-friendly messages
    const errorMessages = SharedConstants.messages.resetPassword;
    
    if (errorCode === 'same_password' || message?.toLowerCase().includes('same password')) {
      return new PasswordResetError(errorMessages.samePassword, errorCode, statusCode);
    }
    
    if (errorCode === 'weak_password' || message?.toLowerCase().includes('weak password')) {
      return new PasswordResetError(errorMessages.weakPassword, errorCode, statusCode);
    }
    
    if (errorCode === 'invalid_credentials' || errorCode === 'invalid_grant' ||
      message?.toLowerCase().includes('invalid') || message?.toLowerCase().includes('expired')) {
      return new PasswordResetError(errorMessages.invalidSession, errorCode, statusCode);
    }
    
    if (errorCode === 'network_error' || message?.toLowerCase().includes('network') ||
      message?.toLowerCase().includes('fetch')) {
      return new PasswordResetError(errorMessages.networkError, errorCode, statusCode);
    }
    
    // Default error message
    const defaultMessage = message || errorMessages.unknownError;
    return new PasswordResetError(defaultMessage, errorCode, statusCode);
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private isValidPassword(password: string): boolean {
    return password.length >= 8; // Add more complexity checks if needed
  }
  
  /**
   * Updates the username in the profiles table for the current user
   * This works for both email/password and SSO users
   *
   * @param userId - The user ID to update
   * @param newUsername - The new username to set
   * @returns Observable that completes when username is updated
   */
  updateUsername$(userId: string, newUsername: string): Observable<void> {
    const trimmedUsername = newUsername.trim();
    
    if (!trimmedUsername || trimmedUsername.length < 3) {
      return throwError(() => new Error('Username must be at least 3 characters long.'));
    }
    
    if (trimmedUsername.length > 30) {
      return throwError(() => new Error('Username must be 30 characters or less.'));
    }
    
    // Check if username contains only valid characters (alphanumeric, underscore, hyphen)
    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(trimmedUsername)) {
      return throwError(() => new Error('Username can only contain letters, numbers, underscores, and hyphens.'));
    }
    
    return rxFrom(
      this.supabase
        .from(DbPaths.profiles)
        .update({
          username: trimmedUsername,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    ).pipe(
      map((response) => {
        if (response.error) {
          // Check for unique constraint violation
          if (response.error.code === '23505' || response.error.message?.includes('unique')) {
            throw new Error('This username is already taken. Please choose another one.');
          }
          throw new Error(response.error.message || 'Failed to update username.');
        }
        return void 0;
      }),
      catchError((error) => {
        console.error('Username update failed:', error);
        return throwError(() => error);
      })
    );
  }
  
  /**
   * Changes the password for the currently authenticated user.
   * Requires an active session — this is for in-app password change, not password reset.
   *
   * @param newPassword - The new password to set (min 8 characters)
   * @returns Observable that completes when the password is updated
   */
  updatePassword$(newPassword: string): Observable<void> {
    return from(
      this.supabase.auth.updateUser({password: newPassword})
    ).pipe(
      map((response) => {
        if (response.error) {
          throw new Error(response.error.message || 'Password update failed.');
        }
        return void 0;
      }),
      catchError((error) => {
        console.error('Password change failed:', error);
        return throwError(() => error);
      })
    );
  }
}

class PasswordResetError extends Error {
  constructor(
    public message: string,
    public errorCode?: string,
    public statusCode?: number,
    public details?: string
  ) {
    super(message);
    this.name = 'PasswordResetError';
  }
}