import { CommonModule }             from '@angular/common';
import { NgModule }                 from '@angular/core';
import { FlexLayoutModule }         from '@angular/flex-layout';
import { MatButtonModule }          from '@angular/material/button';
import { MatCardModule }            from '@angular/material/card';
import { MatExpansionModule }       from '@angular/material/expansion';
import { MatIconModule }            from '@angular/material/icon';
import { MatToolbarModule }         from '@angular/material/toolbar';
import { RouterModule }             from '@angular/router';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule }    from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { HeroHeaderModule }         from 'src/app/shared-interproject/components/@visual/hero-header/hero-header.module';
import { EmptyStateModule }         from '../../../shared-interproject/components/@smart/empty-state/empty-state.module';
import { ListLinkRouterModule }     from '../../../shared-interproject/components/@smart/list-link-router/list-link-router.module';
import { UserDataHandlerModule }    from '../../../shared-interproject/components/@smart/user-data-handler/user-data-handler.module';
import { DeviceFrameWrapperModule } from '../../../shared-interproject/components/@visual/device-frame-wrapper/device-frame-wrapper.module';
import { HeroLinkModule }           from '../../../shared-interproject/components/@visual/hero-link/hero-link.module';
import { ScreenWrapperModule }      from '../../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { ModuleBrowserModule }      from '../../module-browser/module-browser.module';
import { PatchBrowserModule }       from '../../patch-browser/patch-browser.module';
import { RackBrowserModule }        from '../../rack-browser/rack-browser.module';
import { HomeComponent }            from './home.component';

@NgModule({
  declarations: [HomeComponent],
  exports:      [HomeComponent],
  imports:      [
    CommonModule,
    FlexLayoutModule,
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
    // EmptyStateModule,
    RouterModule.forRoot([
      {
        path:       '',
        redirectTo: 'home',
        pathMatch:  'full'
      },
      {
        path:      'home',
        component: HomeComponent
      }
    ], {scrollPositionRestoration: 'enabled'}),
    ScreenWrapperModule,
    ListLinkRouterModule,
    HeroLinkModule,
    UserDataHandlerModule,
    EmptyStateModule,
    BrandPrimaryButtonModule,
    HeroContentCardModule,
    HeroHeaderModule,
    MatExpansionModule,
    MatIconModule,
    PatchBrowserModule,
    ModuleBrowserModule,
    RackBrowserModule,
    DeviceFrameWrapperModule
  ]
})
export class HomeModule {}
