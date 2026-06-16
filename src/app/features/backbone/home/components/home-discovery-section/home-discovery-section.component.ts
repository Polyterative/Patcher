import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { ModulePartsModule } from 'src/app/components/module-parts/module-parts.module';
import { Observable } from 'rxjs';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { PublicModuleDiscoveryEntry } from 'src/app/features/backend/supabase-queries.models';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from 'src/app/components/module-parts/module-minimal/module-minimal.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ApplicationDiscoveryBucket, ApplicationDiscoverySnapshot } from '../../application-statistics.models';
import { ApplicationStatisticsService } from '../../application-statistics.service';

@Component({
  selector: 'app-home-discovery-section',
  standalone: true,
  imports: [
    CommonModule,
    CleanCardComponent,
    HeroContentCardComponent,
    MatButtonModule,
    MatIconModule,
    ModulePartsModule,
    RouterLink
  ],
  templateUrl: './home-discovery-section.component.html',
  styleUrls: ['./home-discovery-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ApplicationStatisticsService]
})
export class HomeDiscoverySectionComponent extends SubManager {
  readonly discoveryBuckets: {key: ApplicationDiscoveryBucket; label: string; icon: string}[] = [
    {key: 'mostOwned', label: 'Most Owned', icon: 'inventory_2'},
    {key: 'mostWanted', label: 'Most Wanted', icon: 'bookmark_add'},
    {key: 'mostSold', label: 'Most Sold', icon: 'sell'}
  ];

  selectedBucket: ApplicationDiscoveryBucket = 'mostOwned';

  readonly discovery$: Observable<ApplicationDiscoverySnapshot>;
  readonly moduleViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideButtons: true,
    hideDates: true,
    hideDescription: true,
    hideTags: true,
    hideHP: true,
    hideIoCounts: true,
    hideReportIssue: true
  };

  constructor(
    readonly applicationStatisticsService: ApplicationStatisticsService,
    private readonly analytics: AnalyticsService
  ) {
    super();
    this.discovery$ = this.applicationStatisticsService.discovery$;
  }

  currentEntries(snapshot: ApplicationDiscoverySnapshot): PublicModuleDiscoveryEntry[] {
    return snapshot[this.selectedBucket];
  }

  bucketLabel(bucket: ApplicationDiscoveryBucket): string {
    return this.discoveryBuckets.find((entry) => entry.key === bucket)?.label ?? 'Most Owned';
  }

  onBucketChange(bucket: ApplicationDiscoveryBucket | null | undefined): void {
    if (!bucket || bucket === this.selectedBucket) {
      return;
    }

    this.selectedBucket = bucket;
    this.analytics.capture('module.discovery_bucket_viewed', {bucket});
  }

  onModuleClick(bucket: ApplicationDiscoveryBucket, entry: PublicModuleDiscoveryEntry, rank: number): void {
    this.analytics.capture('module.discovery_module_clicked', {
      bucket,
      module_id: entry.id,
      rank,
      count: entry.count
    });
  }
}
