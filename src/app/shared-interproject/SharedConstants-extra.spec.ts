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

function allOpenConfigs(snackBar: jasmine.SpyObj<MatSnackBar>): MatSnackBarConfig[] {
  const calls: readonly SnackBarOpenCall[] = snackBar.open.calls.allArgs();
  return calls.map((args) => {
    const config = args[2];
    expect(config).toBeDefined();
    if (!config) {
      fail('Expected snack bar config to be provided.');
    }
    return config;
  });
}


describe('SharedConstants.messages', () => {
  it('resetPassword messages are defined and non-empty strings', () => {
    const rp = SharedConstants.messages.resetPassword;
    const keys = Object.keys(rp) as (keyof typeof rp)[];
    for (const key of keys) {
      expect(typeof rp[key]).toBe('string');
      expect((rp[key] as string).length).toBeGreaterThan(0);
    }
  });
  
  it('operationFailed message is a non-empty string', () => {
    expect(SharedConstants.messages.operationFailed.length).toBeGreaterThan(0);
  });
  
  it('loginFailed message is a non-empty string', () => {
    expect(SharedConstants.messages.loginFailed.length).toBeGreaterThan(0);
  });
});


describe('SharedConstants snack helpers duration contracts', () => {
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  
  beforeEach(() => {
    snackBar = createSnackBarSpy();
  });
  
  it('successLogin uses 2 second duration', () => {
    SharedConstants.successLogin(snackBar);
    expect(lastOpenConfig(snackBar).duration).toBe(2000);
  });
  
  it('successLogout uses 2 second duration', () => {
    SharedConstants.successLogout(snackBar);
    expect(lastOpenConfig(snackBar).duration).toBe(2000);
  });
  
  it('showSuccessUpdate uses 1 second duration', () => {
    SharedConstants.showSuccessUpdate(snackBar);
    expect(lastOpenConfig(snackBar).duration).toBe(1000);
  });
  
  it('successSaveShort uses 1 second duration', () => {
    SharedConstants.successSaveShort(snackBar);
    expect(lastOpenConfig(snackBar).duration).toBe(1000);
  });
  
  it('all success helpers use snack-success panelClass', () => {
    SharedConstants.successSave(snackBar);
    SharedConstants.successDelete(snackBar);
    SharedConstants.successSignup(snackBar);
    allOpenConfigs(snackBar).forEach(config => {
      expect(config.panelClass).toBe('snack-success');
    });
  });
  
  it('errorLogin uses snack-error panelClass', () => {
    SharedConstants.errorLogin(snackBar);
    expect(lastOpenConfig(snackBar).panelClass).toBe('snack-error');
  });
  
  it('confirmMail uses snack-info panelClass', () => {
    SharedConstants.confirmMail(snackBar);
    expect(lastOpenConfig(snackBar).panelClass).toBe('snack-info');
  });
});


describe('SharedConstants error handlers', () => {
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  
  beforeEach(() => {
    snackBar = createSnackBarSpy();
  });
  
  it('errorHandlerSignup returns EMPTY (does not re-throw)', (done) => {
    let completed = false;
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerSignup(snackBar))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          completed = true;
          done();
        }
      });
    expect(completed).toBeTrue();
  });
  
  it('errorHandlerLogin returns EMPTY (does not re-throw)', (done) => {
    let completed = false;
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerLogin(snackBar))
      .subscribe({
        error: () => fail('should not error'),
        complete: () => {
          completed = true;
          done();
        }
      });
    expect(completed).toBeTrue();
  });
  
  it('errorSignup includes the reason in the snack message', () => {
    SharedConstants.errorSignup(snackBar, 'email_taken');
    expect(lastOpenMessage(snackBar)).toContain('email_taken');
  });
  
  it('errorHandlerData returns EMPTY on error', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerData(snackBar))
      .subscribe({
        error: () => fail('should not error'),
        complete: done
      });
  });
  
  it('errorHandlerOperation returns EMPTY on error', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerOperation(snackBar))
      .subscribe({
        error: () => fail('should not error'),
        complete: done
      });
  });
  
  it('successCustom uses provided message', () => {
    SharedConstants.successCustom(snackBar, 'Custom success!');
    expect(lastOpenMessage(snackBar)).toBe('Custom success!');
    expect(lastOpenConfig(snackBar).panelClass).toBe('snack-success');
  });
  
  it('successCustom falls back to "Done." when no message provided', () => {
    SharedConstants.successCustom(snackBar);
    expect(lastOpenMessage(snackBar)).toBe('Done.');
  });
  
  it('errorCustom uses provided message', () => {
    SharedConstants.errorCustom(snackBar, 'Custom error!');
    expect(lastOpenMessage(snackBar)).toBe('Custom error!');
    expect(lastOpenConfig(snackBar).panelClass).toBe('snack-error');
  });
  
  it('errorCustom falls back to operationFailed when no message provided', () => {
    SharedConstants.errorCustom(snackBar);
    expect(lastOpenMessage(snackBar)).toBe(SharedConstants.messages.operationFailed);
  });
  
  it('errorHandlerSignup with extra msg appends it to the message', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerSignup(snackBar, 'extra info'))
      .subscribe({
        complete: () => {
          expect(lastOpenMessage(snackBar)).toContain('extra info');
          done();
        }
      });
  });
  
  it('errorHandlerLogin with extra msg appends it to the message', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerLogin(snackBar, 'extra info'))
      .subscribe({
        complete: () => {
          expect(lastOpenMessage(snackBar)).toContain('extra info');
          done();
        }
      });
  });
});