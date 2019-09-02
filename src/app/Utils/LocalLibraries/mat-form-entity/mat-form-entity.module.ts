import { CommonModule }           from '@angular/common';
import { NgModule }               from '@angular/core';
import { FlexLayoutModule }       from '@angular/flex-layout';
import {
    FormsModule,
    ReactiveFormsModule
}                                 from '@angular/forms';
import {
    MatAutocompleteModule,
    MatButtonModule,
    MatChipsModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatTooltipModule
}                                 from '@angular/material';
import { LoggerService }          from '../VioletUtilities/logger/logger.service';
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
        MatIconModule,
        MatChipsModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatSelectModule,
        MatAutocompleteModule,
        MatDialogModule
    ],
    declarations: [MatFormEntityComponent],
    exports:      [MatFormEntityComponent],
    providers:    [
        LoggerService
    ]
})
export class MatFormEntityModule {
}
