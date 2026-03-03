import { UserAuthGuard } from './user-auth-guard.service';
import {
  BehaviorSubject,
  EMPTY
} from 'rxjs';


function buildGuard(loggedUser: any = null) {
  const loggedUser$ = new BehaviorSubject<any>(loggedUser);
  const snackRef = {onAction: jasmine.createSpy('onAction').and.returnValue(EMPTY), _open: jasmine.createSpy('_open')};
  const snackBar = jasmine.createSpyObj('MatSnackBar', {open: snackRef});
  const router = jasmine.createSpyObj('Router', ['navigate']);
  const guard = new UserAuthGuard(
    jasmine.createSpyObj('MatDialog', ['open']),
    snackBar, router,
    {loggedUser$} as any
  );
  return {guard, snackBar, router, snackRef};
}


describe('UserAuthGuard', () => {
  it('returns true when user is logged in', (done) => {
    const {guard} = buildGuard({id: 'user-1'});
    guard.canActivate({} as any, {url: '/protected'} as any).subscribe(can => {
      expect(can).toBeTrue();
      done();
    });
  });
  
  it('returns false when user is not logged in', (done) => {
    const {guard} = buildGuard(null);
    guard.canActivate({} as any, {url: '/protected'} as any).subscribe(can => {
      expect(can).toBeFalse();
      done();
    });
  });
  
  it('opens snackbar when user is not logged in', (done) => {
    const {guard, snackBar} = buildGuard(null);
    guard.canActivate({} as any, {url: '/protected'} as any).subscribe(() => {
      expect(snackBar.open).toHaveBeenCalledWith('Sign in to use this feature.', 'Sign in', jasmine.anything());
      done();
    });
  });
  
  it('navigates to login with returnUrl when user is not logged in', (done) => {
    const {guard, router} = buildGuard(null);
    guard.canActivate({} as any, {url: '/my-page'} as any).subscribe(() => {
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], jasmine.objectContaining({queryParams: {returnUrl: '/my-page'}}));
      done();
    });
  });
  
  it('does not navigate or open snackbar when user is logged in', (done) => {
    const {guard, snackBar, router} = buildGuard({id: 'user-1'});
    guard.canActivate({} as any, {url: '/protected'} as any).subscribe(() => {
      expect(snackBar.open).not.toHaveBeenCalled();
      expect(router.navigate).not.toHaveBeenCalled();
      done();
    });
  });
});