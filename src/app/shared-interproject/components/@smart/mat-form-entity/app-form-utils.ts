import { UntypedFormControl } from '@angular/forms';

export class AppFormUtils {
  
  static getErrors(input: UntypedFormControl): string {
    
    const noErrorMessageChar = '';
    
    return input.hasError(Strings.form.errorCode.required) ? StringsIT.form.error_required :
           input.hasError(Strings.form.errorCode.minlength) ? StringsIT.form.error_minLength :
           input.hasError(Strings.form.errorCode.maxlength) ? StringsIT.form.error_maxLength :
           input.hasError(Strings.form.errorCode.max) ? StringsIT.form.error_max :
           input.hasError(Strings.form.errorCode.custom.codeNotValid) ? StringsIT.form.error_codeNotValid :
           input.hasError(Strings.form.errorCode.custom.lessThanOneElement) ? StringsIT.form.error_lessThanOneElement :
           input.hasError(Strings.form.errorCode.custom.notInOptions) ? StringsIT.form.error_notInOptions :
           input.hasError(Strings.form.errorCode.custom.numberNot) ? StringsIT.form.error_numberNot :
           input.hasError(Strings.form.errorCode.custom.numberNotInteger) ? StringsIT.form.error_numberNotInteger :
           input.hasError(Strings.form.errorCode.custom.numberNotPositiveInteger) ? StringsIT.form.error_numberNotPositiveInteger :
           input.hasError(Strings.form.errorCode.custom.numberBiggerThanInterval) ? StringsIT.form.error_numberBiggerThanInterval :
           input.hasError(Strings.form.errorCode.custom.doesNotContainHttps) ? StringsIT.form.error_doesNotContainHttps :
           input.hasError(Strings.form.errorCode.min) ? StringsIT.form.error_min : noErrorMessageChar;
    
  }
  
}

export class Strings {
  static readonly form = {
    errorCode: {
      min:       'min',
      max:       'max',
      required:  'required',
      minlength: 'minlength',
      maxlength: 'maxlength',
      
      custom: {
        codeNotValid:             'codeNotValid',
        lessThanOneElement:       'lessThanOneElement',
        numberNot:                'numberNot',
        numberNotInteger:         'numberNotInteger',
        numberNotPositiveInteger: 'numberNotPositiveInteger',
        notInOptions:             'notInOptions',
        numberBiggerThanInterval: 'numberBiggerThanOffset',
        doesNotContainHttps:      'doesNotContainHttps'
      }
    }
  };
}

export class StringsIT {
  static readonly form = {
    error_required:                 'The field cannot be empty',
    error_minLength:                'Length below minimum',
    error_maxLength:                'Length over maximum',
    error_max:                      'Value above the maximum',
    error_min:                      'Value below minimum',
    error_lessThanOneElement:       'At least one element is required',
    error_codeNotValid:             'The code entered is invalid',
    error_notInOptions:             'Value not present in options',
    error_numberNot:                'The entered value is not a number',
    error_numberNotInteger:         'The number entered is not an integer',
    error_numberNotPositiveInteger: 'The number entered is not a positive integer',
    error_doesNotContainHttps:      'The entered URL does not contain https',
    error_numberBiggerThanInterval: 'The number entered is greater than the interval'
  };
  
  static readonly general = {
    info_data_loading: 'Dati in caricamento...'
  };
}
