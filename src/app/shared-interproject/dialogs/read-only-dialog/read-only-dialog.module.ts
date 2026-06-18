import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { ReadOnlyDialogComponent } from './read-only-dialog.component';


@NgModule({
  declarations:    [ReadOnlyDialogComponent],
  exports:         [ReadOnlyDialogComponent],
  imports:         [
    CommonModule,
    MatDialogModule
  ]
})
export class ReadOnlyDialogModule {
}