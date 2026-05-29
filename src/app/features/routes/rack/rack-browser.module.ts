import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { RackModule } from 'src/app/components/rack-parts/rack.module';
import { CommonSidebarComponent } from 'src/app/features/backbone/common-sidebar/common-sidebar.component';
import { RackBrowserDataService } from 'src/app/features/routes/rack/rack-browser-data.service';
import { RackBrowserDetailViewComponent } from 'src/app/features/routes/rack/rack-browser-detail/rack-browser-detail-view.component';
import { LegacyRackRedirectComponent } from 'src/app/features/routes/rack/legacy-rack-redirect/legacy-rack-redirect.component';
import { RackBrowserRootComponent } from 'src/app/features/routes/rack/rack-browser-root/rack-browser-root.component';
import { RackCompositeComponent } from 'src/app/features/routes/rack/rack-composite/rack-composite.component';
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
import { RackListModule } from 'src/app/components/rack-list/rack-list.module';
import { LocalDataFilterComponent } from 'src/app/components/shared-atoms/local-data-filter/local-data-filter/local-data-filter.component';
import { AutoUpdateLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { StatisticsComponent } from "src/app/components/shared-atoms/statistics/statistics.component";
import { RouterModule } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatInputModule } from "@angular/material/input";
import { CommentsModule } from "src/app/components/shared-atoms/comments/comments.module";
import { SharedAtomsModule } from "src/app/components/shared-atoms/shared-atoms.module";
import { AdviceTooltipComponent } from "src/app/shared-interproject/components/@visual/advice-tooltip/advice-tooltip/advice-tooltip.component";



@NgModule({
  declarations: [
    RackBrowserDetailViewComponent,
    RackCompositeComponent,
    RackBrowserRootComponent,
    LegacyRackRedirectComponent
  ],
  exports:      [
    RackBrowserDetailViewComponent
  ],
  providers:    [RackBrowserDataService],
  imports: [
    CommonModule,
    RouterModule.forChild([
      // Legacy numeric ID URLs: resolve via RPC then redirect to /:publicId
      // (public racks) or /links/retired (private/missing). Three segments — listed
      // first so it wins over the two-segment publicId route.
      {
        path: 'details/:id',
        pathMatch: 'full',
        component: LegacyRackRedirectComponent
      },
      // Uranus shell (browser etc.) must come BEFORE the :publicId catch-all
      // so `/racks/browser` matches the listing instead of being treated as
      // a token.
      generateUranusRoutes('', [
        {
          path: 'browser',
          component: RackBrowserRootComponent
          // canActivate: [LocalAuthGuardService],
        },
        {
          path:   '',
          component: CommonSidebarComponent,
          outlet: 'sidebar'
        },
        {
          path:   '',
          component: UserDataHandlerComponent,
          outlet: 'user'
        }
      ]),
      // Canonical token-based detail URL. Two-segment match; anonymous
      // holders of a valid token can view private racks via the SECURITY
      // DEFINER RPC. Declared last so reserved words like `browser` are
      // claimed by the uranus shell above.
      {
        path: ':publicId',
        pathMatch: 'full',
        component: RackBrowserDetailViewComponent
      }
    ]),
    RackModule,
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
    RackListModule,
    StatisticsComponent,
    MatInputModule,
    CommentsModule,
    SharedAtomsModule,
    AdviceTooltipComponent,
  ]
})
export class RackBrowserModule {}
