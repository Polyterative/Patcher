import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  Observable,
  ReplaySubject
} from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RichUserModel } from '../../backend/supabase.types';
import { AuthCallbackComponent } from './auth-callback.component';
import { MOCK_RICH_USER } from './__tests__/user-management-service/test-setup';
import { UserManagementService } from './user-management.service';


describe('AuthCallbackComponent', () => {
  type AuthCallbackProfile = (Omit<RichUserModel, 'username'> & {username: string | null}) | null | undefined;
  type AuthCallbackUserManagementMock = {
    loggedUserFullProfile$: Observable<AuthCallbackProfile>;
    handleOAuthCallback: jasmine.Spy<() => void>;
  };

  let component: AuthCallbackComponent;
  let fixture: ComponentFixture<AuthCallbackComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUserManagementService: AuthCallbackUserManagementMock;
  let loggedUserFullProfile$: ReplaySubject<AuthCallbackProfile>;

  function profileWithUsername(username: string | null): Exclude<AuthCallbackProfile, null | undefined> {
    return {
      ...MOCK_RICH_USER,
      id: '1',
      email: 'a@b.com',
      username
    };
  }
  
  beforeEach(async () => {
    loggedUserFullProfile$ = new ReplaySubject<AuthCallbackProfile>(1);
    
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    mockUserManagementService = {
      loggedUserFullProfile$: loggedUserFullProfile$.asObservable(),
      handleOAuthCallback: jasmine.createSpy<() => void>('handleOAuthCallback')
    };
    
    await TestBed.configureTestingModule({
      declarations: [AuthCallbackComponent],
      imports: [MatProgressSpinnerModule],
      providers: [
        {provide: Router, useValue: mockRouter},
        {provide: UserManagementService, useValue: mockUserManagementService}
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(AuthCallbackComponent);
    component = fixture.componentInstance;
  });
  
  // ── Init ───────────────────────────────────────────────────────────────────
  
  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });
  
  it('calls handleOAuthCallback on init', fakeAsync(() => {
    fixture.detectChanges();
    tick();
    expect(mockUserManagementService.handleOAuthCallback).toHaveBeenCalled();
  }));
  
  // ── Routing ────────────────────────────────────────────────────────────────
  
  it('navigates to /user/area when user has a proper username', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next(profileWithUsername('myuser'));
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/user/area']);
  }));
  
  it('navigates to /auth/complete-profile when username starts with user_', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next(profileWithUsername('user_abc123'));
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
  }));
  
  it('navigates to /auth/complete-profile when username is empty', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next(profileWithUsername(''));
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
  }));
  
  it('navigates to /auth/complete-profile when username is null', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next(profileWithUsername(null));
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
  }));
  
  it('does not navigate when user is null/undefined', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next(undefined);
    tick();
    
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
  
  it('does not navigate when user is null', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next(null);
    tick();
    
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
});
