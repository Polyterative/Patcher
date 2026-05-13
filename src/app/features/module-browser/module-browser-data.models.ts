import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { MinimalModule } from '../../models/module';
import {
  FormTypes,
  ISelectable
} from '../../shared-interproject/components/@smart/mat-form-entity/form-element-models';


export type ModuleList = MinimalModule[] | null;

export interface ModuleOrderOption {
  id: string;
  name: string;
}

export interface IdNameOption {
  id: string;
  name: string;
}

export type HpConditionOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<=';

export interface HpConditionOption {
  id: HpConditionOperator;
  name: string;
}

export interface IdNumberOption {
  id: number | undefined;
  name: string;
}

export interface ModuleTextField {
  code: string;
  flex: string;
  control: FormControl<string>;
  label: string;
  type: FormTypes;
}

export interface ModuleSelectField<T> {
  code: string;
  flex: string;
  control: FormControl<T>;
  label: string;
  type: FormTypes;
  options$: Observable<T[]>;
}

export interface ModuleMultiselectField<T> {
  code: string;
  flex: string;
  control: FormControl<T[]>;
  label: string;
  type: FormTypes;
  options$: Observable<T[]>;
}

export interface ModuleAutocompleteField {
  code: string;
  flex: string;
  control: FormControl<string>;
  label: string;
  type: FormTypes;
  options$: Observable<IdNameOption[]>;
}

export interface ModuleBrowserFields {
  name: ModuleTextField;
  description: ModuleTextField;
  hp: ModuleTextField;
  manufacturers: ModuleAutocompleteField;
  hpCondition: ModuleSelectField<HpConditionOption>;
  order: ModuleSelectField<ModuleOrderOption>;
  standard: ModuleSelectField<IdNumberOption>;
  tags: ModuleMultiselectField<ISelectable>;
}
