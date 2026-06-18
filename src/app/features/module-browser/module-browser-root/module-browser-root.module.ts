import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { DevOnlyWindowComponent } from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window/dev-only-window.component';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { RestrictedEntityComponent } from 'src/app/shared-interproject/components/@smart/restricted-entity/restricted-entity/restricted-entity.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { BrowserResetFiltersButtonComponent } from 'src/app/shared-interproject/components/@visual/browser-reset-filters-button/browser-reset-filters-button.component';
import { FlexboxRowFastComponent } from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { HeroInfoBoxComponent } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.component';
import { HeroInfoBoxTextDirective } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box-text.directive';
import { HeroItemCardComponent } from 'src/app/shared-interproject/components/@visual/hero-item-card/hero-item-card.component';
import { LabelValueShowcaseComponent } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { PageHeaderComponent } from 'src/app/shared-interproject/components/@visual/page-header/page-header/page-header.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { WidthLimiterComponent } from 'src/app/shared-interproject/components/@visual/width-limiter/width-limiter.component';
import { ModulePatchesModule } from '../../../components/module-patches/module-patches.module';
import { ModuleRacksModule } from '../../../components/module-racks/module-racks.module';
import { LocalDataFilterComponent } from '../../../components/shared-atoms/local-data-filter/local-data-filter/local-data-filter.component';
import { AutoUpdateLoadingIndicatorComponent } from '../../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { AdviceTooltipComponent } from '../../../shared-interproject/components/@visual/advice-tooltip/advice-tooltip/advice-tooltip.component';
import { CleanCardComponent } from '../../../shared-interproject/components/@visual/clean-card/clean-card.component';
import { ModuleBrowserRootComponent } from './module-browser-root.component';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { CommentsModule } from 'src/app/components/shared-atoms/comments/comments.module';
import { CopyableDirective } from 'src/app/shared-interproject/app-copy-on-click.directive';
import { LibShowcaseGridComponent } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';
import { EditFabComponent } from 'src/app/shared-interproject/components/@visual/edit-fab/edit-fab.component';
import { ManufacturerRowComponent } from 'src/app/features/manufacturer-detail/manufacturer-browser-root/manufacturer-row/manufacturer-row.component';
import { RecentActivityModule } from 'src/app/components/shared-atoms/recent-activity/recent-activity.module';
import { ModuleBrowserDataService } from 'src/app/features/module-browser/module-browser-data.service';
import { ModuleBrowserRecentActivityService } from 'src/app/features/module-browser/module-browser-recent-activity.service';
import { ModuleListModule } from '../module-list/module-list.module';


/**
 * Non-routed module that declares and exports ModuleBrowserRootComponent.
 *
 * Exists so the component can be embedded in non-module-browser feature modules
 * (e.g. the rack editor) without importing the routed ModuleBrowserModule, which
 * is forbidden by scripts/checks/check-route-module-imports.cjs.
 */
@NgModule({
  declarations: [
    ModuleBrowserRootComponent
  ],
  providers: [
    ModuleBrowserDataService,
    ModuleBrowserRecentActivityService
  ],
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    ScrollingModule,
    DragDropModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatSnackBarModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatDividerModule,
    MatToolbarModule,
    MatButtonToggleModule,
    MatExpansionModule,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    HeroContentCardComponent,
    LabelValueShowcaseComponent,
    ScreenWrapperComponent,
    BrandPrimaryButtonComponent,
    BrowserResetFiltersButtonComponent,
    AutoContentLoadingIndicatorComponent,
    MatFormEntityComponent,
    PageHeaderComponent,
    DevOnlyWindowComponent,
    HeroInfoBoxComponent,
    HeroInfoBoxTextDirective,
    RestrictedEntityComponent,
    ModulePartsModule,
    FlexboxRowFastComponent,
    WidthLimiterComponent,
    HeroItemCardComponent,
    EmptyStateComponent,
    AutoUpdateLoadingIndicatorComponent,
    LocalDataFilterComponent,
    CleanCardComponent,
    ModuleRacksModule,
    ModulePatchesModule,
    AdviceTooltipComponent,
    ModuleListModule,
    CommentsModule,
    CopyableDirective,
    LibShowcaseGridComponent,
    EditFabComponent,
    ManufacturerRowComponent,
    RecentActivityModule
  ],
  exports: [
    ModuleBrowserRootComponent
  ]
})
export class ModuleBrowserRootModule {}
