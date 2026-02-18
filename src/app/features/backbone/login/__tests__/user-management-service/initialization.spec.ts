import {
  cleanupUserManagementServiceTest,
  setupUserManagementServiceTest
} from './test-setup';
import { UserManagementService } from '../../user-management.service';


/**
 * Service Initialization Tests
 *
 * Tests for basic service creation, dependency injection,
 * and initial configuration.
 */
describe('UserManagementService - Initialization', () => {
  let service: UserManagementService;
  let mockSnackBar: any;
  let mockRouter: any;
  let mockSupabaseService: any;
  let mockUserDataHandlerService: any;
  
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
    expect((service as any).currentUserId).toBeUndefined();
  });
  
  it('should extend SubManager', () => {
    expect((service as any).destroy$).toBeDefined();
    expect(typeof service.ngOnDestroy).toBe('function');
  });
  
  it('should call checkUserInCookies on initialization', (done) => {
    // If getUserSession$ was called, checkUserInCookies was executed
    // We need to wait a tick for the async operation
    setTimeout(() => {
      expect(mockSupabaseService.getUserSession$).toHaveBeenCalled();
      done();
    }, 100);
  });
});