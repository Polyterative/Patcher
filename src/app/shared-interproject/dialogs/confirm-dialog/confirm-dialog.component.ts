import {
  ChangeDetectionStrategy,
  Component,
  Inject
} from '@angular/core';
import { DialogBase } from '../DialogBase';
import { DialogLabelDefinition } from '../DialogDataStructures';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from "@angular/material/dialog";
import {
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from './confirm-dialog.types';

export type { ConfirmDialogDataInModel, ConfirmDialogDataOutModel };

@Component({
  selector: 'lib-confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ConfirmDialogComponent extends DialogBase implements ConfirmDialogDataInModel {

  positive?: DialogLabelDefinition;

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