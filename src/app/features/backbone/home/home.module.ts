import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from "@angular/material/card";
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { EmptyStateModule } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { ListLinkRouterModule } from 'src/app/shared-interproject/components/@smart/list-link-router/list-link-router.module';
import { LottieContainerModule } from 'src/app/shared-interproject/components/@smart/lottie-container/lottie-container.module';
import { UserDataHandlerModule } from 'src/app/shared-interproject/components/@smart/user-data-handler/user-data-handler.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { DeviceFrameWrapperModule } from 'src/app/shared-interproject/components/@visual/device-frame-wrapper/device-frame-wrapper.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { HeroHeaderModule } from 'src/app/shared-interproject/components/@visual/hero-header/hero-header.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { ModuleBrowserModule } from '../../module-browser/module-browser.module';
import { PatchBrowserModule } from '../../patch-browser/patch-browser.module';
import { RackBrowserModule } from 'src/app/features/routes/rack/rack-browser.module';
import { HomeComponent } from './home.component';
import { CleanCardModule } from "src/app/shared-interproject/components/@visual/clean-card/clean-card.module";
import { LibShowcaseGridComponent } from "src/app/components/rack-parts/rack-editor/lib-showcase-grid/lib-showcase-grid.component";


@NgModule({
  declarations: [
    HomeComponent
  ],
  exports:      [
    HomeComponent
  ],
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatCardModule,
    MatToolbarModule,
    // EmptyStateModule,
    RouterModule.forRoot([
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      },
      {
        path: 'home',
        component: HomeComponent
      }
    ], {scrollPositionRestoration: 'enabled'}),
    ScreenWrapperModule,
    ListLinkRouterModule,
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
    DeviceFrameWrapperModule,
    LottieContainerModule,
    MatDividerModule,
    CleanCardModule,
    LibShowcaseGridComponent
  ]
})
export class HomeModule {}