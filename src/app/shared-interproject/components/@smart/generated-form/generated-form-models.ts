import { FormControl } from '@angular/forms';
import { FormTypes, ISelectable } from '../mat-form-entity/form-element-models';

export namespace GeneratedForm {
  export interface AutoFormEntity {
    control: FormControl;
    label: string,
    refName: string,
    type: FormTypes,
    flex: string,
    options?: ISelectable[]
  }
}
