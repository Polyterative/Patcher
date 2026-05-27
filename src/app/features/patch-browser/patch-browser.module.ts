import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import { CommonSidebarComponent } from 'src/app/features/backbone/common-sidebar/common-sidebar.component';
import { PatchBrowserDataService } from 'src/app/features/patch-browser/patch-browser-data.service';
import { PatchBrowserDetailViewComponent } from 'src/app/features/patch-browser/patch-browser-detail/patch-browser-detail-view.component';
import { LegacyPatchRedirectComponent } from 'src/app/features/patch-browser/legacy-patch-redirect/legacy-patch-redirect.component';
import { PatchBrowserRootComponent } from 'src/app/features/patch-browser/patch-browser-root/patch-browser-root.component';
import { PatchCompositeComponent } from 'src/app/features/patch-browser/patch-composite/patch-composite.component';
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
import { AutoUpdateLoadingIndicatorComponent } from '../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { PatchListModule } from '../../components/patch-list/patch-list.module';
import { LocalDataFilterComponent } from '../../components/shared-atoms/local-data-filter/local-data-filter/local-data-filter.component';
import { CleanCardComponent } from '../../shared-interproject/components/@visual/clean-card/clean-card.component';
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";
import { CommentsModule } from "src/app/components/shared-atoms/comments/comments.module";
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { SharedAtomsModule } from 'src/app/components/shared-atoms/shared-atoms.module';



@NgModule({
  declarations: [
    PatchBrowserDetailViewComponent,
    PatchCompositeComponent,
    PatchBrowserRootComponent,
    LegacyPatchRedirectComponent
  ],
  exports:      [
    PatchBrowserDetailViewComponent
  ],
  providers:    [PatchBrowserDataService],
  imports: [
    CommonModule,
    
    RouterModule.forChild([
      // Legacy numeric-ID URL: redirects public patches to /:publicId,
      // sends private/missing links to /links/retired.
      {
        path: 'details/:id',
        pathMatch: 'full',
        component: LegacyPatchRedirectComponent
      },
      // Uranus shell must come before the :publicId catch-all so
      // /patches/browser doesn't get treated as a token.
      generateUranusRoutes('', [
        {
          path: 'browser',
          component: PatchBrowserRootComponent
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
      ]),
      // Canonical token-based detail URL.
      {
        path: ':publicId',
        pathMatch: 'full',
        component: PatchBrowserDetailViewComponent
      }
    ]),
    PatchModule,
    FlexLayoutModule,
    MatCardModule,
    HeroContentCardComponent,
    DragDropModule,
    LabelValueShowcaseComponent,
    ScrollingModule,
    ScreenWrapperComponent,
    MatIconModule,
    MatSnackBarModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule,
    MatPaginatorModule,
    BrandPrimaryButtonComponent,
    BrowserResetFiltersButtonComponent,
    AutoContentLoadingIndicatorComponent,
    AutoUpdateLoadingIndicatorComponent,
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
    LocalDataFilterComponent,
    CleanCardComponent,
    PatchListModule,
    MatSlideToggleModule,
    CommentsModule,
    StatisticsComponent,
    SharedAtomsModule
  ]
})
export class PatchBrowserModule {}
