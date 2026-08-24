import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  Observable,
  Subject
} from 'rxjs';
import { UserDataHandlerService } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import {
  RichUserModel,
  SimpleUserModel,
  SupabaseService
} from '../../backend/supabase.service';
import { AnalyticsService } from '../analytics-integration/analytics.service';
import { SentryContextService } from '../sentry-integration/sentry-context.service';

export type OAuthProvider = 'google' | 'apple' | 'github' | 'facebook' | 'azure' | 'twitter';

export interface UserManagementContext {
  snackBar: MatSnackBar;
  router: Router;
  backend: SupabaseService;
  userBoxService: UserDataHandlerService;
  sentryContext: SentryContextService;
  analytics: AnalyticsService;
  destroy$: Observable<void>;
  loggedUser$: Observable<SimpleUserModel | undefined>;
  loggedUserFullProfile$: Observable<RichUserModel | undefined>;
  logoffAction$: Subject<void>;
  loginAction$: Subject<{email: string; password: string}>;
  resetPasswordAction$: Subject<string>;
  ssoLoginAction$: Subject<{provider: OAuthProvider; redirectUrl?: string}>;
  handleOAuthCallbackAction$: Subject<void>;
  updateUsernameAction$: Subject<string>;
  resetUserDataAction$: Subject<void>;
  deleteAccountAction$: Subject<void>;
  changePassword$: Subject<{newPassword: string}>;
  toggleUsernameForm$: Subject<boolean>;
  togglePasswordForm$: Subject<boolean>;
  showUsernameFormSubject$: BehaviorSubject<boolean>;
  showPasswordFormSubject$: BehaviorSubject<boolean>;
  getDialog(): MatDialog;
  getCurrentUserId(): string | undefined;
  setCurrentUserId(userId: string | undefined): void;
  setProfileRestored(restored: boolean): void;
  publishLoggedUser(user: SimpleUserModel | undefined): void;
  publishSignedInProfile(profile: RichUserModel): void;
  publishSignedOut(): void;
  publishRestoredProfile(profile: RichUserModel | undefined): void;
  publishOAuthCallbackFailed(): void;
  publishOAuthCallbackSucceeded(user: RichUserModel): void;
  showOperationError(error: unknown): void;
}
