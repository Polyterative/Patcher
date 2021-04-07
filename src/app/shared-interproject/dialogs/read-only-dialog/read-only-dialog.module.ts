import { CommonModule }            from '@angular/common';
import { NgModule }                from '@angular/core';
import { FlexLayoutModule }        from '@angular/flex-layout';
import { MatDialogModule }         from '@angular/material/dialog';
import { ReadOnlyDialogComponent } from './read-only-dialog.component';

@NgModule({
  declarations:    [ReadOnlyDialogComponent],
  exports:         [ReadOnlyDialogComponent],
  entryComponents: [ReadOnlyDialogComponent],
  imports:         [
    CommonModule,
    MatDialogModule,
    FlexLayoutModule
  ]
})
export class ReadOnlyDialogModule {
}
