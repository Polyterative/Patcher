import {
  ChangeDetectionStrategy,
  Component,
  Inject
}                     from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
}                     from '@angular/material/dialog';
import { DialogBase } from '../DialogBase';
import {
  DialogDataInModelBase,
  DialogLabelDefinition
}                     from '../DialogDataStructures';

export interface ConfirmDialogDataInModel extends DialogDataInModelBase {
  positive?: DialogLabelDefinition,
  negative?: DialogLabelDefinition;
  autofocusPositive?: boolean;
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

    if (data.negative && data.positive) {
      this.negative = data.negative;
      this.positive = data.positive;
    }

  }
}