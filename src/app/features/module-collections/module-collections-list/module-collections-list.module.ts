import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { FlexboxRowFastComponent } from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';
import { ModuleCollectionCardModule } from 'src/app/components/module-collection-parts/module-collection-card/module-collection-card.module';
import { ModuleCollectionsListComponent } from './module-collections-list.component';

@NgModule({
  declarations: [ModuleCollectionsListComponent],
  imports: [
    CommonModule,
    MatButtonModule,
    AutoContentLoadingIndicatorComponent,
    CleanCardComponent,
    EmptyStateComponent,
    FlexboxRowFastComponent,
    ModuleCollectionCardModule
  ],
  exports: [ModuleCollectionsListComponent]
})
export class ModuleCollectionsListModule {}
