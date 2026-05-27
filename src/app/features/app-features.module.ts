import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MAT_DIALOG_DEFAULT_OPTIONS } from "@angular/material/dialog";


@NgModule({
  declarations: [],
  providers:    [
    {
      provide:  MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: {
        hasBackdrop:       true,
        disableClose:      false,
        closeOnNavigation: true
      }
    }
  ],
  imports:      [
    CommonModule
  ]
})
export class AppFeaturesModule {}
