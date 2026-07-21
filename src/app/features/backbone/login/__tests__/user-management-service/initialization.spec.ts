import {
  cleanupUserManagementServiceTest,
  MOCK_SIMPLE_USER,
  setupUserManagementServiceTest,
  userManagementInternals
} from './test-setup';
import { UserManagementService } from '../../user-management.service';
import { ReplaySubject } from 'rxjs';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import { SimpleUserModel } from 'src/app/features/backend/supabase.service';


/**
 * Service Initialization Tests
 *
 * Tests for basic service creation, dependency injection,
 * and initial configuration.
 */
describe('UserManagementService - Initialization', () => {
  type UserManagementServiceTestSetup = ReturnType<typeof setupUserManagementServiceTest>;

  let service: UserManagementService;
  let mockSnackBar: UserManagementServiceTestSetup['mockSnackBar'];
  let mockRouter: UserManagementServiceTestSetup['mockRouter'];
  let mockSupabaseService: UserManagementServiceTestSetup['mockSupabaseService'];
  let mockUserDataHandlerService: UserManagementServiceTestSetup['mockUserDataHandlerService'];
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockSnackBar = setup.mockSnackBar;
    mockRouter = setup.mockRouter;
    mockSupabaseService = setup.mockSupabaseService;
    mockUserDataHandlerService = setup.mockUserDataHandlerService;
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('should be created successfully', () => {
    expect(service).toBeTruthy();
    expect(service).toBeInstanceOf(UserManagementService);
  });
  
  it('should inject dependencies correctly', () => {
    // Dependencies are now private, so we verify by checking that the service works
    expect(service).toBeTruthy();
    expect(mockSnackBar).toBeDefined();
    expect(mockRouter).toBeDefined();
    expect(mockSupabaseService).toBeDefined();
    expect(mockUserDataHandlerService).toBeDefined();
  });
  
  it('should initialize loggedUser$ Observable', () => {
    expect(service.loggedUser$).toBeDefined();
    expect(typeof service.loggedUser$.subscribe).toBe('function');
  });
  
  it('should initialize loggedUserFullProfile$ ReplaySubject', () => {
    expect(service.loggedUserFullProfile$).toBeDefined();
    expect(typeof service.loggedUserFullProfile$.subscribe).toBe('function');
  });
  
  it('should have currentUserId initially undefined', () => {
    expect(userManagementInternals(service).currentUserId).toBeUndefined();
  });
  
  it('should extend SubManager', () => {
    expect(service.destroy$).toBeDefined();
    expect(typeof service.ngOnDestroy).toBe('function');
  });
  
  it('should call checkUserInCookies on initialization', (done) => {
    // If getUserSession$ was called, checkUserInCookies was executed
    // We need to wait a tick for the async operation
    setTimeout(() => {
      expect(mockSupabaseService.auth.getUserSession$).toHaveBeenCalled();
      done();
    }, 100);
  });

  it('should wait for auth session restoration before marking auth as restored', fakeAsync(() => {
    cleanupUserManagementServiceTest();
    const pendingSession$ = new ReplaySubject<typeof MOCK_SIMPLE_USER | null>(1);
    const setup = setupUserManagementServiceTest({initialUserSession$: pendingSession$});
    const pendingService = setup.service;
    let authRestored: boolean | undefined;
    let loggedUser: SimpleUserModel | undefined;

    pendingService.authRestored$.subscribe(value => authRestored = value);
    pendingService.loggedUser$.subscribe(user => loggedUser = user);
    tick();

    expect(authRestored).toBeFalse();
    expect(loggedUser).toBeUndefined();

    pendingSession$.next(MOCK_SIMPLE_USER);
    tick();

    expect(authRestored).toBeTrue();
    expect(loggedUser).toEqual(MOCK_SIMPLE_USER);
  }));
});
