import { CommonModule }              from '@angular/common';
import { NgModule }                  from '@angular/core';
import { ReactiveFormsModule }       from '@angular/forms';
import { DaysInWeekPickerComponent } from './days-in-week-picker.component';


@NgModule({
  declarations: [
    DaysInWeekPickerComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule
  ]
})
export class DaysInWeekPickerModule {}
