import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import {
  of,
  ReplaySubject,
  throwError
} from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CompleteProfileComponent } from './complete-profile.component';
import { UserManagementService } from '../user-management.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';


describe('CompleteProfileComponent', () => {
  let component: CompleteProfileComponent;
  let fixture: ComponentFixture<CompleteProfileComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockSnackBar: jasmine.SpyObj<MatSnackBar>;
  let mockUserManagementService: any;
  let loggedUserFullProfile$: ReplaySubject<any>;
  
  beforeEach(async () => {
    loggedUserFullProfile$ = new ReplaySubject<any>(1);
    
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    
    mockUserManagementService = {
      loggedUserFullProfile$: loggedUserFullProfile$.asObservable(),
      updateUsername$: jasmine.createSpy('updateUsername$').and.returnValue(of(void 0))
    };
    
    await TestBed.configureTestingModule({
      declarations: [CompleteProfileComponent],
      imports: [
        ReactiveFormsModule,
        NoopAnimationsModule,
        MatCardModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatProgressSpinnerModule
      ],
      providers: [
        {provide: Router, useValue: mockRouter},
        {provide: MatSnackBar, useValue: mockSnackBar},
        {provide: UserManagementService, useValue: mockUserManagementService}
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(CompleteProfileComponent);
    component = fixture.componentInstance;
  });
  
  // ── Init ───────────────────────────────────────────────────────────────────
  
  it('should create', fakeAsync(() => {
    loggedUserFullProfile$.next(null);
    fixture.detectChanges();
    tick();
    expect(component).toBeTruthy();
  }));
  
  it('redirects to /auth/login when no user is logged in', fakeAsync(() => {
    fixture.detectChanges();
    loggedUserFullProfile$.next(null);
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  }));
  
  it('redirects to /auth/login when user is undefined', fakeAsync(() => {
    fixture.detectChanges();
    loggedUserFullProfile$.next(undefined);
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
  }));
  
  it('redirects to /user/area when user already has a proper username', fakeAsync(() => {
    fixture.detectChanges();
    loggedUserFullProfile$.next({id: '1', username: 'properusername', email: 'a@b.com'});
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/user/area']);
  }));
  
  it('does NOT redirect when user has a temp username starting with user_', fakeAsync(() => {
    fixture.detectChanges();
    loggedUserFullProfile$.next({id: '1', username: 'user_abc123', email: 'a@b.com'});
    tick();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  }));
  
  // ── Form validation ────────────────────────────────────────────────────────
  
  it('usernameControl is invalid when empty', () => {
    component.usernameControl.setValue('');
    expect(component.usernameControl.invalid).toBeTrue();
  });
  
  it('usernameControl is invalid when less than 3 characters', () => {
    component.usernameControl.setValue('ab');
    expect(component.usernameControl.invalid).toBeTrue();
  });
  
  it('usernameControl is valid for a proper username', () => {
    component.usernameControl.setValue('validname');
    expect(component.usernameControl.valid).toBeTrue();
  });
  
  it('usernameControl is invalid for usernames with special characters', () => {
    component.usernameControl.setValue('bad name!');
    expect(component.usernameControl.invalid).toBeTrue();
  });
  
  // ── saveUsername ───────────────────────────────────────────────────────────
  
  it('does nothing when form is invalid', fakeAsync(() => {
    component.usernameControl.setValue('');
    component.saveUsername();
    tick();
    expect(mockUserManagementService.updateUsername$).not.toHaveBeenCalled();
  }));
  
  it('does nothing when already saving', fakeAsync(() => {
    component.usernameControl.setValue('validname');
    component.saving = true;
    component.saveUsername();
    tick();
    expect(mockUserManagementService.updateUsername$).not.toHaveBeenCalled();
  }));
  
  it('calls updateUsername$ with trimmed value when form is valid', fakeAsync(() => {
    component.usernameControl.setValue('myname');
    component.saveUsername();
    tick();
    expect(mockUserManagementService.updateUsername$).toHaveBeenCalledWith('myname');
  }));
  
  it('navigates to /user/area after successful save', fakeAsync(() => {
    component.usernameControl.setValue('myname');
    component.saveUsername();
    tick();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/user/area']);
  }));
  
  it('shows taken-username error when updateUsername$ returns already-taken message', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom');
    mockUserManagementService.updateUsername$.and.returnValue(
      throwError(() => new Error('This username is already taken. Please choose another one.'))
    );
    
    component.usernameControl.setValue('takenname');
    component.saveUsername();
    tick();
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
      mockSnackBar,
      jasmine.stringContaining('already taken')
    );
  }));
  
  it('shows generic error when updateUsername$ fails for other reason', fakeAsync(() => {
    spyOn(SharedConstants, 'errorCustom');
    mockUserManagementService.updateUsername$.and.returnValue(
      throwError(() => new Error('Server error'))
    );
    
    component.usernameControl.setValue('myname');
    component.saveUsername();
    tick();
    
    expect(SharedConstants.errorCustom).toHaveBeenCalledWith(
      mockSnackBar,
      jasmine.stringContaining('database returned an error')
    );
  }));
  
  it('resets saving flag on error', fakeAsync(() => {
    mockUserManagementService.updateUsername$.and.returnValue(throwError(() => new Error('fail')));
    
    component.usernameControl.setValue('myname');
    component.saveUsername();
    tick();
    
    expect(component.saving).toBeFalse();
  }));
});
