import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { EventEmitter } from '@angular/core';
import {
  Observable,
  of,
  ReplaySubject,
  Subscription
} from 'rxjs';
import { UserManagementService } from '../../user-management.service';
import { SupabaseService } from '../../../../backend/supabase.service';
import { UserDataHandlerService } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import {
  OAuthProvider,
  RichUserModel,
  SimpleUserModel
} from '../../../../backend/supabase.types';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataOutModel
} from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { AnalyticsService } from '../../../analytics-integration/analytics.service';
import { SentryContextService } from '../../../sentry-integration/sentry-context.service';


/**
 * Shared Test Setup and Configuration
 *
 * This file provides common test setup utilities for UserManagementService tests.
 */

export const TEST_TIMEOUT = 10000;

/**
 * Mock user data for testing
 */
export const MOCK_SIMPLE_USER: SimpleUserModel = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
};

export const MOCK_SIMPLE_USER_2: SimpleUserModel = {
  id: 'test-user-id-456',
  email: 'test2@example.com',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
};

export const MOCK_RICH_USER: RichUserModel = {
  ...MOCK_SIMPLE_USER,
  username: 'testuser',
  public: false,
};

export const MOCK_RICH_USER_2: RichUserModel = {
  ...MOCK_SIMPLE_USER_2,
  username: 'testuser2',
  public: true,
};

type TestLoginResponse = {
  user: SimpleUserModel;
  returnUrl: string | null | undefined;
};
type TestSignupResponse = {
  user: SimpleUserModel | null;
  requiresEmailConfirmation: boolean;
};
type TestLogoffResponse = {
  error: Error | null;
};
type MockDialogRef = Pick<MatDialogRef<ConfirmDialogComponent, ConfirmDialogDataOutModel>, 'afterClosed'>;
type MockDialogOpen = (component: unknown, config?: unknown) => MockDialogRef;

type MockAuthNamespace = {
  login$: (email: string, password: string) => Observable<TestLoginResponse>;
  logoff$: () => Observable<TestLogoffResponse> | Promise<TestLogoffResponse>;
  getUserSession$: () => Observable<SimpleUserModel | null>;
  getRichUserSession$: () => Observable<RichUserModel | null>;
  signup$: (username: string, email: string, password: string) => Observable<TestSignupResponse>;
  resetPassword$: (emailOrToken: string, newPassword?: string) => Observable<void>;
  updatePassword$: (newPassword: string) => Observable<void>;
  loginWithOAuth$: (provider: OAuthProvider, redirectUrl?: string) => Observable<void>;
  handleOAuthCallback$: () => Observable<RichUserModel | null>;
  updateUsername$: (userId: string, newUsername: string) => Observable<void>;
  isUsernameAvailable$: (username: string, excludeUserId?: string) => Observable<boolean>;
  updateProfileVisibility$: (userId: string, isPublic: boolean) => Observable<void>;
  deleteCurrentUserAccount$: () => Observable<void>;
  logoffLocal$: () => Observable<TestLogoffResponse>;
};

export type MockSupabaseService = {
  auth: jasmine.SpyObj<MockAuthNamespace>;
  user: {
    user$: ReplaySubject<void>;
    login$: EventEmitter<void>;
    logout$: EventEmitter<void>;
  };
  delete: jasmine.SpyObj<{allUserData: () => Observable<void>}>;
};

export type MockDialog = {
  open: jasmine.Spy<MockDialogOpen>;
};

export type MockUserDataHandlerService = {
  store: {
    user$: ReplaySubject<{username?: string}>;
  };
  logoffButtonClick$: EventEmitter<void>;
  loginButtonClick$: EventEmitter<void>;
  signupButtonClick$: EventEmitter<void>;
  router: jasmine.SpyObj<Router>;
  httpClient: jasmine.SpyObj<{
    get: () => Observable<unknown>;
    post: () => Observable<unknown>;
  }>;
};

export type UserManagementServiceInternals = {
  currentUserId: string | undefined;
  _loggedUserFullProfile$: ReplaySubject<RichUserModel | undefined>;
  _subscriptions: Subscription[];
  checkUserInCookies: () => void;
};

export function userManagementInternals(service: UserManagementService): UserManagementServiceInternals {
  return service as unknown as UserManagementServiceInternals;
}

export function publishRichProfile(service: UserManagementService, profile: RichUserModel): void {
  userManagementInternals(service)._loggedUserFullProfile$.next(profile);
}

