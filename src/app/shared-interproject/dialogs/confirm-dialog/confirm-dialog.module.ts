import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { BrandPrimaryButtonModule } from '../../components/@visual/brand-primary-button/brand-primary-button.module';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { MatFormEntityModule } from "../../components/@smart/mat-form-entity/mat-form-entity.module";
import { MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";


@NgModule({
  declarations: [ConfirmDialogComponent],
  exports: [ConfirmDialogComponent],
  imports: [
    CommonModule,
    MatDialogModule,
    FlexLayoutModule,
    MatButtonModule,
    BrandPrimaryButtonModule,
    MatDialogModule,
    MatFormEntityModule
  ]
})
export class ConfirmDialogModule {
}