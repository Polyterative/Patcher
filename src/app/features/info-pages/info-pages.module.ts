import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterModule } from '@angular/router';
import { BrandPrimaryButtonComponent } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { ScreenWrapperComponent } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.component';
import { ApplicationInsightsPageComponent } from './application-insights/application-insights-page.component';
import { InsightChipComponent } from './application-insights/insight-chip/insight-chip.component';
import { InsightMetricBarComponent } from './application-insights/insight-metric-bar/insight-metric-bar.component';
import { ChangelogComponent } from './changelog/changelog.component';


@NgModule({
  declarations: [
    ChangelogComponent,
    ApplicationInsightsPageComponent,
    InsightChipComponent,
    InsightMetricBarComponent
  ],
  imports:      [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    BrandPrimaryButtonComponent,
    CleanCardComponent,
    HeroContentCardComponent,
    ScreenWrapperComponent,
    
    RouterModule.forChild([
      {
        path: 'changelog',
        component: ChangelogComponent
      },
      {
        path: 'insights',
        component: ApplicationInsightsPageComponent
      }
    ]),
    // MarkdownModule
  ],
  exports:      [
    ChangelogComponent,
    ApplicationInsightsPageComponent
  ]
})
export class InfoPagesModule {}

