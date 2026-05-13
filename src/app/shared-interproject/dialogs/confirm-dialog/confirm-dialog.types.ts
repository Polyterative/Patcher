import {
  DialogDataInModelBase,
  DialogLabelDefinition
} from '../DialogDataStructures';

export interface ConfirmDialogDataInModel extends DialogDataInModelBase {
  positive?: DialogLabelDefinition;
  negative?: DialogLabelDefinition;
}

export interface ConfirmDialogDataOutModel {
  answer: boolean;
}
