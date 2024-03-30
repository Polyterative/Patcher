import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { MatLegacyAutocompleteModule as MatAutocompleteModule } from '@angular/material/legacy-autocomplete';
import { MatLegacyButtonModule as MatButtonModule } from '@angular/material/legacy-button';
import { MatLegacyChipsModule as MatChipsModule } from '@angular/material/legacy-chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatLegacyDialogModule as MatDialogModule } from '@angular/material/legacy-dialog';
import { MatLegacyFormFieldModule as MatFormFieldModule } from '@angular/material/legacy-form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatLegacyInputModule as MatInputModule } from '@angular/material/legacy-input';
import { MatLegacySelectModule as MatSelectModule } from '@angular/material/legacy-select';
import { MatLegacyTooltipModule as MatTooltipModule } from '@angular/material/legacy-tooltip';
import { FormValidPipe } from './is-control-valid.pipe';
import { MatFormEntityComponent } from './mat-form-entity.component';


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
    MatDialogModule
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
  exports:      [
    MatFormEntityComponent,
    FormValidPipe
  ]
})
export class MatFormEntityModule {
}