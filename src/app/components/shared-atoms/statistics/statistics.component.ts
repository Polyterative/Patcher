import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import { EmptyStateTipsComponent } from 'src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component';
import { LabelValueShowcaseComponent } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.component';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardComponent } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.component';


@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    LabelValueShowcaseComponent,
    HeroContentCardComponent,
    EmptyStateTipsComponent,
    CleanCardComponent
  ]
})
export class StatisticsComponent {

  readonly title = input<string | null>(null);
  readonly cardClass = input('');
  readonly icon = input<string | undefined>(undefined);
  readonly emptyMessage = input<string | null>(null);
  readonly emptyTitle = input<string | null>(null);
  readonly emptyIcon = input('insights');
  readonly compact = input(false);
  readonly useCleanCard = input(false);

  readonly statistics = input<{
    name: string;
    value: number;
    icon?: string;
  }[] | null>(null);

  readonly visibleStatistics = computed(() => this.statistics() ?? []);

  readonly showEmptyState = computed(() => !!this.emptyMessage()
    && !!this.statistics()
    && this.visibleStatistics().length === 0);

  readonly shouldRenderCard = computed(() => this.visibleStatistics().length > 0 || this.showEmptyState());
  
}
