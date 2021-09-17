import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { MatFormEntityModule }      from '../../../shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { LocalDataFilterComponent } from './local-data-filter/local-data-filter.component';


@NgModule({
  declarations: [
    LocalDataFilterComponent
  ],
  imports:      [
    CommonModule,
    MatFormEntityModule
  ],
  exports:      [
    LocalDataFilterComponent
  ]
})
export class LocalDataFilterModule {}
