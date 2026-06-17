import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot
} from '@angular/router';
import { UserAuthGuard } from './user-auth-guard.service';
import {
  BehaviorSubject,
  EMPTY,
  ReplaySubject
} from 'rxjs';
import { UserManagementService } from './user-management.service';


type UserStub = { id: string } | null;

const route = {} as ActivatedRouteSnapshot;

function state(url: string): RouterStateSnapshot {
  return {url} as RouterStateSnapshot;
}

function createSnackRef() {
  return {
    onAction: jasmine.createSpy('onAction').and.returnValue(EMPTY),
    afterDismissed: jasmine.createSpy('afterDismissed').and.returnValue(EMPTY),
    dismiss: jasmine.createSpy('dismiss')
  };
}

function buildGuard(loggedUser: UserStub = null) {
  const loggedUser$ = new BehaviorSubject<UserStub>(loggedUser);
  const authRestored$ = new BehaviorSubject<boolean>(true);
  const snackRef = createSnackRef();
  const snackBar = jasmine.createSpyObj('MatSnackBar', {open: snackRef});
  const router = jasmine.createSpyObj('Router', ['navigate']);
  const guard = new UserAuthGuard(
    snackBar, router,
    {loggedUser$, authRestored$} as unknown as UserManagementService
  );
  return {guard, snackBar, router, snackRef, authRestored$, loggedUser$};
}


describe('UserAuthGuard', () => {
  it('returns true when user is logged in', (done) => {
    const {guard} = buildGuard({id: 'user-1'});
    guard.canActivate(route, state('/protected')).subscribe(can => {
      expect(can).toBeTrue();
      done();
    });
  });
  
  it('returns false when user is not logged in', (done) => {
    const {guard} = buildGuard(null);
    guard.canActivate(route, state('/protected')).subscribe(can => {
      expect(can).toBeFalse();
      done();
    });
  });
  
  it('opens snackbar when user is not logged in', (done) => {
    const {guard, snackBar} = buildGuard(null);
    guard.canActivate(route, state('/protected')).subscribe(() => {
      expect(snackBar.open).toHaveBeenCalledWith('Sign in to use this feature.', 'Sign in', jasmine.anything());
      done();
    });
  });
  
  it('navigates to login with returnUrl when user is not logged in', (done) => {
    const {guard, router} = buildGuard(null);
    guard.canActivate(route, state('/my-page')).subscribe(() => {
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], jasmine.objectContaining({queryParams: {returnUrl: '/my-page'}}));
      done();
    });
  });
  
  it('does not navigate or open snackbar when user is logged in', (done) => {
    const {guard, snackBar, router} = buildGuard({id: 'user-1'});
    guard.canActivate(route, state('/protected')).subscribe(() => {
      expect(snackBar.open).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      done();
    });
  });

  it('waits for auth restoration before allowing a restored user', (done) => {
    const loggedUser$ = new ReplaySubject<UserStub>(1);
    const authRestored$ = new BehaviorSubject<boolean>(false);
    const snackRef = createSnackRef();
    const snackBar = jasmine.createSpyObj('MatSnackBar', {open: snackRef});
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const guard = new UserAuthGuard(snackBar, router, {loggedUser$, authRestored$} as unknown as UserManagementService);

    guard.canActivate(route, state('/protected')).subscribe(can => {
      expect(can).toBeTrue();
      expect(snackBar.open).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      done();
    });

    loggedUser$.next({id: 'user-1'});
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();

    authRestored$.next(true);
  });

  it('waits for auth restoration before rejecting a restored signed-out session', (done) => {
    const loggedUser$ = new ReplaySubject<UserStub>(1);
    const authRestored$ = new BehaviorSubject<boolean>(false);
    const snackRef = createSnackRef();
    const snackBar = jasmine.createSpyObj('MatSnackBar', {open: snackRef});
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const guard = new UserAuthGuard(snackBar, router, {loggedUser$, authRestored$} as unknown as UserManagementService);

    guard.canActivate(route, state('/protected')).subscribe(can => {
      expect(can).toBeFalse();
      expect(snackBar.open).toHaveBeenCalledTimes(1);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], jasmine.objectContaining({queryParams: {returnUrl: '/protected'}}));
      done();
    });

    loggedUser$.next(null);
    expect(snackBar.open).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();

    authRestored$.next(true);
  });

  it('reuses an active sign-in snackbar across repeated guard denials', (done) => {
    const {guard, snackBar} = buildGuard(null);
    let emissions = 0;

    guard.canActivate(route, state('/first')).subscribe(() => {
      emissions++;
    });
    guard.canActivate(route, state('/second')).subscribe(() => {
      emissions++;
      expect(emissions).toBe(2);
      expect(snackBar.open).toHaveBeenCalledTimes(1);
      done();
    });
  });
});