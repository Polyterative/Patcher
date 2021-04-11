import { Injectable }   from '@angular/core';
import { FormControl }  from '@angular/forms';
import { AppFormUtils } from './app-form-utils';

@Injectable()
export class AppStateService {

  /*
   *  this one is needed in service form to be able to access it from the HTML
   *
   */
  readonly globalUtils = {
    errorProvider: (formControl: FormControl) => AppFormUtils.getErrors(formControl)
  };


}