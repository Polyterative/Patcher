import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { PatchBrowserModule } from 'src/app/features/patch-browser/patch-browser.module';
import { RackBrowserModule } from 'src/app/features/rack-browser/rack-browser.module';
import { UserModulesModule } from 'src/app/features/user-area/user-modules/user-modules.module';
import { UserPatchesComponent } from 'src/app/features/user-area/user-patches/user-patches.component';
import { UserRacksComponent } from 'src/app/features/user-area/user-racks/user-racks.component';
import { PatchListModule } from '../../components/patch-list/patch-list.module';
import { RackListModule } from '../../components/rack-list/rack-list.module';
import { AutoUpdateLoadingIndicatorModule } from '../../shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module';
import { EmptyStateModule } from '../../shared-interproject/components/@smart/empty-state/empty-state.module';
import { BrandPrimaryButtonModule } from '../../shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { CleanCardModule } from '../../shared-interproject/components/@visual/clean-card/clean-card.module';
import { HeroContentCardModule } from '../../shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { LabelValueShowcaseModule } from '../../shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { ScreenWrapperModule } from '../../shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { ModuleBrowserModule } from '../module-browser/module-browser.module';
import { UserAreaDataService } from './user-area-data.service';
import { UserAreaRootComponent } from './user-area-root/user-area-root.component';
import { MatCardModule } from "@angular/material/card";
import { AuthGuard } from "src/app/features/backbone/login/user-auth-guard.service";
import { UserManualsComponent } from "src/app/features/user-area/user-manuals/user-manuals.component";
import { UserCommentsComponent } from "src/app/features/user-area/user-comments/user-comments.component";


@NgModule({
  declarations: [
    UserAreaRootComponent,
    UserRacksComponent,
    UserPatchesComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'user/area',
        component: UserAreaRootComponent,
        canActivate: [AuthGuard],
      }
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
    UserModulesModule,
    MatDividerModule,
    LabelValueShowcaseModule,
    CleanCardModule,
    AutoUpdateLoadingIndicatorModule,
    RackListModule,
    PatchListModule,
    UserManualsComponent,
    UserCommentsComponent
  ],
  exports:      [
    UserAreaRootComponent
  ],
  providers:    [
    UserAreaDataService
  ]
})
export class UserAreaModule {}