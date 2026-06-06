import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input
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
    return this.statistics ?? [];
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
