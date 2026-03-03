import {
  EMPTY,
  throwError
} from 'rxjs';
import { SharedConstants } from './SharedConstants';


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
  let snackBar: {
    open: jasmine.Spy
  };
  
  beforeEach(() => {
    snackBar = {open: jasmine.createSpy('open').and.returnValue({onAction: () => EMPTY})};
  });
  
  it('successLogin uses 2 second duration', () => {
    SharedConstants.successLogin(snackBar as any);
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[2].duration).toBe(2000);
  });
  
  it('successLogout uses 2 second duration', () => {
    SharedConstants.successLogout(snackBar as any);
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[2].duration).toBe(2000);
  });
  
  it('showSuccessUpdate uses 1 second duration', () => {
    SharedConstants.showSuccessUpdate(snackBar as any);
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[2].duration).toBe(1000);
  });
  
  it('successSaveShort uses 1 second duration', () => {
    SharedConstants.successSaveShort(snackBar as any);
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[2].duration).toBe(1000);
  });
  
  it('all success helpers use snack-success panelClass', () => {
    SharedConstants.successSave(snackBar as any);
    SharedConstants.successDelete(snackBar as any);
    SharedConstants.successSignup(snackBar as any);
    snackBar.open.calls.allArgs().forEach(args => {
      expect(args[2].panelClass).toBe('snack-success');
    });
  });
  
  it('errorLogin uses snack-error panelClass', () => {
    SharedConstants.errorLogin(snackBar as any);
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[2].panelClass).toBe('snack-error');
  });
  
  it('confirmMail uses snack-info panelClass', () => {
    SharedConstants.confirmMail(snackBar as any);
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[2].panelClass).toBe('snack-info');
  });
});


describe('SharedConstants error handlers', () => {
  let snackBar: {
    open: jasmine.Spy
  };
  
  beforeEach(() => {
    snackBar = {open: jasmine.createSpy('open').and.returnValue({onAction: () => EMPTY})};
  });
  
  it('errorHandlerSignup returns EMPTY (does not re-throw)', (done) => {
    let completed = false;
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerSignup(snackBar as any))
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
      .pipe(SharedConstants.errorHandlerLogin(snackBar as any))
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
    SharedConstants.errorSignup(snackBar as any, 'email_taken');
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[0]).toContain('email_taken');
  });
  
  it('errorHandlerData returns EMPTY on error', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerData(snackBar as any))
      .subscribe({
        error: () => fail('should not error'),
        complete: done
      });
  });
  
  it('errorHandlerOperation returns EMPTY on error', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerOperation(snackBar as any))
      .subscribe({
        error: () => fail('should not error'),
        complete: done
      });
  });
  
  it('successCustom uses provided message', () => {
    SharedConstants.successCustom(snackBar as any, 'Custom success!');
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[0]).toBe('Custom success!');
    expect(args[2].panelClass).toBe('snack-success');
  });
  
  it('successCustom falls back to "Done." when no message provided', () => {
    SharedConstants.successCustom(snackBar as any);
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[0]).toBe('Done.');
  });
  
  it('errorCustom uses provided message', () => {
    SharedConstants.errorCustom(snackBar as any, 'Custom error!');
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[0]).toBe('Custom error!');
    expect(args[2].panelClass).toBe('snack-error');
  });
  
  it('errorCustom falls back to operationFailed when no message provided', () => {
    SharedConstants.errorCustom(snackBar as any);
    const args = snackBar.open.calls.mostRecent().args;
    expect(args[0]).toBe(SharedConstants.messages.operationFailed);
  });
  
  it('errorHandlerSignup with extra msg appends it to the message', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerSignup(snackBar as any, 'extra info'))
      .subscribe({
        complete: () => {
          const msg = snackBar.open.calls.mostRecent().args[0];
          expect(msg).toContain('extra info');
          done();
        }
      });
  });
  
  it('errorHandlerLogin with extra msg appends it to the message', (done) => {
    throwError(() => new Error('fail'))
      .pipe(SharedConstants.errorHandlerLogin(snackBar as any, 'extra info'))
      .subscribe({
        complete: () => {
          const msg = snackBar.open.calls.mostRecent().args[0];
          expect(msg).toContain('extra info');
          done();
        }
      });
  });
});