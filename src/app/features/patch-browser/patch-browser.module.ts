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
import { PatchBrowserRootComponent } from 'src/app/features/patch-browser/patch-browser-root/patch-browser-root.component';
import { PatchCompositeComponent } from 'src/app/features/patch-browser/patch-composite/patch-composite.component';
import { AutoContentLoadingIndicatorModule } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { DevOnlyWindowModule } from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window.module';
import { EmptyStateModule } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { MatFormEntityModule } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { RestrictedEntityModule } from 'src/app/shared-interproject/components/@smart/restricted-entity/restricted-entity.module';
import { UserDataHandlerComponent } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { FlexboxRowFastModule } from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { HeroInfoBoxModule } from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { HeroItemCardModule } from 'src/app/shared-interproject/components/@visual/hero-item-card/hero-item-card.module';
import { LabelValueShowcaseModule } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { PageHeaderModule } from 'src/app/shared-interproject/components/@visual/page-header/page-header.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { WidthLimiterModule } from 'src/app/shared-interproject/components/@visual/width-limiter/width-limiter.module';
import { generateUranusRoutes } from 'src/app/shared-interproject/routing-layouts/uranus/uranus.module';
import { PatchListModule } from '../../components/patch-list/patch-list.module';
import { CommentsModule } from '../../components/shared-atoms/comments/comments.module';
import { LocalDataFilterModule } from '../../components/shared-atoms/local-data-filter/local-data-filter.module';
import { CleanCardModule } from '../../shared-interproject/components/@visual/clean-card/clean-card.module';
import { MatCardModule } from "@angular/material/card";
import { MatChipsModule } from "@angular/material/chips";
import { MatIconModule } from "@angular/material/icon";
import { MatSnackBarModule } from "@angular/material/snack-bar";
import { MatButtonModule } from "@angular/material/button";
import { MatTooltipModule } from "@angular/material/tooltip";
import { MatDividerModule } from "@angular/material/divider";
import { MatPaginatorModule } from "@angular/material/paginator";
import { MatToolbarModule } from "@angular/material/toolbar";
import { MatSlideToggleModule } from "@angular/material/slide-toggle";


const parentPrefix = 'patches';

@NgModule({
  declarations: [
    PatchBrowserDetailViewComponent,
    PatchCompositeComponent,
    PatchBrowserRootComponent
  ],
  exports:      [
    PatchBrowserDetailViewComponent
  ],
  providers:    [PatchBrowserDataService],
  imports: [
    CommonModule,
    
    RouterModule.forRoot([
      {
        path: `${ parentPrefix }/details/:id`,
        pathMatch: 'full',
        component: PatchBrowserDetailViewComponent
        // children:  []
      },
      generateUranusRoutes(parentPrefix, [
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
      ])
    ], {scrollPositionRestoration: 'enabled'}),
    PatchModule,
    FlexLayoutModule,
    MatCardModule,
    HeroContentCardModule,
    MatChipsModule,
    DragDropModule,
    LabelValueShowcaseModule,
    ScrollingModule,
    ScreenWrapperModule,
    MatIconModule,
    MatSnackBarModule,
    MatButtonModule,
    MatTooltipModule,
    MatDividerModule,
    MatPaginatorModule,
    BrandPrimaryButtonModule,
    AutoContentLoadingIndicatorModule,
    MatFormEntityModule,
    MatToolbarModule,
    PageHeaderModule,
    DevOnlyWindowModule,
    HeroInfoBoxModule,
    RestrictedEntityModule,
    ModulePartsModule,
    FlexboxRowFastModule,
    WidthLimiterModule,
    HeroItemCardModule,
    EmptyStateModule,
    CommentsModule,
    LocalDataFilterModule,
    CleanCardModule,
    PatchListModule,
    MatSlideToggleModule
  ]
})
export class PatchBrowserModule {}