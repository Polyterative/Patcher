import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { EventEmitter } from '@angular/core';
import {
  Observable,
  of,
  ReplaySubject
} from 'rxjs';
import { UserManagementService } from '../../user-management.service';
import { SupabaseService } from '../../../../backend/supabase.service';
import { UserDataHandlerService } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.service';
import {
  OAuthProvider,
  RichUserModel,
  SimpleUserModel
} from '../../../../backend/supabase.types';


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

type MockAuthNamespace = {
  login$: (email: string, password: string) => Observable<TestLoginResponse>;
  logoff$: () => Observable<{error: null}>;
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
  logoffLocal$: () => Observable<{error: null}>;
};

export type MockSupabaseService = {
  auth: jasmine.SpyObj<MockAuthNamespace>;
  user: {
    user$: ReplaySubject<void>;
    login$: EventEmitter<void>;
    logout$: EventEmitter<void>;
  };
  delete: jasmine.SpyObj<{allUserData: () => void}>;
};

/**
 * Creates and configures the test environment for UserManagementService
 */
export function setupUserManagementServiceTest(options: {
  initialUserSession$?: Observable<typeof MOCK_SIMPLE_USER | typeof MOCK_SIMPLE_USER_2 | null>;
  initialRichUserSession$?: Observable<typeof MOCK_RICH_USER | typeof MOCK_RICH_USER_2 | null>;
} = {}) {
  const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
  
  const mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
    url: '/home'
  });
  
  const mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', [], {
    queryParams: of({}),
    params: of({})
  });
  
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
  
  // Mock UserDataHandlerService
  const mockUserDataHandlerService = {
    store: {
      user$: new ReplaySubject(1)
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
      {provide: UserDataHandlerService, useValue: mockUserDataHandlerService}
    ]
  });
  
  const service = TestBed.inject(UserManagementService);
  
  return {
    service,
    mockSnackBar,
    mockRouter,
    mockActivatedRoute,
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
