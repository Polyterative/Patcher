import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { PatchListModule } from 'src/app/components/patch-list/patch-list.module';
import { RackListModule } from 'src/app/components/rack-list/rack-list.module';
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { AutoContentLoadingIndicatorComponent } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { EmptyStateComponent } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.component';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { LabelValueShowcaseModule } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { PublicProfileComponent } from './public-profile.component';

@NgModule({
  declarations: [PublicProfileComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: ':username',
        component: PublicProfileComponent,
      },
    ]),
    FlexLayoutModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    PatchListModule,
    RackListModule,
    StatisticsComponent,
    AutoContentLoadingIndicatorComponent,
    EmptyStateComponent,
    BrandPrimaryButtonComponent,
    CleanCardComponent,
    HeroContentCardModule,
    LabelValueShowcaseModule,
    ScreenWrapperComponent,
  ],
})
export class PublicProfileModule {}
