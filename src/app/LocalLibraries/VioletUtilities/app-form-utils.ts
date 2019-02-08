import { FormControl } from '@angular/forms';
import { Strings_app } from './app-strings';
import { Strings_it }  from './app-strings-it';

export class AppFormUtils {
  
  static getDefaultErrors(input: FormControl): string {
    
    const noErrorMessageChar = '';
    
    return input.hasError(Strings_app.form.errorCode.required) ? Strings_it.form.error_required :
           input.hasError(Strings_app.form.errorCode.minlength) ? Strings_it.form.error_minLength :
           input.hasError(Strings_app.form.errorCode.maxlength) ? Strings_it.form.error_maxLength :
           input.hasError(Strings_app.form.errorCode.max) ? Strings_it.form.error_max :
           input.hasError(Strings_app.form.errorCode.custom.notInOptions) ? Strings_it.form.error_notInOptions :
           input.hasError(Strings_app.form.errorCode.min) ? Strings_it.form.error_min : noErrorMessageChar;
    
  }
  
}
