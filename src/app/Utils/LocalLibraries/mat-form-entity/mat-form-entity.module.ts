import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import {
  FormsModule,
  ReactiveFormsModule
}                                 from '@angular/forms';
import { MatAutocompleteModule }  from '@angular/material/autocomplete';
import { MatButtonModule }        from '@angular/material/button';
import { MatChipsModule }         from '@angular/material/chips';
import { MatNativeDateModule }    from '@angular/material/core';
import { MatDatepickerModule }    from '@angular/material/datepicker';
import { MatDialogModule }        from '@angular/material/dialog';
import { MatFormFieldModule }     from '@angular/material/form-field';
import { MatIconModule }          from '@angular/material/icon';
import { MatInputModule }         from '@angular/material/input';
import { MatSelectModule }        from '@angular/material/select';
import { MatTooltipModule }       from '@angular/material/tooltip';
import { MatFormEntityComponent } from './mat-form-entity.component';

@NgModule({
  imports:      [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatTooltipModule,
    MatInputModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatDialogModule
  ],
  declarations: [MatFormEntityComponent],
  exports:      [MatFormEntityComponent]
})
export class MatFormEntityModule {
}
