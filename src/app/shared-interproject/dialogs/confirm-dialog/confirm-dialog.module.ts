import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatButtonModule }          from '@angular/material/button';
import { MatDialogModule }          from '@angular/material/dialog';
import { BrandPrimaryButtonModule } from '../../components/@visual/brand-primary-button/brand-primary-button.module';
import { ConfirmDialogComponent }   from './confirm-dialog.component';

@NgModule({
  declarations:    [ConfirmDialogComponent],
  exports:         [ConfirmDialogComponent],
  entryComponents: [ConfirmDialogComponent],
  imports:         [
    CommonModule,
    MatDialogModule,
    FlexLayoutModule,
    MatButtonModule,
    BrandPrimaryButtonModule,
    MatDialogModule,
    MatButtonModule
  ]
})
export class ConfirmDialogModule {}
