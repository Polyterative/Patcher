import { MatSnackBar } from '@angular/material/snack-bar';
import {
    EMPTY,
    Observable
}                      from 'rxjs';
import { catchError }  from 'rxjs/operators';

export class SharedConstants {
    
    public static errorHandlerData<T>(snackBar: MatSnackBar) {
        return catchError<T, Observable<never>>(err => {
            snackBar.open('❌ Data not saved', undefined, {duration: 8000});
            return EMPTY;
        });
    };
    
    public static errorHandlerOperation<T>(snackBar: MatSnackBar) {
        return catchError<T, Observable<never>>(err => {
            snackBar.open('❌ Operation failed', undefined, {duration: 8000});
            return EMPTY;
        });
    };
    
    public static successDelete(snackBar: MatSnackBar) {
        snackBar.open('✅ Deleted', undefined, {duration: 4000});
    };
    
    public static successSave(snackBar: MatSnackBar) {
        snackBar.open('✅ Saved data', undefined, {duration: 4000});
    };
    
    public static successLogin(snackBar: MatSnackBar, message?: string) {
        snackBar.open(`✅ Login Successful ${ message }`, undefined, {duration: 5000});
    };
    
    public static showSuccessUpdate(snackBar: MatSnackBar) {
        snackBar.open('✅ Updated data', undefined, {duration: 1000});
    };
    
}