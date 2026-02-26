import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  of,
  throwError
} from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../../user-management.service';
import {
  cleanupUserManagementServiceTest,
  MOCK_RICH_USER,
  setupUserManagementServiceTest
} from './test-setup';


describe('UserManagementService - Account Actions', () => {
  let service: UserManagementService;
  let mockSupabaseService: any;
  let mockRouter: any;
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockSupabaseService = setup.mockSupabaseService;
    mockRouter = setup.mockRouter;
    mockSupabaseService.auth.loginWithOAuth$.and.returnValue(of(void 0));
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(of(MOCK_RICH_USER));
    mockSupabaseService.auth.updateUsername$.and.returnValue(of(void 0));
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
    (service as any).dialog = {
      open: jasmine.createSpy('dialog.open').and.returnValue({
        afterClosed: () => of({answer: true})
      })
    };
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('triggers SSO login action and delegates to backend', fakeAsync(() => {
    service.loginWithSSO('google', '/cb');
    tick();
    expect(mockSupabaseService.auth.loginWithOAuth$).toHaveBeenCalledWith('google', '/cb');
  }));
  
  it('shows error when SSO backend call fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.auth.loginWithOAuth$.and.returnValue(throwError(() => new Error('sso failed')));
    
    service.loginWithSSO('github', '/cb');
    tick();
    
    expect(console.error).toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  }));
  
  it('handles OAuth callback action and updates user streams', fakeAsync(() => {
    let user: any;
    let profile: any;
    service.loggedUser$.subscribe(v => user = v);
    service.loggedUserFullProfile$.subscribe(v => profile = v);
    
    service.handleOAuthCallback();
    tick();
    
    expect(mockSupabaseService.auth.handleOAuthCallback$).toHaveBeenCalled();
    expect(user).toEqual(MOCK_RICH_USER as any);
    expect(profile).toEqual(MOCK_RICH_USER as any);
  }));
  
  it('shows error when OAuth callback handling fails', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.auth.handleOAuthCallback$.and.returnValue(throwError(() => new Error('oauth fail')));
    
    service.handleOAuthCallback();
    tick();
    
    expect(console.error).toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  }));
  
  it('handles resetPasswordAction$ error variants and success', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(throwError(() => ({error_code: 'over_email_send_rate_limit'})));
    service.resetPasswordAction$.next('user@example.com');
    tick();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(throwError(() => new Error('generic')));
    service.resetPasswordAction$.next('user@example.com');
    tick();
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(2);
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(of(void 0));
    service.resetPasswordAction$.next('user@example.com');
    tick();
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));
  
  it('runs updateUsernameAction$ success and error branches', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of({...MOCK_RICH_USER, username: 'newname'}));
    (service as any)._loggedUserFullProfile$.next(MOCK_RICH_USER);
    
    service.updateUsernameAction$.next('newname');
    tick();
    expect(mockSupabaseService.auth.updateUsername$).toHaveBeenCalledWith(MOCK_RICH_USER.id, 'newname');
    expect(SharedConstants.successCustom).toHaveBeenCalled();
    
    mockSupabaseService.auth.updateUsername$.and.returnValue(throwError(() => ({message: 'taken'})));
    service.updateUsernameAction$.next('newname2');
    tick();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  }));
  
  it('public updateUsername$ refreshes profile and emits success', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    (service as any)._loggedUserFullProfile$.next(MOCK_RICH_USER);
    mockSupabaseService.auth.updateUsername$.and.returnValue(of(void 0));
    mockSupabaseService.auth.getRichUserSession$.and.returnValue(of({...MOCK_RICH_USER, username: 'after'}));
    
    let completed = false;
    service.updateUsername$('after').subscribe({
      complete: () => completed = true
    });
    tick();
    
    expect(completed).toBeTrue();
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));
  
  it('public updateUsername$ rethrows backend errors', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    (service as any)._loggedUserFullProfile$.next(MOCK_RICH_USER);
    mockSupabaseService.auth.updateUsername$.and.returnValue(throwError(() => new Error('update failed')));
    
    let failed = false;
    service.updateUsername$('after').subscribe({
      error: () => failed = true
    });
    tick();
    
    expect(failed).toBeTrue();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
  }));
  
  it('deletes account data, logs out, and navigates on confirmation', fakeAsync(() => {
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    mockSupabaseService.auth.logoff$.and.returnValue(Promise.resolve({error: null}));
    
    service.deleteAccountAction$.next();
    tick();
    
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    expect(SharedConstants.successCustom).toHaveBeenCalled();
  }));
  
  it('handles delete-account backend error without navigation', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(console, 'error');
    mockSupabaseService.delete.allUserData.and.returnValue(throwError(() => new Error('delete failed')));
    mockRouter.navigate.calls.reset();
    
    service.deleteAccountAction$.next();
    tick();
    
    expect(console.error).toHaveBeenCalled();
    expect(SharedConstants.errorCustom).toHaveBeenCalled();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
});