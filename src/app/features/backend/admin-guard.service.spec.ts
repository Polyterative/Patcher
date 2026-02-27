import { ActivatedRouteSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { environment } from 'src/environments/environment';
import { AdminGuardService } from './admin-guard.service';


describe('AdminGuardService', () => {
  let service: AdminGuardService;
  let originalProduction: boolean;

  function buildService(sessionUser: any) {
    const mockSupabase = {
      auth: {
        getUserSession$: jasmine.createSpy('getUserSession$').and.returnValue(of(sessionUser))
      }
    };
    return new AdminGuardService(mockSupabase as any);
  }

  beforeEach(() => {
    originalProduction = environment.production;
  });

  afterEach(() => {
    Object.defineProperty(environment, 'production', {value: originalProduction, writable: true, configurable: true});
  });

  it('returns false when environment.production is true, regardless of session', (done) => {
    Object.defineProperty(environment, 'production', {value: true, writable: true, configurable: true});
    service = buildService({id: 'admin-user'});

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

  it('returns true in dev when user is authenticated', (done) => {
    Object.defineProperty(environment, 'production', {value: false, writable: true, configurable: true});
    service = buildService({id: 'dev-user'});

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

  it('returns false in dev when user is not authenticated', (done) => {
    Object.defineProperty(environment, 'production', {value: false, writable: true, configurable: true});
    service = buildService(null);

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
});
