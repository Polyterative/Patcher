import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AutoContentLoadingIndicatorComponent } from '../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { EmptyStateComponent } from '../../shared-interproject/components/@smart/empty-state/empty-state.component';
import { CleanCardComponent } from '../../shared-interproject/components/@visual/clean-card/clean-card.component';
import { FlexboxRowFastComponent } from '../../shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';
import { PatchMicroModule } from '../patch-micro/patch-micro.module';
import { LocalDataFilterComponent } from '../shared-atoms/local-data-filter/local-data-filter/local-data-filter.component';
import { PatchListComponent } from './patch-list.component';


@NgModule({
  declarations: [PatchListComponent],
  exports:      [PatchListComponent],
  imports:      [
    CommonModule,
    AutoContentLoadingIndicatorComponent,
    EmptyStateComponent,
    LocalDataFilterComponent,
    FlexboxRowFastComponent,
    CleanCardComponent,
    PatchMicroModule
  ]
})
export class PatchListModule {}