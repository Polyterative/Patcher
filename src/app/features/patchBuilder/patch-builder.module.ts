import { CommonModule }              from '@angular/common';
import { NgModule }                  from '@angular/core';
import { FlexLayoutModule }          from '@angular/flex-layout';
import { MatCardModule }             from '@angular/material/card';
import { MatExpansionModule }        from '@angular/material/expansion';
import { MatIconModule }             from '@angular/material/icon';
import { RouterModule }              from '@angular/router';
import { ModulePartsModule }         from '../../components/module-parts/module-parts.module';
import { UserDataHandlerComponent }  from '../../shared-interproject/components/@smart/user-data-handler/user-data-handler.component';
import { BrandPrimaryButtonModule }  from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule }     from '../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule }       from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { generateSaturnRoutes }      from '../../shared-interproject/routing-layouts/saturn/saturn.module';
import { CommonSidebarComponent }    from '../backbone/common-sidebar/common-sidebar.component';
import { UserAuthGuard }             from '../backbone/login/user-auth-guard.service';
import { ModuleBrowserModule }       from '../moduleBrowser/module-browser.module';
import { PatchBuilderDataService }   from './patch-builder-data.service';
import { PatchBuilderRootComponent } from './patch-builder-root.component';

@NgModule({
  declarations: [
    PatchBuilderRootComponent
  ],
  providers:    [PatchBuilderDataService],
  imports: [
    CommonModule,
    RouterModule.forChild([
      generateSaturnRoutes('patch', [
        {
          path:      'builder',
          component: PatchBuilderRootComponent
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
      ], 'Patch builder', [UserAuthGuard])
    ]),
    FlexLayoutModule,
    BrandPrimaryButtonModule,
    ScreenWrapperModule,
    MatExpansionModule,
    MatIconModule,
    MatCardModule,
    HeroContentCardModule,
    ModuleBrowserModule,
    ModulePartsModule
  ],
  exports:      [
    PatchBuilderRootComponent
  ]
})
export class PatchBuilderModule {}
