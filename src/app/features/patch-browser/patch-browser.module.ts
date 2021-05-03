import { DragDropModule }                  from '@angular/cdk/drag-drop';
import { ScrollingModule }                 from '@angular/cdk/scrolling';
import { CommonModule }                    from '@angular/common';
import { NgModule }                        from '@angular/core';
import { FlexLayoutModule }                from '@angular/flex-layout';
import { MatButtonModule }                 from '@angular/material/button';
import { MatCardModule }                   from '@angular/material/card';
import { MatChipsModule }                  from '@angular/material/chips';
import { MatDividerModule }                from '@angular/material/divider';
import { MatIconModule }                   from '@angular/material/icon';
import { MatPaginatorModule }              from '@angular/material/paginator';
import { MatSnackBarModule }               from '@angular/material/snack-bar';
import { MatToolbarModule }                from '@angular/material/toolbar';
import { MatTooltipModule }                from '@angular/material/tooltip';
import { RouterModule }                    from '@angular/router';
import { ModulePartsModule }               from 'src/app/components/module-parts/module-parts.module';
import { PatchModule }                     from 'src/app/components/patch-parts/patch.module';
import { CommonSidebarComponent }          from 'src/app/features/backbone/common-sidebar/common-sidebar.component';
import { PatchBrowserDetailViewComponent } from 'src/app/features/patch-browser/pages/patch-browser-detail-view/patch-browser-detail-view.component';
import { PatchBrowserRootComponent }       from 'src/app/features/patch-browser/pages/patch-browser-root/patch-browser-root.component';
import { PatchBrowserDataService }         from 'src/app/features/patch-browser/patch-browser-data.service';
import { PatchCompositeComponent }         from 'src/app/features/patch-browser/patch-composite/patch-composite.component';
import { PatchListComponent }              from 'src/app/features/patch-browser/patch-list/patch-list.component';
import { AutoLoadingIndicatorModule }      from 'src/app/shared-interproject/components/@smart/auto-loading-indicator/auto-loading-indicator.module';
import { DevOnlyWindowModule }             from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window.module';
import { MatFormEntityModule }             from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { RestrictedEntityModule }          from 'src/app/shared-interproject/components/@smart/restricted-entity/restricted-entity.module';
import { UserDataHandlerComponent }        from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { BrandPrimaryButtonModule }        from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { FlexboxRowFastModule }            from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.module';
import { HeroContentCardModule }           from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { HeroInfoBoxModule }               from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { LabelValueShowcaseModule }        from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { PageHeaderModule }                from 'src/app/shared-interproject/components/@visual/page-header/page-header.module';
import { ScreenWrapperModule }             from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { WidthLimiterModule }              from 'src/app/shared-interproject/components/@visual/width-limiter/width-limiter.module';
import { generateUranusRoutes }            from 'src/app/shared-interproject/routing-layouts/uranus/uranus.module';


@NgModule({
  declarations: [
    PatchListComponent,
    PatchBrowserDetailViewComponent,
    PatchCompositeComponent,
    PatchBrowserRootComponent,
    PatchListComponent
  ],
  exports:      [
    PatchListComponent
  ],
  providers:    [PatchBrowserDataService],
  imports:      [
    CommonModule,
    RouterModule.forChild([
      generateUranusRoutes('patches', [
        {
          path:      'browser',
          component: PatchBrowserRootComponent
          // canActivate: [LocalAuthGuardService],
        },
        {
          path:      'details/:id',
          pathMatch: 'full',
          component: PatchBrowserDetailViewComponent
          // children:  []
        },
        {
          path:      '',
          component: CommonSidebarComponent,
          outlet:    'sidebar'
        },
        {
          path:      '',
          component: UserDataHandlerComponent,
          outlet:    'user'
        }
      ], 'patch-browser')
    ]),
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
    AutoLoadingIndicatorModule,
    MatFormEntityModule,
    MatToolbarModule,
    PageHeaderModule,
    DevOnlyWindowModule,
    HeroInfoBoxModule,
    RestrictedEntityModule,
    ModulePartsModule,
    FlexboxRowFastModule,
    WidthLimiterModule
  ]
})
export class PatchBrowserModule {}
