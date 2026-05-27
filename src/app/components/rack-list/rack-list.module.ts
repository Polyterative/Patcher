import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AutoContentLoadingIndicatorComponent } from '../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { EmptyStateComponent } from '../../shared-interproject/components/@smart/empty-state/empty-state.component';
import { CleanCardComponent } from '../../shared-interproject/components/@visual/clean-card/clean-card.component';
import { FlexboxRowFastComponent } from '../../shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';
import { RackMicroModule } from '../rack-micro/rack-micro.module';
import { LocalDataFilterComponent } from '../shared-atoms/local-data-filter/local-data-filter/local-data-filter.component';
import { RackListComponent } from './rack-list.component';


@NgModule({
  declarations: [RackListComponent],
  exports:      [RackListComponent],
  imports:      [
    CommonModule,
    AutoContentLoadingIndicatorComponent,
    EmptyStateComponent,
    FlexboxRowFastComponent,
    CleanCardComponent,
    RackMicroModule,
    LocalDataFilterComponent
  ]
})
export class RackListModule {}