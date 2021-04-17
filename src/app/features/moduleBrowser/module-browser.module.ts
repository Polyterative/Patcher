import { DragDropModule }                             from '@angular/cdk/drag-drop';
import { ScrollingModule }                            from '@angular/cdk/scrolling';
import { CommonModule }                               from '@angular/common';
import { NgModule }                                   from '@angular/core';
import { FlexLayoutModule }                           from '@angular/flex-layout';
import { MatButtonModule }                            from '@angular/material/button';
import { MatCardModule }                              from '@angular/material/card';
import { MatChipsModule }                             from '@angular/material/chips';
import { MatDividerModule }                           from '@angular/material/divider';
import { MatIconModule }                              from '@angular/material/icon';
import { MatPaginatorModule }                         from '@angular/material/paginator';
import { MatSnackBarModule }                          from '@angular/material/snack-bar';
import { MatToolbarModule }                           from '@angular/material/toolbar';
import { MatTooltipModule }                           from '@angular/material/tooltip';
import { RouterModule }                               from '@angular/router';
import { AutoLoadingIndicatorModule }                 from '../../shared-interproject/components/@smart/auto-loading-indicator/auto-loading-indicator.module';
import { DevOnlyWindowModule }                        from '../../shared-interproject/components/@smart/dev-only-window/dev-only-window.module';
import { MatFormEntityModule }                        from '../../shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { RestrictedEntityModule }                     from '../../shared-interproject/components/@smart/restricted-entity/restricted-entity.module';
import { UserDataHandlerComponent }                   from '../../shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { BrandPrimaryButtonModule }                   from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule }                      from '../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { HeroInfoBoxModule }                          from '../../shared-interproject/components/@visual/hero-info-box/hero-info-box.module';
import { LabelValueShowcaseModule }                   from '../../shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { PageHeaderModule }                           from '../../shared-interproject/components/@visual/page-header/page-header.module';
import { ScreenWrapperModule }                        from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { generateSaturnRoutes }                       from '../../shared-interproject/routing-layouts/saturn/saturn.module';
import { CommonSidebarComponent }                     from '../backbone/common-sidebar/common-sidebar.component';
import { ModuleBrowserDataService }                   from './module-browser-data.service';
import { ModuleBrowserFiltersComponent }              from './module-browser-filters/module-browser-filters.component';
import { ModuleBrowserModuleDetailViewRootComponent } from './module-browser-module-detail-view-root/module-browser-module-detail-view-root.component';
import { ModuleBrowserModuleMinimalComponent }        from './module-browser-module-minimal/module-browser-module-minimal.component';
import { ModuleBrowserModuleComponent }               from './module-browser-module/module-browser-module.component';
import { ModuleBrowserRootComponent }                 from './module-browser-root/module-browser-root.component';
import { ModuleDetailsComponent }                     from './module-details/module-details.component';
import { ModuleEditorComponent }                      from './module-editor/module-editor.component';


@NgModule({
  declarations: [
    ModuleBrowserRootComponent,
    ModuleBrowserModuleComponent,
    ModuleBrowserModuleDetailViewRootComponent,
    ModuleBrowserModuleMinimalComponent,
    ModuleDetailsComponent,
    ModuleBrowserFiltersComponent,
    ModuleEditorComponent
  ],
  providers:    [ModuleBrowserDataService],
  imports: [
    CommonModule,
    RouterModule.forChild([
      generateSaturnRoutes('modules', [
        {
          path:      'browser',
          component: ModuleBrowserRootComponent
          // canActivate: [LocalAuthGuardService],
        },
        {
          path:      'details/:id',
          pathMatch: 'full',
          component: ModuleBrowserModuleDetailViewRootComponent
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
      ], 'module-browser')
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
    AutoLoadingIndicatorModule,
    MatFormEntityModule,
    MatToolbarModule,
    PageHeaderModule,
    DevOnlyWindowModule,
    HeroInfoBoxModule,
    RestrictedEntityModule
  ],
  exports:      [
    ModuleBrowserRootComponent,
    ModuleBrowserModuleComponent,
    ModuleBrowserModuleDetailViewRootComponent,
    ModuleBrowserModuleMinimalComponent,
    ModuleDetailsComponent,
    ModuleBrowserFiltersComponent,
    ModuleEditorComponent
  ]
})
export class ModuleBrowserModule {}
