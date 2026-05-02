import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { StatisticsModule } from 'src/app/components/shared-atoms/statistics/statistics.module';
import { BrandPrimaryButtonModule } from 'src/app/shared-interproject/components/@visual/brand-primary-button/brand-primary-button.module';
import { CleanCardModule } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.module';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';
import { ScreenWrapperModule } from 'src/app/shared-interproject/components/@visual/screen-wrapper/screen-wrapper.module';
import { ApplicationInsightsPageComponent } from './application-insights/application-insights-page.component';
// import { MarkdownModule } from 'ngx-markdown';
import { ChangelogComponent } from './changelog/changelog.component';


@NgModule({
  declarations: [
    ChangelogComponent,
    ApplicationInsightsPageComponent
  ],
  imports:      [
    CommonModule,
    MatIconModule,
    StatisticsModule,
    BrandPrimaryButtonModule,
    CleanCardModule,
    HeroContentCardModule,
    ScreenWrapperModule,
    
    RouterModule.forChild([
      {
        path:      'info/changelog',
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
