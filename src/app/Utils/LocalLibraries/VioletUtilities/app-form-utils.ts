import { FormControl } from '@angular/forms';
import { Strings }     from 'src/app/Utils/LocalLibraries/VioletUtilities/app-strings';
import { StringsIT }   from 'src/app/Utils/LocalLibraries/VioletUtilities/app-strings-it';

export class AppFormUtils {

    static getDefaultErrors(input: FormControl): string {

        const noErrorMessageChar = '';

        return input.hasError(Strings.form.errorCode.required) ? StringsIT.form.error_required :
               input.hasError(Strings.form.errorCode.minlength) ? StringsIT.form.error_minLength :
               input.hasError(Strings.form.errorCode.maxlength) ? StringsIT.form.error_maxLength :
               input.hasError(Strings.form.errorCode.max) ? StringsIT.form.error_max :
               input.hasError(Strings.form.errorCode.custom.notInOptions) ? StringsIT.form.error_notInOptions :
               input.hasError(Strings.form.errorCode.min) ? StringsIT.form.error_min : noErrorMessageChar;

    }

}
