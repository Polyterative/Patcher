import {
  EMPTY,
  throwError
} from 'rxjs';
import { SharedConstants } from './SharedConstants';


describe('SharedConstants - uncovered branches', () => {
  let snackBar: {
    open: jasmine.Spy
  };
  
  beforeEach(() => {
    snackBar = {open: jasmine.createSpy('open').and.returnValue({onAction: () => EMPTY})};
  });
  
  it('errorHandlerLogin with optional msg appends it to the message', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerLogin(snackBar as any, 'extra-detail'))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          const msg: string = snackBar.open.calls.mostRecent().args[0];
          expect(msg).toContain('extra-detail');
          done();
        }
      });
  });
  
  it('errorHandlerLogin without msg does not append anything', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerLogin(snackBar as any))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          const msg: string = snackBar.open.calls.mostRecent().args[0];
          // msg should equal exactly loginFailed with no trailing text
          expect(msg).toBe(SharedConstants.messages.loginFailed);
          done();
        }
      });
  });
  
  it('errorSignup without msg shows only the signupFailed message', () => {
    SharedConstants.errorSignup(snackBar as any);
    const msg: string = snackBar.open.calls.mostRecent().args[0];
    expect(msg).toBe(SharedConstants.messages.signupFailed);
  });
  
  it('errorHandlerData catches errors and shows dataNotSaved message', (done) => {
    throwError(() => new Error('db error'))
      .pipe(SharedConstants.errorHandlerData(snackBar as any))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          const msg: string = snackBar.open.calls.mostRecent().args[0];
          expect(msg).toBe(SharedConstants.messages.dataNotSaved);
          done();
        }
      });
  });
  
  it('errorHandlerData uses 8 second duration and snack-error panelClass', (done) => {
    throwError(() => new Error('db error'))
      .pipe(SharedConstants.errorHandlerData(snackBar as any))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          const args = snackBar.open.calls.mostRecent().args;
          expect(args[2].duration).toBe(8000);
          expect(args[2].panelClass).toBe('snack-error');
          done();
        }
      });
  });
  
  it('errorHandlerOperation catches errors and shows operationFailed message', (done) => {
    throwError(() => new Error('op error'))
      .pipe(SharedConstants.errorHandlerOperation(snackBar as any))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          const msg: string = snackBar.open.calls.mostRecent().args[0];
          expect(msg).toBe(SharedConstants.messages.operationFailed);
          done();
        }
      });
  });
});