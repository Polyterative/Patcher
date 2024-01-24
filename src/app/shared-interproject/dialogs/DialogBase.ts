import {Inject} from '@angular/core';
import {MAT_DIALOG_DATA} from '@angular/material/dialog';
import {DialogDataInModelBase} from './DialogDataStructures';
import {SubManager} from "../directives/subscription-manager";

export class DialogBase extends SubManager implements DialogDataInModelBase {
  title: string;
  description?: string;
  
  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogDataInModelBase) {
    super();
    this.title = data.title;
    this.description = data.description;
    
  }
}
