import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatCardModule }            from '@angular/material/card';
import { MatExpansionModule }       from '@angular/material/expansion';
import { MatIconModule }            from '@angular/material/icon';
import { RouterModule }             from '@angular/router';
import { PatchBrowserModule }       from 'src/app/features/patch-browser/patch-browser.module';
import { UserPatchesComponent }     from 'src/app/features/user-area/user-patches/user-patches.component';
import { UserRacksComponent }       from 'src/app/features/user-area/user-racks/user-racks.component';
import { EmptyStateModule }         from '../../shared-interproject/components/@smart/empty-state/empty-state.module';
import { UserDataHandlerComponent } from '../../shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { BrandPrimaryButtonModule } from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule }    from '../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule }      from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { generateSaturnRoutes }     from '../../shared-interproject/routing-layouts/saturn/saturn.module';
import { CommonSidebarComponent }   from '../backbone/common-sidebar/common-sidebar.component';
import { UserAuthGuard }            from '../backbone/login/user-auth-guard.service';
import { ModuleBrowserModule }      from '../module-browser/module-browser.module';
import { UserAreaRootComponent }    from './user-area-root/user-area-root.component';
import { UserModulesComponent }     from './user-modules/user-modules.component';


@NgModule({
  declarations: [
    UserAreaRootComponent,
    UserModulesComponent,
    UserRacksComponent,
    UserPatchesComponent
  ],
  imports:      [
    CommonModule,
    RouterModule.forChild([
      generateSaturnRoutes('user', [
        {
          path:      'area',
          component: UserAreaRootComponent
        },
        // {
        //   path:      'details/:id',
        //   pathMatch: 'full',
        //   component: ModuleBrowserModuleDetailViewRootComponent
        //   // children:  []
        // },
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
      ], 'Personal area', [UserAuthGuard])
    ]),
    FlexLayoutModule,
    BrandPrimaryButtonModule,
    ScreenWrapperModule,
    MatExpansionModule,
    MatIconModule,
    MatCardModule,
    ModuleBrowserModule,
    HeroContentCardModule,
    EmptyStateModule,
    PatchBrowserModule
  ],
  exports:      [
    UserAreaRootComponent,
    UserModulesComponent
  ]
})
export class UserAreaModule {}