import {
  cleanupUserManagementServiceTest,
  MOCK_SIMPLE_USER,
  MOCK_SIMPLE_USER_2,
  setupUserManagementServiceTest
} from './test-setup';
import { UserManagementService } from '../../user-management.service';
import { of } from 'rxjs';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';


/**
 * Cross-Tab Login Synchronization Tests
 *
 * Tests for cross-tab login functionality using Supabase auth state changes.
 */
describe('UserManagementService - Cross-Tab Login', () => {
  let service: UserManagementService;
  let mockRouter: any;
  let mockSupabaseService: any;
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockRouter = setup.mockRouter;
    mockSupabaseService = setup.mockSupabaseService;
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('should update user state when login$ event is emitted with valid session', fakeAsync(() => {
    // Arrange: User is logged out
    mockSupabaseService.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    
    let loggedUser: any;
    service.loggedUser$.subscribe(user => loggedUser = user);
    
    tick();
    
    // Verify initially undefined
    expect(loggedUser).toBeUndefined();
    
    // Act: Emit login event (simulating login from another tab)
    mockSupabaseService.user.login$.emit();
    
    tick();
    
    // Assert: User state should be updated
    expect(loggedUser).toEqual(MOCK_SIMPLE_USER);
    expect(mockSupabaseService.getUserSession$).toHaveBeenCalled();
  }));
  
  it('should navigate to home when login$ event is emitted and on login page', fakeAsync(() => {
    // Arrange: User is on login page and logged out
    Object.defineProperty(mockRouter, 'url', {value: '/auth/login', writable: true});
    mockSupabaseService.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    
    tick();
    
    // Act: Emit login event
    mockSupabaseService.user.login$.emit();
    
    tick();
    
    // Assert: Should navigate to home
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
  }));
  
  it('should NOT navigate when login$ event is emitted if not on login page', fakeAsync(() => {
    // Arrange: User is on another page
    Object.defineProperty(mockRouter, 'url', {value: '/modules', writable: true});
    mockSupabaseService.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    
    mockRouter.navigate.calls.reset();
    
    tick();
    
    // Act: Emit login event
    mockSupabaseService.user.login$.emit();
    
    tick();
    
    // Assert: Should NOT navigate
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
  
  it('should NOT update state when login$ emitted but session is null', fakeAsync(() => {
    // Arrange: No valid session available
    mockSupabaseService.getUserSession$.and.returnValue(of(null));
    
    let loggedUser: any = 'initial';
    service.loggedUser$.subscribe(user => loggedUser = user);
    
    tick();
    
    // Act: Emit login event
    mockSupabaseService.user.login$.emit();
    
    tick();
    
    // Assert: State should remain undefined (filtered out)
    expect(loggedUser).toBeUndefined();
  }));
  
  it('should update to new user when different user logs in', fakeAsync(() => {
    // Arrange: User 1 is logged in
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    (service as any).currentUserId = MOCK_SIMPLE_USER.id;
    
    mockSupabaseService.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER_2));
    
    let loggedUser: any;
    service.loggedUser$.subscribe(user => loggedUser = user);
    
    tick();
    
    expect(loggedUser).toEqual(MOCK_SIMPLE_USER);
    
    // Act: Emit login event with different user
    mockSupabaseService.user.login$.emit();
    
    tick();
    
    // Assert: Should update to new user
    expect(loggedUser).toEqual(MOCK_SIMPLE_USER_2);
  }));
  
  it('should NOT update when same user logs in again', fakeAsync(() => {
    // Arrange: User is already logged in
    service.loggedUser$.next(MOCK_SIMPLE_USER);
    (service as any).currentUserId = MOCK_SIMPLE_USER.id;
    
    mockSupabaseService.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    
    let emitCount = 0;
    service.loggedUser$.subscribe(() => emitCount++);
    
    tick();
    
    const initialEmitCount = emitCount;
    
    // Act: Emit login event with same user
    mockSupabaseService.user.login$.emit();
    
    tick();
    
    // Assert: Should NOT emit new value (filtered)
    expect(emitCount).toBe(initialEmitCount);
  }));
  
  it('should fetch user session when login$ event is emitted', fakeAsync(() => {
    // Arrange
    mockSupabaseService.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    
    tick();
    
    mockSupabaseService.getUserSession$.calls.reset();
    
    // Act
    mockSupabaseService.user.login$.emit();
    
    tick();
    
    // Assert
    expect(mockSupabaseService.getUserSession$).toHaveBeenCalled();
  }));
  
  it('should handle rapid login events without errors', fakeAsync(() => {
    // Arrange
    Object.defineProperty(mockRouter, 'url', {value: '/auth/login', writable: true});
    mockSupabaseService.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    
    tick();
    
    // Act: Emit multiple login events rapidly
    mockSupabaseService.user.login$.emit();
    mockSupabaseService.user.login$.emit();
    mockSupabaseService.user.login$.emit();
    
    tick();
    
    // Assert: Should handle gracefully (last state wins)
    let loggedUser: any;
    service.loggedUser$.subscribe(user => loggedUser = user);
    expect(loggedUser).toEqual(MOCK_SIMPLE_USER);
  }));
});