import { ActivatedRouteSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { AdminGuardService } from './admin-guard.service';


describe('AdminGuardService', () => {
  let service: AdminGuardService;

  function buildService(sessionUser: any, isAdmin = false) {
    const mockSupabase = {
      auth: {
        getUserSession$: jasmine.createSpy('getUserSession$').and.returnValue(of(sessionUser)),
        hasAdminRole$: jasmine.createSpy('hasAdminRole$').and.returnValue(of(isAdmin))
      }
    };
    return new AdminGuardService(mockSupabase as any);
  }

  it('returns false when user is not authenticated', (done) => {
    service = buildService(null, false);

    (service.canActivate({} as ActivatedRouteSnapshot) as any).subscribe({
      next: (result: boolean) => {
        expect(result).toBeFalse();
        done();
      },
      error: (err: any) => {
        fail(err);
        done();
      }
    });
  });

  it('returns false when user is authenticated but not an admin', (done) => {
    service = buildService({id: 'regular-user'}, false);

    (service.canActivate({} as ActivatedRouteSnapshot) as any).subscribe({
      next: (result: boolean) => {
        expect(result).toBeFalse();
        done();
      },
      error: (err: any) => {
        fail(err);
        done();
      }
    });
  });

  it('returns true when user is authenticated and has admin role', (done) => {
    service = buildService({id: 'admin-user'}, true);

    (service.canActivate({} as ActivatedRouteSnapshot) as any).subscribe({
      next: (result: boolean) => {
        expect(result).toBeTrue();
        done();
      },
      error: (err: any) => {
        fail(err);
        done();
      }
    });
  });
});