import {
  ChangeDetectionStrategy,
  Component,
  Inject
} from '@angular/core';
import { DialogBase } from '../DialogBase';
import { DialogDataInModelBase } from '../DialogDataStructures';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from "@angular/material/dialog";


export interface ReadOnlyDialogDataInModel extends DialogDataInModelBase {
}

export interface ReadOnlyDialogDataOutModel {
}

@Component({
  selector:        'lib-read-only-dialog',
  templateUrl:     './read-only-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReadOnlyDialogComponent extends DialogBase {

  constructor(
    public dialogRef: MatDialogRef<ReadOnlyDialogComponent, ReadOnlyDialogDataOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: ReadOnlyDialogDataInModel
  ) {
    super(data);
  }

}