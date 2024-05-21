import { UntypedFormControl } from '@angular/forms';


export class AppFormUtils {
  
  static getErrors(input: UntypedFormControl): string {
    
    const noErrorMessageChar = '';
    
    return input.hasError(ErrorCodes.form.errorCode.required) ? ErrorMessages.form.error_required :
      input.hasError(ErrorCodes.form.errorCode.minlength) ? ErrorMessages.form.error_minLength :
        input.hasError(ErrorCodes.form.errorCode.maxlength) ? ErrorMessages.form.error_maxLength :
          input.hasError(ErrorCodes.form.errorCode.max) ? ErrorMessages.form.error_max :
            input.hasError(ErrorCodes.form.errorCode.custom.codeNotValid) ? ErrorMessages.form.error_codeNotValid :
              input.hasError(ErrorCodes.form.errorCode.custom.lessThanOneElement) ? ErrorMessages.form.error_lessThanOneElement :
                input.hasError(ErrorCodes.form.errorCode.custom.notInOptions) ? ErrorMessages.form.error_notInOptions :
                  input.hasError(ErrorCodes.form.errorCode.custom.numberNot) ? ErrorMessages.form.error_numberNot :
                    input.hasError(ErrorCodes.form.errorCode.custom.numberNotInteger) ? ErrorMessages.form.error_numberNotInteger :
                      input.hasError(ErrorCodes.form.errorCode.custom.numberNotPositiveInteger) ? ErrorMessages.form.error_numberNotPositiveInteger :
                        input.hasError(ErrorCodes.form.errorCode.custom.numberBiggerThanInterval) ? ErrorMessages.form.error_numberBiggerThanInterval :
                          input.hasError(ErrorCodes.form.errorCode.custom.doesNotContainHttps) ? ErrorMessages.form.error_doesNotContainHttps :
                            input.hasError(ErrorCodes.form.errorCode.min) ? ErrorMessages.form.error_min : noErrorMessageChar;
    
  }
  
}

export class ErrorCodes {
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
        doesNotContainHttps: 'doesNotContainHttps',
        invalidContent:      'invalidContent',
        empty:               'empty'
      }
    }
  };
}

export class ErrorMessages {
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
    error_numberBiggerThanInterval: 'The number entered is greater than the interval',
    error_invalidContent:           'Invalid content',
    error_empty:                    'The field content is empty'
  };
  
  static readonly general = {
    info_data_loading: 'Dati in caricamento...'
  };
}