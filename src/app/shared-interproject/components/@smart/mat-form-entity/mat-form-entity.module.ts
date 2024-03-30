import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { MatFormEntityComponent } from './mat-form-entity.component';
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatInputModule } from "@angular/material/input";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatChipsModule } from "@angular/material/chips";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { MatNativeDateModule } from "@angular/material/core";
import { MatSelectModule } from "@angular/material/select";
import { MatAutocompleteModule } from "@angular/material/autocomplete";
import { MatDialogModule } from "@angular/material/dialog";
import { FormValidPipe } from "src/app/shared-interproject/components/@smart/mat-form-entity/is-control-valid.pipe";


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatTooltipModule,
    MatInputModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDialogModule,
  ],
  // providers: [ //put these in the user module, user of the lib
  //   {
  //     provide:  DateAdapter,
  //     useClass: CustomDateAdapterPlainMondayStart
  //   }
  // ],
  declarations: [
    MatFormEntityComponent,
    FormValidPipe
  ],
  exports: [
    MatFormEntityComponent,
    FormValidPipe
  ]
})
export class MatFormEntityModule {
}