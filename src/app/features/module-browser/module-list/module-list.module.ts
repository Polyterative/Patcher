import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { LocalDataFilterComponent } from 'src/app/components/shared-atoms/local-data-filter/local-data-filter/local-data-filter.component';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { FlexboxRowFastComponent } from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { ModuleListComponent } from './module-list.component';

@NgModule({
  declarations: [ModuleListComponent],
  providers: [PatchDetailDataService, RackDetailDataService],
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    ModulePartsModule,
    LocalDataFilterComponent,
    AutoContentLoadingIndicatorComponent,
    EmptyStateComponent,
    MatFormEntityComponent,
    CleanCardComponent,
    FlexboxRowFastComponent,
  ],
  exports: [ModuleListComponent],
})
export class ModuleListModule {}
