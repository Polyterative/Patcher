import {
  EMPTY,
  throwError
} from 'rxjs';
import { SharedConstants } from './SharedConstants';


describe('SharedConstants', () => {
  let snackBar: {
    open: jasmine.Spy
  };
  
  beforeEach(() => {
    snackBar = {
      open: jasmine.createSpy('open').and.returnValue({
        onAction: () => EMPTY
      })
    };
  });
  
  it('opens expected success/info snack messages', () => {
    SharedConstants.confirmMail(snackBar as any);
    SharedConstants.successSignup(snackBar as any);
    SharedConstants.showSuccessUpdate(snackBar as any);
    SharedConstants.successCustom(snackBar as any, 'ok');
    SharedConstants.successDelete(snackBar as any);
    SharedConstants.successSave(snackBar as any);
    SharedConstants.successSaveShort(snackBar as any);
    SharedConstants.successLogin(snackBar as any);
    SharedConstants.successLogout(snackBar as any);
    
    expect(snackBar.open).toHaveBeenCalledTimes(9);
    expect(snackBar.open).toHaveBeenCalledWith('ok', undefined, {duration: 4000, panelClass: 'snack-success'});
  });
  
  it('uses fallback message for successCustom and errorCustom', () => {
    SharedConstants.successCustom(snackBar as any);
    SharedConstants.errorCustom(snackBar as any);
    
    expect(snackBar.open).toHaveBeenCalledWith('Done.', undefined, {duration: 4000, panelClass: 'snack-success'});
    expect(snackBar.open).toHaveBeenCalledWith(SharedConstants.messages.operationFailed, undefined, {duration: 5000, panelClass: 'snack-error'});
  });
  
  it('opens expected auth error messages', () => {
    SharedConstants.errorSignup(snackBar as any, 'reason');
    SharedConstants.errorLogin(snackBar as any);
    
    expect(snackBar.open).toHaveBeenCalledWith(
      jasmine.stringContaining('reason'),
      undefined,
      {duration: 5000, panelClass: 'snack-error'}
    );
    expect(snackBar.open).toHaveBeenCalledWith(
      SharedConstants.messages.loginFailed,
      undefined,
      {duration: 5000, panelClass: 'snack-error'}
    );
  });
  
  it('errorHandlerSignup catches and reports error', (done) => {
    throwError(() => new Error('x'))
      .pipe(SharedConstants.errorHandlerSignup(snackBar as any, 'extra'))
      .subscribe({
        next: () => fail('should not emit values'),
        complete: () => {
          expect(snackBar.open).toHaveBeenCalledWith(
            jasmine.stringContaining('extra'),
            undefined,
            {duration: 8000, panelClass: 'snack-error'}
          );
          done();
        }
      });
  });
  
  it('errorHandlerLogin catches and reports error', (done) => {
    throwError(() => new Error('x'))
      .pipe(SharedConstants.errorHandlerLogin(snackBar as any))
      .subscribe({
        next: () => fail('should not emit values'),
        complete: () => {
          expect(snackBar.open).toHaveBeenCalledWith(
            SharedConstants.messages.loginFailed,
            undefined,
            {duration: 8000, panelClass: 'snack-error'}
          );
          done();
        }
      });
  });
  
  it('errorHandlerData catches and reports error', (done) => {
    throwError(() => new Error('x'))
      .pipe(SharedConstants.errorHandlerData(snackBar as any))
      .subscribe({
        next: () => fail('should not emit values'),
        complete: () => {
          expect(snackBar.open).toHaveBeenCalledWith(
            SharedConstants.messages.dataNotSaved,
            undefined,
            {duration: 8000, panelClass: 'snack-error'}
          );
          done();
        }
      });
  });
  
  it('errorHandlerOperation catches and reports error', (done) => {
    throwError(() => new Error('x'))
      .pipe(SharedConstants.errorHandlerOperation(snackBar as any))
      .subscribe({
        next: () => fail('should not emit values'),
        complete: () => {
          expect(snackBar.open).toHaveBeenCalledWith(
            SharedConstants.messages.operationFailed,
            undefined,
            {duration: 8000, panelClass: 'snack-error'}
          );
          done();
        }
      });
  });
  
  it('exports fade-in animation config', () => {
    expect(SharedConstants).toBeTruthy();
    expect((SharedConstants as any).messages).toBeDefined();
  });
});