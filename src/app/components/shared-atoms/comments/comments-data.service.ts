import { Injectable } from '@angular/core';
import {
  FormControl,
  Validators
}                     from '@angular/forms';
import { FormTypes }  from '../../../shared-interproject/components/@smart/mat-form-entity/form-element-models';

@Injectable()
export class CommentsDataService {
  
  formTypes = FormTypes;
  
  fields = {
    
    submit: {
      label:   'Add a comment',
      code:    'submit',
      flex:    '6rem',
      control: new FormControl('', Validators.compose([
        Validators.required,
        Validators.minLength(1),
        Validators.maxLength(144)
      ])),
      type:    FormTypes.AREA
      
    }
  };
  
  constructor() { }
}
