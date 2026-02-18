import {
  cleanupUserManagementServiceTest,
  MOCK_RICH_USER,
  MOCK_SIMPLE_USER,
  setupUserManagementServiceTest
} from './test-setup';
import { UserManagementService } from '../../user-management.service';
import { of } from 'rxjs';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';


/**
 * Cross-Tab Logout Synchronization Tests
 *
 * Tests for cross-tab logout functionality using Supabase auth state changes.
 */
describe('UserManagementService - Cross-Tab Logout', () => {
  let service: UserManagementService;
  let mockRouter: any;
  let mockSupabaseService: any;
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockRouter = setup.mockRouter;
    mockSupabaseService = setup.mockSupabaseService;
    
    // Setup getUserSession to return logged in user
    mockSupabaseService.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    mockSupabaseService.getRichUserSession$.and.returnValue(of(MOCK_RICH_USER));
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('should clear user state when logout$ event is emitted', fakeAsync(() => {
    // Arrange: Set up logged in user
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    service.loggedUserFullProfile$.next(MOCK_RICH_USER);
    
    let loggedUser: any;
    let loggedUserFullProfile: any;
    
    service.loggedUser$.subscribe(user => loggedUser = user);
    service.loggedUserFullProfile$.subscribe(profile => loggedUserFullProfile = profile);
    
    tick();
    
    // Verify user is logged in
    expect(loggedUser).toEqual(MOCK_SIMPLE_USER);
    expect(loggedUserFullProfile).toEqual(MOCK_RICH_USER);
    
    // Act: Emit logout event (simulating logout from another tab)
    mockSupabaseService.user.logout$.emit();
    
    tick();
    
    // Assert: User state should be cleared
    expect(loggedUser).toBeUndefined();
    expect(loggedUserFullProfile).toBeUndefined();
  }));
  
  it('should navigate to login page when logout$ event is emitted', fakeAsync(() => {
    // Arrange: User is on home page
    mockRouter.url = '/home';
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Act: Emit logout event
    mockSupabaseService.user.logout$.emit();
    
    tick();
    
    // Assert: Should navigate to login
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  }));
  
  it('should NOT navigate when logout$ event is emitted if already on login page', fakeAsync(() => {
    // Arrange: User is already on login page
    Object.defineProperty(mockRouter, 'url', {value: '/auth/login', writable: true});
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    mockRouter.navigate.calls.reset();
    
    tick();
    
    // Act: Emit logout event
    mockSupabaseService.user.logout$.emit();
    
    tick();
    
    // Assert: Should NOT navigate (filter prevents it)
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
  
  it('should NOT navigate when logout$ event is emitted if on login subpage', fakeAsync(() => {
    // Arrange: User is on a login-related page
    Object.defineProperty(mockRouter, 'url', {value: '/auth/login/forgot-password', writable: true});
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    mockRouter.navigate.calls.reset();
    
    tick();
    
    // Act: Emit logout event
    mockSupabaseService.user.logout$.emit();
    
    tick();
    
    // Assert: Should NOT navigate
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
  
  it('should clear user state but not navigate when on login page', fakeAsync(() => {
    // Arrange
    Object.defineProperty(mockRouter, 'url', {value: '/auth/login', writable: true});
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    service.loggedUserFullProfile$.next(MOCK_RICH_USER);
    
    let loggedUser: any;
    service.loggedUser$.subscribe(user => loggedUser = user);
    
    mockRouter.navigate.calls.reset();
    
    tick();
    
    // Act
    mockSupabaseService.user.logout$.emit();
    
    tick();
    
    // Assert: State cleared but no navigation
    expect(loggedUser).toBeUndefined();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
  
  it('should handle multiple logout events gracefully', fakeAsync(() => {
    // Arrange
    Object.defineProperty(mockRouter, 'url', {value: '/home', writable: true, configurable: true});
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    
    tick();
    
    // Act: Emit logout first time
    mockSupabaseService.user.logout$.emit();
    tick();
    
    // After first logout, router.url would be /auth/login in real scenario
    // Simulate that by changing the url
    Object.defineProperty(mockRouter, 'url', {value: '/auth/login', writable: true, configurable: true});
    
    // Second logout event
    mockSupabaseService.user.logout$.emit();
    tick();
    
    // Assert: Should navigate only on first event
    // Second event is filtered because already on login page
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  }));
});