export function invokeCheckUserInCookies(service: UserManagementService): void {
  userManagementInternals(service).checkUserInCookies();
}

export function createConfirmDialogRef(result: ConfirmDialogDataOutModel): MockDialogRef {
  return {
    afterClosed: () => of(result)
  };
}

/**
 * Creates and configures the test environment for UserManagementService
 */
export function setupUserManagementServiceTest(options: {
  initialUserSession$?: Observable<typeof MOCK_SIMPLE_USER | typeof MOCK_SIMPLE_USER_2 | null>;
  initialRichUserSession$?: Observable<typeof MOCK_RICH_USER | typeof MOCK_RICH_USER_2 | null>;
} = {}) {
  const mockSnackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
  
  const mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate'], {
    url: '/home'
  });
  
  const mockActivatedRoute = jasmine.createSpyObj<ActivatedRoute>('ActivatedRoute', [], {
    queryParams: of({}),
    params: of({})
  });

  const mockDialog: MockDialog = {
    open: jasmine.createSpy<MockDialogOpen>('dialog.open').and.returnValue(createConfirmDialogRef({answer: true}))
  };

  const mockAnalytics = jasmine.createSpyObj<Pick<AnalyticsService, 'capture' | 'identify' | 'reset'>>(
    'AnalyticsService',
    ['capture', 'identify', 'reset']
  );

  const mockSentryContext = jasmine.createSpyObj<Pick<SentryContextService, 'setUser' | 'clearUser' | 'captureError'>>(
    'SentryContextService',
    ['setUser', 'clearUser', 'captureError']
  );
  
  // Mock auth namespace
  const mockAuthNamespace = jasmine.createSpyObj<MockAuthNamespace>('auth', [
    'login$',
    'logoff$',
    'getUserSession$',
    'getRichUserSession$',
    'signup$',
    'resetPassword$',
    'updatePassword$',
    'loginWithOAuth$',
    'handleOAuthCallback$',
    'updateUsername$',
    'isUsernameAvailable$',
    'updateProfileVisibility$',
    'deleteCurrentUserAccount$',
    'logoffLocal$'
  ]);
  mockAuthNamespace.getUserSession$.and.returnValue(options.initialUserSession$ ?? of(null));
  mockAuthNamespace.getRichUserSession$.and.returnValue(options.initialRichUserSession$ ?? of(null));
  mockAuthNamespace.logoff$.and.returnValue(of({error: null}));
  mockAuthNamespace.logoffLocal$.and.returnValue(of({error: null}));
  
  // Mock SupabaseService as a plain object so individual tests can override properties
  const mockSupabaseService: MockSupabaseService = {
    auth: mockAuthNamespace,
    user: {
      user$: new ReplaySubject<void>(),
      login$: new EventEmitter<void>(),
      logout$: new EventEmitter<void>()
    },
    delete: jasmine.createSpyObj('delete', ['allUserData'])
  };
  mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
  
  // Mock UserDataHandlerService
  const mockUserDataHandlerService: MockUserDataHandlerService = {
    store: {
      user$: new ReplaySubject<{username?: string}>(1)
    },
    logoffButtonClick$: new EventEmitter<void>(),
    loginButtonClick$: new EventEmitter<void>(),
    signupButtonClick$: new EventEmitter<void>(),
    router: mockRouter,
    httpClient: jasmine.createSpyObj('HttpClient', ['get', 'post'])
  };
  
  TestBed.configureTestingModule({
    providers: [
      UserManagementService,
      {provide: MatSnackBar, useValue: mockSnackBar},
      {provide: Router, useValue: mockRouter},
      {provide: ActivatedRoute, useValue: mockActivatedRoute},
      {provide: SupabaseService, useValue: mockSupabaseService},
      {provide: UserDataHandlerService, useValue: mockUserDataHandlerService},
      {provide: MatDialog, useValue: mockDialog},
      {provide: AnalyticsService, useValue: mockAnalytics},
      {provide: SentryContextService, useValue: mockSentryContext}
    ]
  });
  
  const service = TestBed.inject(UserManagementService);
  
  return {
    service,
    mockSnackBar,
    mockRouter,
    mockActivatedRoute,
    mockDialog,
    mockAnalytics,
    mockSentryContext,
    mockSupabaseService,
    mockUserDataHandlerService
  };
}

/**
 * Cleanup after each test
 */
export function cleanupUserManagementServiceTest() {
  TestBed.resetTestingModule();
}
