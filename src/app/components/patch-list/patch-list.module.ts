import { CommonModule }                      from '@angular/common';
import { NgModule }                          from '@angular/core';
import { AutoContentLoadingIndicatorModule } from '../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { CleanCardModule }                   from '../../shared-interproject/components/@visual/clean-card/clean-card.module';
import { FlexboxRowFastModule }              from '../../shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.module';
import { PatchMicroModule }                  from '../patch-micro/patch-micro.module';
import { LocalDataFilterModule }             from '../shared-atoms/local-data-filter/local-data-filter.module';
import { PatchListComponent }                from './patch-list.component';


@NgModule({
  declarations: [PatchListComponent],
  exports:      [PatchListComponent],
  imports:      [
    CommonModule,
    AutoContentLoadingIndicatorModule,
    LocalDataFilterModule,
    FlexboxRowFastModule,
    CleanCardModule,
    PatchMicroModule
  ]
})
export class PatchListModule {}
