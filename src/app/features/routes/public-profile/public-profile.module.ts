import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { RouterModule } from '@angular/router';
import { PatchListModule } from 'src/app/components/patch-list/patch-list.module';
import { RackListModule } from 'src/app/components/rack-list/rack-list.module';
import { StatisticsModule } from 'src/app/components/shared-atoms/statistics/statistics.module';
import { AutoContentLoadingIndicatorModule } from 'src/app/shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator.module';
import { EmptyStateModule } from 'src/app/shared-interproject/components/@smart/empty-state/empty-state.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { CleanCardModule } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { LabelValueShowcaseModule } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { PublicProfileComponent } from './public-profile.component';

@NgModule({
  declarations: [PublicProfileComponent],
  imports: [
    CommonModule,
    RouterModule.forChild([
      {
        path: 'u/:username',
        component: PublicProfileComponent,
      },
    ]),
    FlexLayoutModule,
    MatCardModule,
    MatIconModule,
    MatPaginatorModule,
    PatchListModule,
    RackListModule,
    StatisticsModule,
    AutoContentLoadingIndicatorModule,
    EmptyStateModule,
    BrandPrimaryButtonModule,
    CleanCardModule,
    HeroContentCardModule,
    LabelValueShowcaseModule,
    ScreenWrapperModule,
  ],
})
export class PublicProfileModule {}
