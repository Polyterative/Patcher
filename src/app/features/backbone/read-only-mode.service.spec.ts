import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import {
  ReadOnlyModeService,
  readOnlyModeGuard
} from './read-only-mode.service';


describe('ReadOnlyModeService / readOnlyModeGuard', () => {
  const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
  const router = jasmine.createSpyObj('Router', ['parseUrl']);
  
  function run(enabled: boolean): unknown {
    TestBed.configureTestingModule({
      providers: [
        {provide: MatSnackBar, useValue: snackBar},
        {provide: Router, useValue: router}
      ]
    });
    environment.features.readOnlyModeEnabled = enabled;
    return TestBed.runInInjectionContext(() => readOnlyModeGuard({} as never, {} as never));
  }
  
  afterEach(() => {
    environment.features.readOnlyModeEnabled = false;
  });
  
  beforeEach(() => {
    snackBar.open.calls.reset();
    router.parseUrl.and.returnValue('REDIRECT');
  });
  
  it('exposes the maintenance tooltip', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(ReadOnlyModeService).tooltip).toBe('Temporarily disabled for maintenance');
  });
  
  it('allows navigation when disabled', () => {
    expect(run(false)).toBeTrue();
    expect(snackBar.open).not.toHaveBeenCalled();
  });
  
  it('redirects and notifies when enabled', () => {
    expect(run(true)).toBe('REDIRECT');
    expect(router.parseUrl).toHaveBeenCalledWith('/modules/browser');
    expect(snackBar.open).toHaveBeenCalled();
  });
});
