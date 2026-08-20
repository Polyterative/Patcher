import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  TimeagoModule,
  TimeagoPipe
} from 'ngx-timeago';

import { CommonSidebarComponent } from 'src/app/features/backbone/common-sidebar/common-sidebar.component';
import { UserDataHandlerComponent } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { AutoUpdateLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { generateUranusRoutes } from 'src/app/shared-interproject/routing-layouts/uranus/uranus.module';

import { ManufacturerDetailComponent } from './manufacturer-detail.component';
import { ManufacturerBrowserRootComponent } from './manufacturer-browser-root/manufacturer-browser-root.component';
import { ManufacturerBrowserRootDataService } from './manufacturer-browser-root/manufacturer-browser-root-data.service';
import { ManufacturerRowComponent } from './manufacturer-browser-root/manufacturer-row/manufacturer-row.component';
import { ManufacturerUpdatedBadgeComponent } from './manufacturer-browser-root/manufacturer-row/manufacturer-updated-badge/manufacturer-updated-badge.component';
import { ModuleListModule } from 'src/app/features/module-browser/module-list/module-list.module';
import { ModulePartsModule } from "src/app/components/module-parts/module-parts.module";
import { LibShowcaseGridComponent } from 'src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component';


@NgModule({
  declarations: [
    ManufacturerDetailComponent,
    ManufacturerBrowserRootComponent,
  ],
  providers: [
    TimeagoPipe,
    ManufacturerBrowserRootDataService
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'details/:id',
        pathMatch: 'full',
        component: ManufacturerDetailComponent
      },
      generateUranusRoutes('', [
        {
          path: 'browser',
          component: ManufacturerBrowserRootComponent
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
    HeroContentCardComponent,
    ScreenWrapperComponent,
    CleanCardComponent,
    AutoContentLoadingIndicatorComponent,
    AutoUpdateLoadingIndicatorComponent,
    EmptyStateComponent,
    MatFormEntityComponent,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    TimeagoModule,
    ModuleListModule,
    ModulePartsModule,
    LibShowcaseGridComponent,
    ManufacturerRowComponent,
    ManufacturerUpdatedBadgeComponent
  ]
})
export class ManufacturerModule {}