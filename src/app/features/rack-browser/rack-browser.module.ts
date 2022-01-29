import { DragDropModule }                    from '@angular/cdk/drag-drop';
import { ScrollingModule }                   from '@angular/cdk/scrolling';
import { CommonModule }                      from '@angular/common';
import { NgModule }                          from '@angular/core';
import { FlexLayoutModule }                  from '@angular/flex-layout';
import { MatButtonModule }                   from '@angular/material/button';
import { MatCardModule }                     from '@angular/material/card';
import { MatChipsModule }                    from '@angular/material/chips';
import { MatDividerModule }                  from '@angular/material/divider';
import { MatIconModule }                     from '@angular/material/icon';
import { MatPaginatorModule }                from '@angular/material/paginator';
import { MatSnackBarModule }                 from '@angular/material/snack-bar';
import { MatToolbarModule }                  from '@angular/material/toolbar';
import { MatTooltipModule }                  from '@angular/material/tooltip';
import { RouterModule }                      from '@angular/router';
import { ModulePartsModule }                 from 'src/app/components/module-parts/module-parts.module';
import { RackModule }                        from 'src/app/components/rack-parts/rack.module';
import { CommonSidebarComponent }            from 'src/app/features/backbone/common-sidebar/common-sidebar.component';
import { RackBrowserDataService }            from 'src/app/features/rack-browser/rack-browser-data.service';
import { RackBrowserDetailViewComponent }    from 'src/app/features/rack-browser/rack-browser-detail-view/rack-browser-detail-view.component';
import { RackBrowserRootComponent }          from 'src/app/features/rack-browser/rack-browser-root/rack-browser-root.component';
import { RackCompositeComponent }            from 'src/app/features/rack-browser/rack-composite/rack-composite.component';
import { AutoContentLoadingIndicatorModule } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { DevOnlyWindowModule }               from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window.module';
import { EmptyStateModule }                  from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { MatFormEntityModule }               from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { RestrictedEntityModule }            from 'src/app/shared-interproject/components/@smart/restricted-entity/restricted-entity.module';
import { UserDataHandlerComponent }         from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { BrandPrimaryButtonModule }         from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { FlexboxRowFastModule }             from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.module';
import { HeroContentCardModule }            from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { HeroInfoBoxModule }                from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { HeroItemCardModule }               from 'src/app/shared-interproject/components/@visual/hero-item-card/hero-item-card.module';
import { LabelValueShowcaseModule }         from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { PageHeaderModule }                 from 'src/app/shared-interproject/components/@visual/page-header/page-header.module';
import { ScreenWrapperModule }              from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { WidthLimiterModule }               from 'src/app/shared-interproject/components/@visual/width-limiter/width-limiter.module';
import { generateUranusRoutes }             from 'src/app/shared-interproject/routing-layouts/uranus/uranus.module';
import { RackListModule }                   from '../../components/rack-list/rack-list.module';
import { LocalDataFilterModule }            from '../../components/shared-atoms/local-data-filter/local-data-filter.module';
import { AutoUpdateLoadingIndicatorModule } from '../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module';
import { CleanCardModule }                  from '../../shared-interproject/components/@visual/clean-card/clean-card.module';


const parentPrefix: string = 'racks';

@NgModule({
  declarations: [
    RackBrowserDetailViewComponent,
    RackCompositeComponent,
    RackBrowserRootComponent,
  ],
  exports:      [
    RackBrowserDetailViewComponent
  ],
  providers:    [RackBrowserDataService],
  imports:      [
    CommonModule,
    RouterModule.forChild([
      
      {
        path:      `${ parentPrefix }/details/:id`,
        pathMatch: 'full',
        component: RackBrowserDetailViewComponent
        // children:  []
      },
      generateUranusRoutes(parentPrefix, [
        {
          path:      'browser',
          component: RackBrowserRootComponent
          // canActivate: [LocalAuthGuardService],
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
      ])
    ]),
    RackModule,
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
    AutoUpdateLoadingIndicatorModule,
    LocalDataFilterModule,
    CleanCardModule,
    RackListModule
  ]
})
export class RackBrowserModule {}
