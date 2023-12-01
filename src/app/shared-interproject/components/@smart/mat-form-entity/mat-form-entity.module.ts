import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
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
