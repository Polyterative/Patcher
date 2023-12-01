import { Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DialogDataInModelBase } from './DialogDataStructures';

export class DialogBase  implements DialogDataInModelBase {
  title: string;
  description?: string;

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogDataInModelBase) {
    this.title = data.title;
    this.description = data.description;

  }
}
