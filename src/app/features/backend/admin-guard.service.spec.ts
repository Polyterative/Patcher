import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import {
  firstValueFrom,
  Observable,
  of
} from 'rxjs';
import { AdminGuardService } from './admin-guard.service';
import { SupabaseService } from './supabase.service';
import { SimpleUserModel } from './supabase.types';


describe('AdminGuardService', () => {
  type AdminGuardAuth = Pick<SupabaseService['auth'], 'getUserSession$' | 'hasAdminRole$'>;
  type AdminGuardSupabase = {
    readonly auth: jasmine.SpyObj<AdminGuardAuth>;
  };
  type GuardResult = Observable<boolean>;

  const routeSnapshot = {} as ActivatedRouteSnapshot;
  const userTimestamps = {
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z'
  };

  function createUser(id: string): SimpleUserModel {
    return {
      id,
      email: `${ id }@example.test`,
      ...userTimestamps
    };
  }

  function buildService(sessionUser: SimpleUserModel | null, isAdmin = false): {
    service: AdminGuardService;
    supabase: AdminGuardSupabase;
  } {
    const auth = jasmine.createSpyObj<AdminGuardAuth>('auth', [
      'getUserSession$',
      'hasAdminRole$'
    ]);
    auth.getUserSession$.and.returnValue(of(sessionUser));
    auth.hasAdminRole$.and.returnValue(of(isAdmin));
    const supabase: AdminGuardSupabase = {
      auth
    };

    TestBed.configureTestingModule({
      providers: [
        AdminGuardService,
        {provide: SupabaseService, useValue: supabase}
      ]
    });

    return {
      service: TestBed.inject(AdminGuardService),
      supabase
    };
  }

  function resolveGuardResult(service: AdminGuardService): Promise<boolean> {
    const result$: GuardResult = service.canActivate(routeSnapshot);
    return firstValueFrom(result$);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('returns false when user is not authenticated', async () => {
    const {service} = buildService(null, false);

    await expectAsync(resolveGuardResult(service)).toBeResolvedTo(false);
  });

  it('returns false when user is authenticated but not an admin', async () => {
    const {service} = buildService(createUser('regular-user'), false);

    await expectAsync(resolveGuardResult(service)).toBeResolvedTo(false);
  });

  it('returns true when user is authenticated and has admin role', async () => {
    const {service} = buildService(createUser('admin-user'), true);

    await expectAsync(resolveGuardResult(service)).toBeResolvedTo(true);
  });

  it('calls getUserSession$ once per canActivate invocation', async () => {
    const {service, supabase} = buildService(createUser('u1'), false);

    await resolveGuardResult(service);
    expect(supabase.auth.getUserSession$).toHaveBeenCalledTimes(1);
  });
});
