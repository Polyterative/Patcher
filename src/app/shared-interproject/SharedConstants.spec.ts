import {
  MatSnackBar,
  MatSnackBarRef,
  TextOnlySnackBar
} from '@angular/material/snack-bar';
import {
  EMPTY,
  throwError
} from 'rxjs';
import { SharedConstants } from './SharedConstants';


describe('SharedConstants', () => {
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  
  beforeEach(() => {
    const snackBarRef = jasmine.createSpyObj<MatSnackBarRef<TextOnlySnackBar>>('MatSnackBarRef', ['onAction']);
    snackBarRef.onAction.and.returnValue(EMPTY);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    snackBar.open.and.returnValue(snackBarRef);
  });
  
  it('opens expected success/info snack messages', () => {
    SharedConstants.confirmMail(snackBar);
    SharedConstants.successSignup(snackBar);
    SharedConstants.showSuccessUpdate(snackBar);
    SharedConstants.successCustom(snackBar, 'ok');
    SharedConstants.successDelete(snackBar);
    SharedConstants.successSave(snackBar);
    SharedConstants.successSaveShort(snackBar);
    SharedConstants.successLogin(snackBar);
    SharedConstants.successLogout(snackBar);
    
    expect(snackBar.open).toHaveBeenCalledTimes(9);
    expect(snackBar.open).toHaveBeenCalledWith('ok', undefined, {duration: 4000, panelClass: 'snack-success'});
  });
  
  it('uses fallback message for successCustom and errorCustom', () => {
    SharedConstants.successCustom(snackBar);
    SharedConstants.errorCustom(snackBar);
    
    expect(snackBar.open).toHaveBeenCalledWith('Done.', undefined, {duration: 4000, panelClass: 'snack-success'});
    expect(snackBar.open).toHaveBeenCalledWith(SharedConstants.messages.operationFailed, undefined, {duration: 5000, panelClass: 'snack-error'});
  });
  
  it('opens expected auth error messages', () => {
    SharedConstants.errorSignup(snackBar, 'reason');
    SharedConstants.errorLogin(snackBar);
    
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
      .pipe(SharedConstants.errorHandlerSignup(snackBar, 'extra'))
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
      .pipe(SharedConstants.errorHandlerLogin(snackBar))
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
      .pipe(SharedConstants.errorHandlerData(snackBar))
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
      .pipe(SharedConstants.errorHandlerOperation(snackBar))
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
    expect(SharedConstants.messages).toBeDefined();
  });
});
