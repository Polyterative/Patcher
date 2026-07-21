import { throwError } from 'rxjs';
import {
  MatSnackBar,
  MatSnackBarConfig
} from '@angular/material/snack-bar';
import { SharedConstants } from './SharedConstants';

type SnackBarOpenCall = readonly [
  message: string,
  action?: string,
  config?: MatSnackBarConfig
];

function createSnackBarSpy(): jasmine.SpyObj<MatSnackBar> {
  return jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
}

function lastOpenCall(snackBar: jasmine.SpyObj<MatSnackBar>): SnackBarOpenCall {
  return snackBar.open.calls.mostRecent().args;
}

function lastOpenMessage(snackBar: jasmine.SpyObj<MatSnackBar>): string {
  return lastOpenCall(snackBar)[0];
}

function lastOpenConfig(snackBar: jasmine.SpyObj<MatSnackBar>): MatSnackBarConfig {
  const config = lastOpenCall(snackBar)[2];
  expect(config).toBeDefined();
  if (!config) {
    fail('Expected snack bar config to be provided.');
  }
  return config;
}


describe('SharedConstants - uncovered branches', () => {
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  
  beforeEach(() => {
    snackBar = createSnackBarSpy();
  });
  
  it('errorHandlerLogin with optional msg appends it to the message', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerLogin(snackBar, 'extra-detail'))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          expect(lastOpenMessage(snackBar)).toContain('extra-detail');
          done();
        }
      });
  });
  
  it('errorHandlerLogin without msg does not append anything', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerLogin(snackBar))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          // msg should equal exactly loginFailed with no trailing text
          expect(lastOpenMessage(snackBar)).toBe(SharedConstants.messages.loginFailed);
          done();
        }
      });
  });
  
  it('errorSignup without msg shows only the signupFailed message', () => {
    SharedConstants.errorSignup(snackBar);
    expect(lastOpenMessage(snackBar)).toBe(SharedConstants.messages.signupFailed);
  });
  
  it('errorHandlerData catches errors and shows dataNotSaved message', (done) => {
    throwError(() => new Error('db error'))
      .pipe(SharedConstants.errorHandlerData(snackBar))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          expect(lastOpenMessage(snackBar)).toBe(SharedConstants.messages.dataNotSaved);
          done();
        }
      });
  });
  
  it('errorHandlerData uses 8 second duration and snack-error panelClass', (done) => {
    throwError(() => new Error('db error'))
      .pipe(SharedConstants.errorHandlerData(snackBar))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          expect(lastOpenConfig(snackBar).duration).toBe(8000);
          expect(lastOpenConfig(snackBar).panelClass).toBe('snack-error');
          done();
        }
      });
  });
  
  it('errorHandlerOperation catches errors and shows operationFailed message', (done) => {
    throwError(() => new Error('op error'))
      .pipe(SharedConstants.errorHandlerOperation(snackBar))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          expect(lastOpenMessage(snackBar)).toBe(SharedConstants.messages.operationFailed);
          done();
        }
      });
  });
});