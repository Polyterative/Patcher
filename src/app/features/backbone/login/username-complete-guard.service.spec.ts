import { Router } from '@angular/router';
import { of } from 'rxjs';
import {
  isUsernameComplete,
  UsernameCompleteGuard
} from './username-complete-guard.service';


function buildGuard(username: string | null | undefined) {
  const mockUserManagementService = {
    loggedUserFullProfile$: of(username !== undefined ? {username} : undefined)
  };
  const mockRouter = jasmine.createSpyObj<Router>('Router', ['navigate']);
  return {
    guard: new UsernameCompleteGuard(mockUserManagementService as any, mockRouter),
    router: mockRouter
  };
}

describe('isUsernameComplete', () => {
  it('returns false for null', () => expect(isUsernameComplete(null)).toBeFalse());
  it('returns false for undefined', () => expect(isUsernameComplete(undefined)).toBeFalse());
  it('returns false for empty string', () => expect(isUsernameComplete('')).toBeFalse());
  it('returns false for whitespace-only', () => expect(isUsernameComplete('   ')).toBeFalse());
  it('returns false for user_ prefix (OAuth placeholder)', () => expect(isUsernameComplete('user_abc123')).toBeFalse());
  it('returns false for user_ prefix with longer id', () => expect(isUsernameComplete('user_a1b2c3d4')).toBeFalse());
  it('returns true for a real username', () => expect(isUsernameComplete('alice')).toBeTrue());
  it('returns true for username with numbers', () => expect(isUsernameComplete('patcher99')).toBeTrue());
  it('returns true for username with underscores (not user_ prefix)', () => expect(isUsernameComplete('my_name')).toBeTrue());
});

describe('UsernameCompleteGuard', () => {
  it('returns true when user has a complete username', (done) => {
    const {guard} = buildGuard('alice');
    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });
  
  it('returns false and redirects when user has null username', (done) => {
    const {guard, router} = buildGuard(null);
    guard.canActivate().subscribe(result => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
      done();
    });
  });
  
  it('returns false and redirects when user has empty username', (done) => {
    const {guard, router} = buildGuard('');
    guard.canActivate().subscribe(result => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
      done();
    });
  });
  
  it('returns false and redirects when user has OAuth temp username (user_ prefix)', (done) => {
    const {guard, router} = buildGuard('user_a1b2c3d4');
    guard.canActivate().subscribe(result => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
      done();
    });
  });
  
  it('returns false and redirects when profile is missing entirely', (done) => {
    const {guard, router} = buildGuard(undefined);
    guard.canActivate().subscribe(result => {
      expect(result).toBeFalse();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
      done();
    });
  });
  
  it('returns true for username with hyphens and underscores', (done) => {
    const {guard} = buildGuard('my-cool_name');
    guard.canActivate().subscribe(result => {
      expect(result).toBeTrue();
      done();
    });
  });
});