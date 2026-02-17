import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatFormEntityComponent } from '../../components/@smart/mat-form-entity/mat-form-entity.component';
import { BrandPrimaryButtonModule } from '../../components/@visual/brand-primary-button/brand-primary-button.module';
import { InputDialogComponent } from './input-dialog.component';
import { MatDialogModule } from "@angular/material/dialog";


@NgModule({
  declarations:    [InputDialogComponent],
  imports:         [
    CommonModule,
    FlexLayoutModule,
    MatDialogModule,
    MatFormEntityComponent,
    BrandPrimaryButtonModule,
  ],
  exports:         [InputDialogComponent]
})
export class InputDialogModule {}