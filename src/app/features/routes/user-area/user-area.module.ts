import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { UserModulesModule } from 'src/app/features/routes/user-area/user-modules/user-modules.module';
import { UserPatchesComponent } from 'src/app/features/routes/user-area/user-patches/user-patches.component';
import { UserRacksComponent } from 'src/app/features/routes/user-area/user-racks/user-racks.component';
import { PatchListModule } from 'src/app/components/patch-list/patch-list.module';
import { RackListModule } from 'src/app/components/rack-list/rack-list.module';
import { AutoUpdateLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { LabelValueShowcaseComponent } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { UserAreaDataService } from 'src/app/features/routes/user-area/user-area-data.service';
import { UserAreaRootComponent } from 'src/app/features/routes/user-area/user-area-root/user-area-root.component';
import { MatCardModule } from "@angular/material/card";
import { AuthGuard } from "src/app/features/backbone/login/user-auth-guard.service";
import {
  UsernameCompleteGuard,
  UsernameGuard
} from "src/app/features/backbone/login/username-complete-guard.service";
import { UserManualsComponent } from "src/app/features/routes/user-area/user-manuals/user-manuals.component";
import { UserCommentsComponent } from "src/app/features/routes/user-area/user-comments/user-comments.component";
import { AppFaqComponent } from "src/app/components/shared-atoms/app-faq/app-faq.component";
import { StatisticsComponent } from "src/app/components/shared-atoms/statistics/statistics.component";
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormEntityComponent } from 'src/app/shared-interproject/components/@smart/mat-form-entity/mat-form-entity.component';
import { DiscoveryTipsModule } from 'src/app/shared-interproject/discovery-tips/discovery-tips.module';
import { EmptyStateTipsComponent } from 'src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component';
import { FlexboxRowFastComponent } from 'src/app/shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';
import { PatchMicroModule } from 'src/app/components/patch-micro/patch-micro.module';
import { RackMicroModule } from 'src/app/components/rack-micro/rack-micro.module';
import { RackModule } from 'src/app/components/rack-parts/rack.module';
import { PatchModule } from 'src/app/components/patch-parts/patch.module';
import { ModuleCollectionPartsModule } from 'src/app/components/module-collection-parts/module-collection-parts.module';
import { ModuleCollectionsDataService } from 'src/app/features/module-collections/module-collections-data.service';
import { UserCollectionsComponent } from 'src/app/features/routes/user-area/user-collections/user-collections.component';


@NgModule({
  declarations: [
    UserAreaRootComponent,
    UserRacksComponent,
    UserPatchesComponent,
    UserCollectionsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'area',
        component: UserAreaRootComponent,
        canActivate: [AuthGuard, UsernameGuard],
      }
    ]),
    BrandPrimaryButtonComponent,
    ScreenWrapperComponent,
    MatExpansionModule,
    MatIconModule,
    MatCardModule,
    HeroContentCardComponent,
    EmptyStateComponent,
    UserModulesModule,
    MatDividerModule,
    LabelValueShowcaseComponent,
    CleanCardComponent,
    AutoUpdateLoadingIndicatorComponent,
    RackListModule,
    PatchListModule,
    StatisticsComponent,
    MatChipsModule,
    MatButtonModule,
    MatDialogModule,
    UserManualsComponent,
    UserCommentsComponent,
    ModuleCollectionPartsModule,
    AppFaqComponent,
    MatFormEntityComponent,
    DiscoveryTipsModule,
    EmptyStateTipsComponent,
    FlexboxRowFastComponent,
    PatchMicroModule,
    RackMicroModule,
    RackModule,
    PatchModule
  ],
  exports:      [
    UserAreaRootComponent
  ],
  providers:    [
    UserAreaDataService,
    ModuleCollectionsDataService,
    UsernameCompleteGuard
  ]
})
export class UserAreaModule {}
