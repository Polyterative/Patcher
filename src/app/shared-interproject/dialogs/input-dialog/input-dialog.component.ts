import {
    Component,
    Inject
}                                  from '@angular/core';
import { FormControl }             from '@angular/forms';
import {
    MAT_DIALOG_DATA,
    MatDialogRef
}                                  from '@angular/material/dialog';
import { BehaviorSubject }         from 'rxjs';
import { AppStateService }         from '../../app-state.service';
import { FormTypes }               from '../../components/@smart/mat-form-entity/form-element-models';
import { DialogBase }              from '../DialogBase';
import { DialogDataInModelBase }   from '../DialogDataStructures';
import { ReadOnlyDialogComponent } from '../read-only-dialog/read-only-dialog.component';


export interface InputDialogDataInModel extends DialogDataInModelBase {
  control: FormControl,
  type: FormTypes,
  label: string
}

export interface InputDialogDataOutModel {
  result: string
}

@Component({
  selector:    'app-input-dialog',
  templateUrl: './input-dialog.component.html',
  styleUrls:   ['./input-dialog.component.scss']
})
export class InputDialogComponent extends DialogBase {
  // primaryClick$: EventEmitter<void>;

  isValid$ = new BehaviorSubject(false);

  constructor(
    public dialogRef: MatDialogRef<ReadOnlyDialogComponent, InputDialogDataOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: InputDialogDataInModel,
    public appState: AppStateService
  ) {
    super(data);
  }

}