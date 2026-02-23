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
  MOCK_SIMPLE_USER,
  setupUserManagementServiceTest
} from './test-setup';


describe('UserManagementService - Remaining Branches', () => {
  let service: UserManagementService;
  let mockSupabaseService: any;
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockSupabaseService = setup.mockSupabaseService;
    (service as any).dialog = {
      open: jasmine.createSpy('dialog.open').and.returnValue({
        afterClosed: () => of({answer: true})
      })
    };
    mockSupabaseService.delete = {
      allUserData: jasmine.createSpy('delete.allUserData').and.returnValue(of(void 0)
      )
    };
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('initializeLoginHandler handles backend login failure and success action flow', fakeAsync(() => {
    spyOn(SharedConstants, 'errorLogin').and.callFake(() => {
    });
    mockSupabaseService.login$.and.returnValue(throwError(() => new Error('bad login')));
    
    service.loginAction$.next({email: 'a@b.com', password: 'x'});
    tick();
    expect(SharedConstants.errorLogin).toHaveBeenCalled();
    
    mockSupabaseService.login$.and.returnValue(of({user: MOCK_RICH_USER}));
    let user: any;
    let profile: any;
    service.loggedUser$.subscribe(v => user = v);
    service.loggedUserFullProfile$.subscribe(v => profile = v);
    service.loginAction$.next({email: 'a@b.com', password: 'x'});
    tick();
    
    expect(user).toEqual(MOCK_RICH_USER as any);
    expect(profile).toEqual(MOCK_RICH_USER as any);
  }));
  
  it('signup delegates to backend signup$', () => {
    const response = {user: {id: 'x'}} as any;
    mockSupabaseService.signup$.and.returnValue(of(response));
    
    const out = service.signup('name', 'mail@example.com', 'pass');
    out.subscribe((res: any) => expect(res).toEqual(response));
    expect(mockSupabaseService.signup$).toHaveBeenCalledWith('name', 'mail@example.com', 'pass');
  });
  
  it('public resetPassword$ handles over-limit, generic errors, and success', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    
    mockSupabaseService.resetPassword$.and.returnValue(throwError(() => ({error_code: 'over_email_send_rate_limit'})));
    service.resetPassword$('user@example.com').subscribe();
    tick();
    
    mockSupabaseService.resetPassword$.and.returnValue(throwError(() => new Error('generic')));
    service.resetPassword$('user@example.com').subscribe();
    tick();
    
    mockSupabaseService.resetPassword$.and.returnValue(of(void 0));
    service.resetPassword$('user@example.com').subscribe();
    tick();
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledTimes(2);
    expect(SharedConstants.successCustom).toHaveBeenCalledTimes(1);
  }));
  
  it('checkUserInCookies sets logged user when session exists', fakeAsync(() => {
    mockSupabaseService.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    let value: any;
    service.loggedUser$.subscribe(v => value = v);
    
    (service as any).checkUserInCookies();
    tick();
    
    expect(value).toEqual(MOCK_SIMPLE_USER as any);
  }));
  
  it('deleteAccount flow catches logoff failure branch', fakeAsync(() => {
    mockSupabaseService.logoff$.and.returnValue(Promise.reject(new Error('logout fail')));
    
    service.deleteAccountAction$.next();
    tick();
    
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalled();
  }));
});