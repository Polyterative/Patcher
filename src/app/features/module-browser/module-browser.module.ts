import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ModuleCompositeComponent } from 'src/app/features/module-browser/module-composite/module-composite.component';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { DevOnlyWindowComponent } from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window/dev-only-window.component';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { RestrictedEntityComponent } from 'src/app/shared-interproject/components/@smart/restricted-entity/restricted-entity/restricted-entity.component';
import { UserDataHandlerComponent } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
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
import { generateUranusRoutes } from 'src/app/shared-interproject/routing-layouts/uranus/uranus.module';
import { ModulePatchesModule } from '../../components/module-patches/module-patches.module';
import { ModuleRacksModule } from '../../components/module-racks/module-racks.module';
import { LocalDataFilterComponent } from '../../components/shared-atoms/local-data-filter/local-data-filter/local-data-filter.component';
import { AutoUpdateLoadingIndicatorComponent } from '../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { AdviceTooltipComponent } from '../../shared-interproject/components/@visual/advice-tooltip/advice-tooltip/advice-tooltip.component';
import { CleanCardComponent } from '../../shared-interproject/components/@visual/clean-card/clean-card.component';
import { ModuleDetailDataCardComponent } from './module-browser-detail/module-detail-data-card/module-detail-data-card.component';
import { ModuleUsageCardComponent } from './module-browser-detail/module-usage-card/module-usage-card.component';
import { ModuleBrowserRootComponent } from './module-browser-root/module-browser-root.component';
import { ModuleBrowserRootModule } from './module-browser-root/module-browser-root.module';
import { ModuleBrowserDetailComponent } from "src/app/features/module-browser/module-browser-detail/module-browser-detail.component";
import { ModuleBrowserDataService } from "src/app/features/module-browser/module-browser-data.service";
import { RouterModule } from "@angular/router";
import { CommonSidebarComponent } from "src/app/features/backbone/common-sidebar/common-sidebar.component";
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { ModulePartsModule } from "src/app/components/module-parts/module-parts.module";
import {
  MatMenu,
  MatMenuItem,
  MatMenuTrigger
} from "@angular/material/menu";
import { CommentsModule } from "src/app/components/shared-atoms/comments/comments.module";
import { CopyableDirective } from "src/app/shared-interproject/app-copy-on-click.directive";
import { LibShowcaseGridComponent, } from "src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component";
import { EditFabComponent } from "src/app/shared-interproject/components/@visual/edit-fab/edit-fab.component";
import { ManufacturerRowComponent } from "src/app/features/manufacturer-detail/manufacturer-browser-root/manufacturer-row/manufacturer-row.component";
import { RecentActivityModule } from "src/app/components/shared-atoms/recent-activity/recent-activity.module";
import { ModuleListModule } from './module-list/module-list.module';
import { ModuleEditorModule } from 'src/app/components/module-parts/module-editor/module-editor.module';
import { ModuleBrowserSharedModule } from 'src/app/features/module-browser/module-browser-shared.module';



@NgModule({
  declarations: [],
  providers:    [],
  imports: [
    ModuleBrowserSharedModule,
    CommonModule,
    RouterModule.forChild([
      
      {
        path: 'details/:id',
        pathMatch: 'full',
        component: ModuleBrowserDetailComponent
      },
      {
        path: 'add',
        loadChildren: () => import('./module-adder/module-adder.module').then(m => m.ModuleAdderModule)
      },
      generateUranusRoutes('', [
        {
          path: 'browser',
          component: ModuleBrowserRootComponent
          // canActivate: [LocalAuthGuardService],
        },
        {
          path: '',
          component: CommonSidebarComponent,
          outlet: 'sidebar'
        },
        {
          path: '',
          component: UserDataHandlerComponent,
          outlet: 'user'
        }
      ])
    ]),
    FlexLayoutModule,
    MatCardModule,
    HeroContentCardComponent,
    MatChipsModule,
    DragDropModule,
    LabelValueShowcaseComponent,
    ScrollingModule,
    ScreenWrapperComponent,
    MatIconModule,
    MatSnackBarModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
    MatTooltipModule,
    MatDividerModule,
    MatPaginatorModule,
    MatButtonToggleModule,
    MatExpansionModule,
    BrandPrimaryButtonComponent,
    BrowserResetFiltersButtonComponent,
    AutoContentLoadingIndicatorComponent,
    MatFormEntityComponent,
    MatToolbarModule,
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
    ModuleEditorModule,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    CommentsModule,
    CopyableDirective,
    LibShowcaseGridComponent,
    EditFabComponent,
    ManufacturerRowComponent,
    RecentActivityModule,
  ],
  exports: [
    ModuleListModule,
    ModuleCompositeComponent,
    ModuleBrowserDetailComponent
  ]
})
export class ModuleBrowserModule {}
