import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { Router } from '@angular/router';
import { ReplaySubject } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthCallbackComponent } from './auth-callback.component';
import { UserManagementService } from './user-management.service';


describe('AuthCallbackComponent', () => {
  let component: AuthCallbackComponent;
  let fixture: ComponentFixture<AuthCallbackComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockUserManagementService: any;
  let loggedUserFullProfile$: ReplaySubject<any>;
  
  beforeEach(async () => {
    loggedUserFullProfile$ = new ReplaySubject<any>(1);
    
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    
    mockUserManagementService = {
      loggedUserFullProfile$: loggedUserFullProfile$.asObservable(),
      handleOAuthCallback: jasmine.createSpy('handleOAuthCallback')
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
    
    loggedUserFullProfile$.next({id: '1', username: 'myuser', email: 'a@b.com'});
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/user/area']);
  }));
  
  it('navigates to /auth/complete-profile when username starts with user_', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next({id: '1', username: 'user_abc123', email: 'a@b.com'});
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
  }));
  
  it('navigates to /auth/complete-profile when username is empty', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next({id: '1', username: '', email: 'a@b.com'});
    tick();
    
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/complete-profile']);
  }));
  
  it('navigates to /auth/complete-profile when username is null', fakeAsync(() => {
    fixture.detectChanges();
    
    loggedUserFullProfile$.next({id: '1', username: null, email: 'a@b.com'});
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
