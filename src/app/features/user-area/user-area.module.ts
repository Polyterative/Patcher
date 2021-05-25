import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatCardModule }            from '@angular/material/card';
import { MatExpansionModule }       from '@angular/material/expansion';
import { MatIconModule }            from '@angular/material/icon';
import { RouterModule }             from '@angular/router';
import { PatchBrowserModule }       from 'src/app/features/patch-browser/patch-browser.module';
import { RackBrowserModule }        from 'src/app/features/rack-browser/rack-browser.module';
import { UserModulesModule }        from 'src/app/features/user-area/user-modules/user-modules.module';
import { UserPatchesComponent }     from 'src/app/features/user-area/user-patches/user-patches.component';
import { UserRacksComponent }       from 'src/app/features/user-area/user-racks/user-racks.component';
import { generateUranusRoutes }     from 'src/app/shared-interproject/routing-layouts/uranus/uranus.module';
import { EmptyStateModule }         from '../../shared-interproject/components/@smart/empty-state/empty-state.module';
import { UserDataHandlerComponent } from '../../shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { BrandPrimaryButtonModule } from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule }    from '../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule }      from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { CommonSidebarComponent }   from '../backbone/common-sidebar/common-sidebar.component';
import { UserAuthGuard }            from '../backbone/login/user-auth-guard.service';
import { ModuleBrowserModule }      from '../module-browser/module-browser.module';
import { UserAreaRootComponent }    from './user-area-root/user-area-root.component';


@NgModule({
  declarations: [
    UserAreaRootComponent,
    UserRacksComponent,
    UserPatchesComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      generateUranusRoutes('user', [
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
      ], undefined, [UserAuthGuard])
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
    PatchBrowserModule,
    RackBrowserModule,
    UserModulesModule
  ],
  exports: [
    UserAreaRootComponent
  ]
})
export class UserAreaModule {}
