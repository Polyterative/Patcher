import {
  cleanupUserManagementServiceTest,
  setupUserManagementServiceTest
} from './test-setup';
import { UserManagementService } from '../../user-management.service';
import {
  fakeAsync,
  tick
} from '@angular/core/testing';


/**
 * Memory Management and Cleanup Tests
 *
 * Tests for proper subscription cleanup and memory management.
 */
describe('UserManagementService - Memory Management', () => {
  let service: UserManagementService;
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('should have destroy$ subject from SubManager', () => {
    expect((service as any).destroy$).toBeDefined();
  });
  
  it('should complete destroy$ on ngOnDestroy', fakeAsync(() => {
    // Arrange
    let destroyed = false;
    (service as any).destroy$.subscribe({
      complete: () => destroyed = true
    });
    
    // Act
    service.ngOnDestroy();
    
    tick();
    
    // Assert
    expect(destroyed).toBe(true);
  }));
  
  it('should not emit after ngOnDestroy is called', fakeAsync(() => {
    // Arrange
    const mockSupabaseService = (service as any).backend;
    
    let emitCount = 0;
    service.loggedUser$.subscribe(() => emitCount++);
    
    tick();
    
    const initialCount = emitCount;
    
    // Act
    service.ngOnDestroy();
    
    // Try to emit logout event
    mockSupabaseService.user.logout$.emit();
    
    tick();
    
    // Assert: Should not process the event after destroy
    expect(emitCount).toBe(initialCount);
  }));
  
  it('should clean up all subscriptions on destroy', fakeAsync(() => {
    // Arrange
    const subscriptionCount = (service as any)._subscriptions?.length || 0;
    
    // Act
    service.ngOnDestroy();
    
    tick();
    
    // Assert: SubManager should clean up subscriptions
    expect((service as any)._subscriptions.length).toBe(0);
  }));
  
  it('should handle multiple ngOnDestroy calls safely', fakeAsync(() => {
    // Act & Assert: Should not throw
    expect(() => {
      service.ngOnDestroy();
      service.ngOnDestroy();
    }).not.toThrow();
  }));
});