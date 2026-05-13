import { FormControl } from '@angular/forms';
import { FormTypes, MatFormErgonomicsConfig } from '../../components/@smart/mat-form-entity/form-element-models';
import { DialogDataInModelBase } from '../DialogDataStructures';

export interface InputDialogDataInModel extends DialogDataInModelBase {
  control: FormControl;
  type: FormTypes;
  label: string;
  hint?: string;
  iconL1?: string;
  ergonomics?: MatFormErgonomicsConfig;
}

export interface InputDialogDataOutModel {
  result: string;
}
