import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { LocalDataFilterComponent } from './local-data-filter/local-data-filter.component';


@NgModule({
  declarations: [
    LocalDataFilterComponent
  ],
  imports:      [
    CommonModule,
    MatFormEntityComponent
  ],
  exports:      [
    LocalDataFilterComponent
  ]
})
export class LocalDataFilterModule {}