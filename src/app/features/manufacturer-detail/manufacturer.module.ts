import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { CommonSidebarComponent } from 'src/app/features/backbone/common-sidebar/common-sidebar.component';
import { UserDataHandlerComponent } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { AutoContentLoadingIndicatorModule } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { CleanCardModule } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.module';
import { generateUranusRoutes } from 'src/app/shared-interproject/routing-layouts/uranus/uranus.module';

import { ManufacturerDetailComponent } from './manufacturer-detail.component';
import { ManufacturerBrowserRootComponent } from './manufacturer-browser-root/manufacturer-browser-root.component';
import { ModuleBrowserModule } from 'src/app/features/module-browser/module-browser.module';


const parentPrefix = 'manufacturers';

@NgModule({
  declarations: [
    ManufacturerDetailComponent,
    ManufacturerBrowserRootComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: `${ parentPrefix }/details/:id`,
        pathMatch: 'full',
        component: ManufacturerDetailComponent
      },
      generateUranusRoutes(parentPrefix, [
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
    HeroContentCardModule,
    ScreenWrapperModule,
    CleanCardModule,
    AutoContentLoadingIndicatorModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    ModuleBrowserModule
  ]
})
export class ManufacturerModule {}