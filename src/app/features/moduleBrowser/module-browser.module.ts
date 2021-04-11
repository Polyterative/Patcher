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
import { MatFormEntityModule }                        from '../../shared-interproject/components/@smart/mat-form-entity/mat-form-entity.module';
import { BrandPrimaryButtonModule }                   from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule }                      from '../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { LabelValueShowcaseModule }                   from '../../shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { PageHeaderModule }                           from '../../shared-interproject/components/@visual/page-header/page-header.module';
import { ScreenWrapperModule }                        from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { ModuleBrowserDataService }                   from './module-browser-data.service';
import { ModuleBrowserFiltersComponent }              from './module-browser-filters/module-browser-filters.component';
import { ModuleBrowserModuleDetailViewRootComponent } from './module-browser-module-detail-view-root/module-browser-module-detail-view-root.component';
import { ModuleBrowserModuleMinimalComponent }        from './module-browser-module-minimal/module-browser-module-minimal.component';
import { ModuleBrowserModuleComponent }               from './module-browser-module/module-browser-module.component';
import { ModuleBrowserRootComponent }                 from './module-browser-root/module-browser-root.component';
import { ModuleDetailsComponent }                     from './module-details/module-details.component';


@NgModule({
    declarations: [
        ModuleBrowserRootComponent,
        ModuleBrowserModuleComponent,
        ModuleBrowserModuleDetailViewRootComponent,
        ModuleBrowserModuleMinimalComponent,
        ModuleDetailsComponent,
        ModuleBrowserFiltersComponent
    ],
    providers:    [ModuleBrowserDataService],
    imports: [
        CommonModule,
        RouterModule.forRoot([
            {
                path:      'browser',
                component: ModuleBrowserRootComponent
                // pathMatch: 'full'
            },
            {
                path:      'details/:id',
                pathMatch: 'full',
                component: ModuleBrowserModuleDetailViewRootComponent
                // children:  []
            }
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
        PageHeaderModule
    ],
    exports:      [
        ModuleBrowserRootComponent,
        ModuleBrowserModuleComponent,
        ModuleBrowserModuleDetailViewRootComponent,
        ModuleBrowserModuleMinimalComponent,
        ModuleDetailsComponent,
        ModuleBrowserFiltersComponent
    ]
})
export class ModuleBrowserModule {}