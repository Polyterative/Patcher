import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { StatisticsComponent } from 'src/app/components/shared-atoms/statistics/statistics.component';
import { ApplicationStatisticsService } from '../../application-statistics.service';
import { HomeLinkPill } from '../../home-content.models';
import { HomeCuriosityBridgeComponent } from '../home-curiosity-bridge/home-curiosity-bridge.component';

@Component({
  selector: 'app-home-insights-section',
  standalone: true,
  imports: [CommonModule, HomeCuriosityBridgeComponent, StatisticsComponent],
  templateUrl: './home-insights-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ApplicationStatisticsService]
})
export class HomeInsightsSectionComponent {
  @Input() showInsightsPageEntry = false;
  @Input() communityLinks: HomeLinkPill[] = [];
  @Input() insightsTitle = '';
  @Input() insightsDescription = '';

  constructor(readonly applicationStatisticsService: ApplicationStatisticsService) {}
}
