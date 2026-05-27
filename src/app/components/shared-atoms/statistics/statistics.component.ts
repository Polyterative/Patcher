import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { EmptyStateTipsComponent } from 'src/app/components/shared-atoms/empty-state-tips/empty-state-tips.component';
import { LabelValueShowcaseModule } from 'src/app/shared-interproject/components/@visual/label-value-showcase/label-value-showcase.module';
import { CleanCardComponent } from 'src/app/shared-interproject/components/@visual/clean-card/clean-card.component';
import { HeroContentCardModule } from 'src/app/shared-interproject/components/@visual/hero-content-card/hero-content-card.module';


@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    CommonModule,
    LabelValueShowcaseModule,
    HeroContentCardModule,
    EmptyStateTipsComponent,
    CleanCardComponent
  ]
})
export class StatisticsComponent {

  @Input() title: string | null = null;
  @Input() cardClass: string = '';
  @Input() icon: string | undefined;
  @Input() emptyMessage: string | null = null;
  @Input() emptyTitle: string | null = null;
  @Input() emptyIcon: string = 'insights';
  @Input() compact = false;
  @Input() useCleanCard = false;

  @Input() statistics: {
    name: string;
    value: number;
    icon?: string;
  }[] | null;
  
  get visibleStatistics() {
    return this.statistics?.filter(s => s.value > 0) ?? [];
  }

  get showEmptyState(): boolean {
    return !!this.emptyMessage
      && !!this.statistics
      && this.visibleStatistics.length === 0;
  }

  get shouldRenderCard(): boolean {
    return this.visibleStatistics.length > 0 || this.showEmptyState;
  }
  
}
