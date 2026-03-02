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
});