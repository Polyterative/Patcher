import {
  ChangeDetectionStrategy,
  Component,
  Inject
} from '@angular/core';
import { DialogBase } from '../DialogBase';
import {
  DialogDataInModelBase,
  DialogLabelDefinition
} from '../DialogDataStructures';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from "@angular/material/dialog";


export interface ConfirmDialogDataInModel extends DialogDataInModelBase {
  positive?: DialogLabelDefinition,
  negative?: DialogLabelDefinition;
}

export interface ConfirmDialogDataOutModel {
  answer: boolean;
}

@Component({
  selector:        'lib-confirm-dialog',
  templateUrl:     './confirm-dialog.component.html',
  styleUrls:       ['./confirm-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent extends DialogBase implements ConfirmDialogDataInModel {

  positive?: DialogLabelDefinition;

  // closeDialog(answer: boolean) {
  //   this.dialogRef.close({
  //     answer
  //   });
  // }
  negative?: DialogLabelDefinition;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent, ConfirmDialogDataOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogDataInModel
  ) {

    super(data);
    
    this.negative = data.negative;
    this.positive = data.positive;

  }
}