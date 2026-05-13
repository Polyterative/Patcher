import {
  ChangeDetectionStrategy,
  Component,
  Inject
} from '@angular/core';
import { DialogBase } from '../DialogBase';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from "@angular/material/dialog";
import {
  ReadOnlyDialogDataInModel,
  ReadOnlyDialogDataOutModel
} from './read-only-dialog.types';

export type { ReadOnlyDialogDataInModel, ReadOnlyDialogDataOutModel };

@Component({
  selector: 'lib-read-only-dialog',
  templateUrl: './read-only-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ReadOnlyDialogComponent extends DialogBase {

  constructor(
    public dialogRef: MatDialogRef<ReadOnlyDialogComponent, ReadOnlyDialogDataOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: ReadOnlyDialogDataInModel
  ) {
    super(data);
  }

}