import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatDialogModule }          from '@angular/material/dialog';
import { MatProgressBarModule }     from '@angular/material/progress-bar';
import { MatFormEntityModule }      from '../../components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule } from '../../components/@visual/brand-primary-button/brand-primary-button.module';
import { InputDialogComponent }     from './input-dialog.component';


@NgModule({
  declarations:    [InputDialogComponent],
  entryComponents: [InputDialogComponent],
  imports:         [
    CommonModule,
    FlexLayoutModule,
    MatDialogModule,
    MatFormEntityModule,
    BrandPrimaryButtonModule,
    MatProgressBarModule
  ],
  exports:         [InputDialogComponent]
})
export class InputDialogModule {}
