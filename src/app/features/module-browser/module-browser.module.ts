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
import { CommonSidebarComponent }            from 'src/app/features/backbone/common-sidebar/common-sidebar.component';
import { ModuleBrowserDataService }          from 'src/app/features/module-browser/module-browser-data.service';
import { ModuleBrowserDetailComponent }      from 'src/app/features/module-browser/module-browser-detail/module-browser-detail.component';
import { ModuleBrowserRootComponent }        from 'src/app/features/module-browser/module-browser-root/module-browser-root.component';
import { ModuleCompositeComponent }          from 'src/app/features/module-browser/module-composite/module-composite.component';
import { ModuleListComponent }               from 'src/app/features/module-browser/module-list/module-list.component';
import { AutoContentLoadingIndicatorModule } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { DevOnlyWindowModule }               from 'src/app/shared-interproject/components/@smart/dev-only-window/dev-only-window.module';
import { EmptyStateModule }                  from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { MatFormEntityModule }               from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { RestrictedEntityModule }            from 'src/app/shared-interproject/components/@smart/restricted-entity/restricted-entity.module';
import { UserDataHandlerComponent }          from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { BrandPrimaryButtonModule }          from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { FlexboxRowFastModule }              from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.module';
import { HeroContentCardModule }             from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { HeroInfoBoxModule }                 from 'src/app/shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { HeroItemCardModule }                from 'src/app/shared-interproject/components/@visual/hero-item-card/hero-item-card.module';
import { LabelValueShowcaseModule }          from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { PageHeaderModule }                  from 'src/app/shared-interproject/components/@visual/page-header/page-header.module';
import { ScreenWrapperModule }               from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { WidthLimiterModule }                from 'src/app/shared-interproject/components/@visual/width-limiter/width-limiter.module';
import { generateUranusRoutes }              from 'src/app/shared-interproject/routing-layouts/uranus/uranus.module';
import { ModulePatchesModule }               from '../../components/module-patches/module-patches.module';
import { ModuleRacksModule }                 from '../../components/module-racks/module-racks.module';
import { LocalDataFilterModule }             from '../../components/shared-atoms/local-data-filter/local-data-filter.module';
import { AutoUpdateLoadingIndicatorModule }  from '../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module';
import { CleanCardModule }                   from '../../shared-interproject/components/@visual/clean-card/clean-card.module';

const parentPrefix = 'modules';

@NgModule({
  declarations: [
    ModuleBrowserRootComponent,
    ModuleBrowserDetailComponent,
    ModuleCompositeComponent,
    ModuleListComponent
  ],
  providers:    [ModuleBrowserDataService],
  imports:      [
    CommonModule,
    RouterModule.forChild([
      
      {
        path:      `${ parentPrefix }/details/:id`,
        pathMatch: 'full',
        component: ModuleBrowserDetailComponent
        // children:  []
      },
      generateUranusRoutes(parentPrefix, [
        {
          path:      'browser',
          component: ModuleBrowserRootComponent
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
    ModuleRacksModule,
    ModulePatchesModule
  ],
  exports:      [
    ModuleListComponent,
    ModuleBrowserDetailComponent
  ]
})
export class ModuleBrowserModule {}
