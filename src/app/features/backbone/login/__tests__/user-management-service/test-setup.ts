import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { EventEmitter } from '@angular/core';
import {
  of,
  ReplaySubject
} from 'rxjs';
import { UserManagementService } from '../../user-management.service';
import { SupabaseService } from '../../../../backend/supabase.service';
import { UserDataHandlerService } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.service';


/**
 * Shared Test Setup and Configuration
 *
 * This file provides common test setup utilities for UserManagementService tests.
 */

export const TEST_TIMEOUT = 10000;

/**
 * Mock user data for testing
 */
export const MOCK_SIMPLE_USER = {
  id: 'test-user-id-123',
  email: 'test@example.com',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
};

export const MOCK_SIMPLE_USER_2 = {
  id: 'test-user-id-456',
  email: 'test2@example.com',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z'
};

export const MOCK_RICH_USER = {
  ...MOCK_SIMPLE_USER,
  username: 'testuser',
  public: false,
};

export const MOCK_RICH_USER_2 = {
  ...MOCK_SIMPLE_USER_2,
  username: 'testuser2',
  public: true,
};

/**
 * Creates and configures the test environment for UserManagementService
 */
export function setupUserManagementServiceTest() {
  const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']);
  
  const mockRouter = jasmine.createSpyObj('Router', ['navigate'], {
    url: '/home'
  });
  
  const mockActivatedRoute = jasmine.createSpyObj('ActivatedRoute', [], {
    queryParams: of({}),
    params: of({})
  });
  
  // Mock auth namespace
  const mockAuthNamespace = jasmine.createSpyObj('auth', [
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
    'updateProfileVisibility$'
  ]);
  mockAuthNamespace.getUserSession$.and.returnValue(of(null));
  mockAuthNamespace.getRichUserSession$.and.returnValue(of(null));
  mockAuthNamespace.logoff$.and.returnValue(of({error: null}));
  
  // Mock SupabaseService as a plain object so individual tests can override properties
  const mockSupabaseService: any = {
    auth: mockAuthNamespace,
    user: {
      user$: new ReplaySubject(),
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
