import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatDividerModule } from '@angular/material/divider';
import { ModuleBrowserModule } from 'src/app/features/module-browser/module-browser.module';
import { UserModulesComponent } from 'src/app/features/routes/user-area/user-modules/user-modules.component';
import { AutoUpdateLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator/auto-update-loading-indicator.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { RouterLink } from "@angular/router";
import { MatCardModule } from "@angular/material/card";
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { DiscoveryTipsModule } from 'src/app/shared-interproject/discovery-tips/discovery-tips.module';
import { EmptyStateTipsComponent } from 'src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component';


@NgModule({
  declarations: [
    UserModulesComponent
  ],
  imports: [
    CommonModule,
    ModuleBrowserModule,
    HeroContentCardComponent,
    FlexLayoutModule,
    BrandPrimaryButtonComponent,
    MatCardModule,
    MatPaginatorModule,
    MatButtonToggleModule,
    MatIconModule,
    MatDividerModule,
    AutoUpdateLoadingIndicatorComponent,
    RouterLink,
    DiscoveryTipsModule,
    EmptyStateTipsComponent
  ],
  exports:      [UserModulesComponent]
})
export class UserModulesModule {}
