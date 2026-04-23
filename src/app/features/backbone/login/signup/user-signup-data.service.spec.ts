import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { of } from 'rxjs';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { UserManagementService } from '../user-management.service';
import { UserSignupDataService } from './user-signup-data.service';


describe('UserSignupDataService', () => {
  let service: UserSignupDataService;
  let userManagementService: jasmine.SpyObj<UserManagementService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    userManagementService = jasmine.createSpyObj<UserManagementService>('UserManagementService', ['signup', 'login$']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        UserSignupDataService,
        {provide: Router, useValue: router},
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: () => null
              }
            }
          }
        },
        {provide: UserManagementService, useValue: userManagementService},
        {provide: MatSnackBar, useValue: jasmine.createSpyObj('MatSnackBar', ['open'])}
      ]
    });

    service = TestBed.inject(UserSignupDataService);
    service.fields.username.control.setValue('newuser');
    service.fields.email.control.setValue('new@example.com');
    service.fields.password.control.setValue('password123');
  });

  it('shows confirm-mail feedback without attempting login when signup needs email confirmation', () => {
    spyOn(SharedConstants, 'confirmMail').and.callFake(() => {});
    spyOn(SharedConstants, 'successSignup').and.callFake(() => {});
    userManagementService.signup.and.returnValue(of({
      user: {
        id: 'u-1',
        email: 'new@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      requiresEmailConfirmation: true
    }));

    service.mailSignClick$.next();

    expect(SharedConstants.confirmMail).toHaveBeenCalled();
    expect(SharedConstants.successSignup).not.toHaveBeenCalled();
    expect(userManagementService.login$).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('logs the user in after signup when no confirmation step is required', () => {
    spyOn(SharedConstants, 'confirmMail').and.callFake(() => {});
    spyOn(SharedConstants, 'successSignup').and.callFake(() => {});
    userManagementService.signup.and.returnValue(of({
      user: {
        id: 'u-1',
        email: 'new@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      requiresEmailConfirmation: false
    }));
    userManagementService.login$.and.returnValue(of({
      returnUrl: null,
      user: {
        id: 'u-1',
        email: 'new@example.com',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        username: 'newuser'
      }
    } as any));

    service.mailSignClick$.next();

    expect(SharedConstants.successSignup).toHaveBeenCalled();
    expect(SharedConstants.confirmMail).not.toHaveBeenCalled();
    expect(userManagementService.login$).toHaveBeenCalledWith('new@example.com', 'password123');
    expect(router.navigate).toHaveBeenCalledWith(['/user/area']);
  });
});
