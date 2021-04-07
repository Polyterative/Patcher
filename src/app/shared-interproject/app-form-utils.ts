import { FormControl } from '@angular/forms';

export class AppFormUtils {

  static getErrors(input: FormControl): string {

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
        numberBiggerThanInterval: 'numberBiggerThanOffset'
      }
    }
  };
}

export class StringsIT {
  static readonly form = {
    error_required:                 'Il campo non può essere vuoto',
    error_minLength:                'Lunghezza sotto il minimo',
    error_maxLength:                'Lunghezza sopra il massimo',
    error_max:                      'Valore sopra il massimo',
    error_min:                      'Valore sotto il minimo',
    error_lessThanOneElement:       'È richiesto almeno un elemento',
    error_codeNotValid:             'Il codice inserito non è valido',
    error_notInOptions:             'Valore non presente tra le opzioni',
    error_numberNot:                'Il valore inserito non è un numero',
    error_numberNotInteger:         'Il numero inserito non è un intero',
    error_numberNotPositiveInteger: 'Il numero inserito non è un intero positivo',
    error_numberBiggerThanInterval: 'Il numero inserito è maggiore dell\'intervallo'
  };

  static readonly general = {
    info_data_loading: 'Dati in caricamento...'
  };
}

