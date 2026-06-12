import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import {
  RouterModule,
  Routes
} from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { ModuleCollectionPartsModule } from 'src/app/components/module-collection-parts/module-collection-parts.module';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';
import { LibShowcaseGridComponent } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { BrowserResetFiltersButtonComponent } from 'src/app/shared-interproject/components/@visual/browser-reset-filters-button/browser-reset-filters-button.component';
import { EditFabComponent } from 'src/app/shared-interproject/components/@visual/edit-fab/edit-fab.component';
import { HeroClickableTitleComponent } from 'src/app/shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { ModuleListModule } from 'src/app/features/module-browser/module-list/module-list.module';
import { ModuleCollectionsBrowserRootComponent } from './module-collections-browser-root/module-collections-browser-root.component';
import { ModuleCollectionsBrowserDetailComponent } from './module-collections-browser-detail/module-collections-browser-detail.component';
import { ModuleCollectionsListModule } from './module-collections-list/module-collections-list.module';

export const moduleCollectionsPublicRoutes: Routes = [
  {
    path: 'browser',
    component: ModuleCollectionsBrowserRootComponent
  },
  {
    path: 'manage/:collectionId',
    pathMatch: 'full',
    redirectTo: '/collection/:collectionId'
  },
  {
    path: ':publicId',
    component: ModuleCollectionsBrowserDetailComponent
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'browser'
  }
];

@NgModule({
  declarations: [
    ModuleCollectionsBrowserRootComponent,
    ModuleCollectionsBrowserDetailComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule.forChild(moduleCollectionsPublicRoutes),
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    ModulePartsModule,
    ModuleCollectionPartsModule,
    SharedAtomsModule,
    LibShowcaseGridComponent,
    CleanCardComponent,
    AutoContentLoadingIndicatorComponent,
    EmptyStateComponent,
    HeroContentCardComponent,
    ScreenWrapperComponent,
    MatFormEntityComponent,
    BrowserResetFiltersButtonComponent,
    EditFabComponent,
    HeroClickableTitleComponent,
    ModuleListModule,
    ModuleCollectionsListModule
  ]
})
export class ModuleCollectionsModule {}
