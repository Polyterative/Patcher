import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  firstValueFrom,
  Observable,
  of
} from 'rxjs';
import { environment } from 'src/environments/environment';
import { SupabaseService } from '../../backend/supabase.service';
import {
  MaintenanceModeService,
  maintenanceGuard
} from './maintenance-mode.service';

describe('maintenanceGuard', () => {
  const tree = {url: '/maintenance'};
  async function run(enabled: boolean, admin: boolean, platform = 'browser'): Promise<unknown> {
    TestBed.configureTestingModule({
      providers: [
        {provide: PLATFORM_ID, useValue: platform},
        {provide: Router, useValue: {parseUrl: () => tree}},
        {provide: SupabaseService, useValue: {auth: {hasAdminRole$: () => of(admin)}}}
      ]
    });
    environment.features.maintenanceModeEnabled = enabled;
    const result = TestBed.runInInjectionContext(() => maintenanceGuard({} as never, [], {} as never));
    return result instanceof Observable ? firstValueFrom(result) : result;
  }

  afterEach(() => {
    environment.features.maintenanceModeEnabled = false;
  });

  it('allows everything when off', async () => {
    expect(await run(false, false)).toBeTrue();
  });

  it('redirects non-admins to /maintenance when on', async () => {
    expect(await run(true, false)).toBe(tree);
  });

  it('lets admins through', async () => {
    expect(await run(true, true)).toBeTrue();
  });

  it('always redirects on the server', async () => {
    expect(await run(true, true, 'server')).toBe(tree);
  });

  it('service reads the flag live', () => {
    TestBed.configureTestingModule({providers: [{provide: SupabaseService, useValue: {auth: {hasAdminRole$: () => of(false)}}}]});
    const svc = TestBed.inject(MaintenanceModeService);
    environment.features.maintenanceModeEnabled = true;
    expect(svc.enabled).toBeTrue();
  });
});
