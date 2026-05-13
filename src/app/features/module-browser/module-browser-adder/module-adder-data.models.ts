import { UntypedFormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';

interface ModuleAdderFormField {
  code: string;
  flex: string;
  control: UntypedFormControl;
  label: string;
  type: FormTypes;
}

interface ModuleAdderFormFieldWithHint extends ModuleAdderFormField {
  hint: string;
}

interface ModuleAdderFormFieldWithOptions extends ModuleAdderFormField {
  options$: Observable<{ id: string; name: string }[]>;
}

interface ModuleAdderFormFieldWithHintAndOptions extends ModuleAdderFormFieldWithHint {
  options$: Observable<{ id: string; name: string }[]>;
}

export interface ModuleAdderFormData {
  standard: ModuleAdderFormFieldWithOptions;
  diy: ModuleAdderFormFieldWithHintAndOptions;
  name: ModuleAdderFormFieldWithHint;
  hp: ModuleAdderFormField;
  description: ModuleAdderFormFieldWithHint;
  manual: ModuleAdderFormFieldWithHint;
  manufacturer: ModuleAdderFormFieldWithHintAndOptions;
}
