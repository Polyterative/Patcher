import {
  Component,
  Inject
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { AppStateService } from '../../app-state.service';
import { FormTypes, MatFormErgonomicsConfig } from '../../components/@smart/mat-form-entity/form-element-models';
import { IMatFormEntityConfig } from '../../components/@smart/mat-form-entity/mat-form-entity.component';
import { DialogBase } from '../DialogBase';
import { DialogDataInModelBase } from '../DialogDataStructures';
import { ReadOnlyDialogComponent } from '../read-only-dialog/read-only-dialog.component';
import { takeUntil } from "rxjs/operators";
import { BehaviorSubject } from "rxjs";
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from "@angular/material/dialog";


export interface InputDialogDataInModel extends DialogDataInModelBase {
  control: FormControl,
  type: FormTypes,
  label: string,
  hint?: string,
  iconL1?: string,
  ergonomics?: MatFormErgonomicsConfig
}

export interface InputDialogDataOutModel {
  result: string
}

@Component({
  selector: 'app-input-dialog',
  templateUrl: './input-dialog.component.html',
  styleUrls: ['./input-dialog.component.scss'],
  standalone: false
})
export class InputDialogComponent extends DialogBase {
  // primaryClick$: EventEmitter<void>;

  isValid$ = new BehaviorSubject(false);

  get fieldConfig(): IMatFormEntityConfig {
    return {
      control: this.data.control,
      type: this.data.type,
      label: this.data.label,
      code: 'input-dialog-field',
      flex: '100%',
      hint: this.data.hint,
      iconL1: this.data.iconL1,
      ergonomics: {
        autofocus: true,
        enterkeyhint: 'done',
        ...this.data.ergonomics
      }
    };
  }

  constructor(
    public dialogRef: MatDialogRef<ReadOnlyDialogComponent, InputDialogDataOutModel>,
    @Inject(MAT_DIALOG_DATA) public data: InputDialogDataInModel,
    public appState: AppStateService
  ) {
    super(data);
    
    this.data.control.valueChanges
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.isValid$.next(this.data.control.valid);
      });

    this.isValid$.next(this.data.control.valid);
  }

  confirm(): void {
    if (!this.data.control.valid) {
      return;
    }

    this.dialogRef.close({result: this.data.control.value});
  }
}
