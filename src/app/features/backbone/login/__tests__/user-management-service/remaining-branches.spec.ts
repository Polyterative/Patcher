import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  of,
  throwError
} from 'rxjs';
import { AuthApiError } from '@supabase/supabase-js';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../../user-management.service';
import {
  RichUserModel,
  SimpleUserModel
} from 'src/app/features/backend/supabase.service';
import { SupabaseSignupResult } from 'src/app/features/backend/supabase.types';
import { PasswordResetError } from 'src/app/features/backend/supabase-auth.helpers';
import {
  cleanupUserManagementServiceTest,
  createConfirmDialogRef,
  invokeCheckUserInCookies,
  MOCK_RICH_USER,
  MOCK_SIMPLE_USER,
  setupUserManagementServiceTest
} from './test-setup';


describe('UserManagementService - Remaining Branches', () => {
  type UserManagementServiceTestSetup = ReturnType<typeof setupUserManagementServiceTest>;

  let service: UserManagementService;
  let mockSupabaseService: UserManagementServiceTestSetup['mockSupabaseService'];
  let mockDialog: UserManagementServiceTestSetup['mockDialog'];
  
  beforeEach(() => {
    const setup = setupUserManagementServiceTest();
    service = setup.service;
    mockSupabaseService = setup.mockSupabaseService;
    mockDialog = setup.mockDialog;
    mockDialog.open.and.returnValue(createConfirmDialogRef({answer: true}));
    mockSupabaseService.delete.allUserData.and.returnValue(of(void 0));
  });
  
  afterEach(() => {
    cleanupUserManagementServiceTest();
  });
  
  it('initializeLoginHandler handles backend login failure and success action flow', fakeAsync(() => {
    spyOn(SharedConstants, 'errorLogin').and.callFake(() => {
    });
    mockSupabaseService.auth.login$.and.returnValue(throwError(() => new Error('bad login')));
    
    service.loginAction$.next({email: 'a@b.com', password: 'x'});
    tick();
    expect(SharedConstants.errorLogin).toHaveBeenCalled();
    
    mockSupabaseService.auth.login$.and.returnValue(of({user: MOCK_RICH_USER, returnUrl: undefined}));
    let user: SimpleUserModel | undefined;
    let profile: RichUserModel | undefined;
    service.loggedUser$.subscribe(v => user = v);
    service.loggedUserFullProfile$.subscribe(v => profile = v);
    service.loginAction$.next({email: 'a@b.com', password: 'x'});
    tick();
    
    expect(user).toEqual(MOCK_RICH_USER);
    expect(profile).toEqual(MOCK_RICH_USER);
  }));
  
  it('public login$ shows loginFailed for a credential-mismatch AuthApiError and completes (frees the caller for retry)', fakeAsync(() => {
    spyOn(SharedConstants, 'errorLogin').and.callFake(() => {
    });
    mockSupabaseService.auth.login$.and.returnValue(
      throwError(() => new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))
    );

    let completed = false;
    service.login$('a@b.com', 'wrong').subscribe({complete: () => completed = true});
    tick();

    expect(SharedConstants.errorLogin).toHaveBeenCalled();
    expect(completed).toBeTrue();
  }));

  it('public login$ shows operationFailed (not loginFailed) for a non-credential AuthApiError and completes', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'errorLogin').and.callFake(() => {
    });
    mockSupabaseService.auth.login$.and.returnValue(
      throwError(() => new AuthApiError('Internal Server Error', 500, 'unexpected_failure'))
    );

    let completed = false;
    service.login$('a@b.com', 'x').subscribe({complete: () => completed = true});
    tick();

    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(jasmine.anything(), SharedConstants.messages.operationFailed);
    expect(SharedConstants.errorLogin).not.toHaveBeenCalled();
    expect(completed).toBeTrue();
  }));

  it('signup delegates to backend signup$', () => {
    const response: SupabaseSignupResult = {
      user: MOCK_SIMPLE_USER,
      requiresEmailConfirmation: false
    };
    mockSupabaseService.auth.signup$.and.returnValue(of(response));
    
    const out = service.signup('name', 'mail@example.com', 'pass');
    out.subscribe(res => expect(res).toEqual(response));
    expect(mockSupabaseService.auth.signup$).toHaveBeenCalledWith('name', 'mail@example.com', 'pass');
  });
  
  it('public resetPassword$ handles over-limit, generic errors, and success', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom').and.callFake(() => {
    });
    spyOn(SharedConstants, 'successCustom').and.callFake(() => {
    });
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(
      throwError(() => new PasswordResetError('Email rate limit exceeded', 'over_email_send_rate_limit', 429))
    );
    service.resetPassword$('user@example.com').subscribe({error: () => {}});
    tick();
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(
      throwError(() => new PasswordResetError('Some other failure'))
    );
    service.resetPassword$('user@example.com').subscribe({error: () => {}});
    tick();
    
    mockSupabaseService.auth.resetPassword$.and.returnValue(of(void 0));
    service.resetPassword$('user@example.com').subscribe({error: () => {}});
    tick();
    
    expect(SharedConstants.errorCustom).not.toHaveBeenCalled();
    expect(SharedConstants.successCustom).toHaveBeenCalledTimes(1);
  }));
  
  it('checkUserInCookies sets logged user when session exists', fakeAsync(() => {
    mockSupabaseService.auth.getUserSession$.and.returnValue(of(MOCK_SIMPLE_USER));
    let value: SimpleUserModel | undefined;
    service.loggedUser$.subscribe(v => value = v);
    
    invokeCheckUserInCookies(service);
    tick();
    
    expect(value).toEqual(MOCK_SIMPLE_USER);
  }));
  
  it('reset data flow catches logoff failure branch', fakeAsync(() => {
    mockSupabaseService.auth.logoff$.and.returnValue(Promise.reject(new Error('logout fail')));
    
    service.resetUserDataAction$.next();
    tick();
    
    expect(mockSupabaseService.delete.allUserData).toHaveBeenCalled();
  }));
});
