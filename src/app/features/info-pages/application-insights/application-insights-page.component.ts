import {
  ChangeDetectionStrategy,
  Component
} from '@angular/core';
import { Observable } from 'rxjs';
import {
  ApplicationInsightsPage,
  ApplicationStatisticsService
} from '../../backbone/home/application-statistics.service';
import { SeoAndUtilsService } from '../../backbone/seo-and-utils.service';


@Component({
  selector: 'app-application-insights-page',
  templateUrl: './application-insights-page.component.html',
  styleUrls: ['./application-insights-page.component.scss'],
  providers: [ApplicationStatisticsService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ApplicationInsightsPageComponent {
  readonly page$!: Observable<ApplicationInsightsPage>;

  constructor(
    private readonly applicationStatisticsService: ApplicationStatisticsService,
    private readonly seoAndUtilsService: SeoAndUtilsService
  ) {
    this.page$ = this.applicationStatisticsService.page$;
    this.seoAndUtilsService.updateSeo(
      {
        title: 'Application insights',
        description: 'Chart-led insights about catalogue growth, recent activity, and public sharing in Patcher.',
        url: 'https://patcher.xyz/insights',
      },
      'Application insights'
    );
  }
}
