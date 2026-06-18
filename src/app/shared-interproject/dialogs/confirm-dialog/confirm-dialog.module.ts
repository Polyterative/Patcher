import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrandPrimaryButtonComponent } from '../../components/@visual/brand-primary-button/brand-primary-button.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { MatFormEntityComponent } from "../../components/@smart/mat-form-entity/mat-form-entity.component";
import { MatDialogModule } from "@angular/material/dialog";
import { MatButtonModule } from "@angular/material/button";


@NgModule({
  declarations: [ConfirmDialogComponent],
  exports: [ConfirmDialogComponent],
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    BrandPrimaryButtonComponent,
    MatDialogModule,
    MatFormEntityComponent
  ]
})
export class ConfirmDialogModule {
}