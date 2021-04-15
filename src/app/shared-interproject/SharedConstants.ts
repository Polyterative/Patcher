import { MatSnackBar } from '@angular/material/snack-bar';
import {
  EMPTY,
  Observable
}                      from 'rxjs';
import { catchError }  from 'rxjs/operators';

export class SharedConstants {
  
  static errorHandlerSignup<T>(snackBar: MatSnackBar, msg?: string) {
    return catchError<T, Observable<never>>(err => {
      snackBar.open('❌ Signup not possible:' + msg, undefined, {duration: 8000});
      return EMPTY;
    });
  }
  
  static errorHandlerLogin<T>(snackBar: MatSnackBar, msg?: string) {
    return catchError<T, Observable<never>>(err => {
      snackBar.open('❌ Login  not possible:' + msg, undefined, {duration: 8000});
      return EMPTY;
    });
  }
  
  static errorHandlerData<T>(snackBar: MatSnackBar) {
    return catchError<T, Observable<never>>(err => {
      snackBar.open('❌ Data not saved', undefined, {duration: 8000});
      return EMPTY;
    });
  }
  
  static errorHandlerOperation<T>(snackBar: MatSnackBar) {
    return catchError<T, Observable<never>>(err => {
      snackBar.open('❌ Operation failed', undefined, {duration: 8000});
      return EMPTY;
    });
  }
  
  static errorSignup<T>(snackBar: MatSnackBar, msg?: string) {
    return snackBar.open(`❌ Signup not possible ${ msg }`, undefined, {duration: 5000});
    
  }
  
  static errorLogin<T>(snackBar: MatSnackBar, msg?: string) {
    return snackBar.open(`❌ Login  not possible ${ msg }`, undefined, {duration: 5000});
    
  }
  
  static successDelete(snackBar: MatSnackBar) {
    snackBar.open('✅ Deleted', undefined, {duration: 4000});
  }
  
  static successSave(snackBar: MatSnackBar) {
    snackBar.open('✅ Saved data', undefined, {duration: 4000});
  }
  
  static successLogin(snackBar: MatSnackBar) {
    snackBar.open('✅ Login Successful ', undefined, {duration: 5000});
  }
  
  static successLogout(snackBar: MatSnackBar) {
    snackBar.open('✅ Logout', undefined, {duration: 5000});
  }
  
  static confirmMail(snackBar: MatSnackBar) {
    snackBar.open('Please confirm your mail then login', undefined, {duration: 5000});
  }
  
  static successSignup(snackBar: MatSnackBar) {
    snackBar.open('✅ Login Successful ', undefined, {duration: 5000});
  }
  
  static showSuccessUpdate(snackBar: MatSnackBar) {
    snackBar.open('✅ Updated data', undefined, {duration: 1000});
  }
  
}
