import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { ModuleBrowserModule } from 'src/app/features/module-browser/module-browser.module';
import { UserModulesComponent } from 'src/app/features/user-area/user-modules/user-modules.component';
import { AutoUpdateLoadingIndicatorModule } from 'src/app/shared-interproject/components/@smart/auto-update-loading-indicator/auto-update-loading-indicator.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';

@NgModule({
  declarations: [
    UserModulesComponent
  ],
  imports:      [
    CommonModule,
    ModuleBrowserModule,
    HeroContentCardModule,
    FlexLayoutModule,
    BrandPrimaryButtonModule,
    MatCardModule,
    MatDividerModule,
    AutoUpdateLoadingIndicatorModule
  ],
  exports:      [UserModulesComponent]
})
export class UserModulesModule {}
