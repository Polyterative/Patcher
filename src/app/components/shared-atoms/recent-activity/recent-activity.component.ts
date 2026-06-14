import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input
} from '@angular/core';
import {
  RecentActivityItem,
  RecentActivityType
} from './recent-activity.model';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TimeagoModule } from 'ngx-timeago';
import { SupabaseUtcTimestampPipe } from '../../../shared-interproject/pipes/supabase-utc-timestamp.pipe';


@Component({
    selector: 'app-recent-activity',
    templateUrl: './recent-activity.component.html',
    styleUrls: ['./recent-activity.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIcon, RouterLink, TimeagoModule, SupabaseUtcTimestampPipe]
})
export class RecentActivityComponent {
  readonly title = input('Recent activity');
  readonly emptyText = input('No recent activity yet.');
  readonly loadingText = input('Loading recent activity...');
  readonly maxItems = input(5);
  readonly items = input<RecentActivityItem[] | null | undefined>(undefined);
  
  private readonly defaultIcons: Record<RecentActivityType, string> = {
    comment: 'chat_bubble_outline',
    update: 'edit',
    create: 'add_circle_outline',
    listing: 'sell',
    price: 'payments',
    generic: 'history'
  };
  
  readonly visibleItems = computed(() => {
    const source = this.items() ?? [];
    return source.slice(0, this.maxItems());
  });
  
  resolveIcon(item: RecentActivityItem): string {
    if (item.icon) {
      return item.icon;
    }
    return this.defaultIcons[item.type] ?? this.defaultIcons.generic;
  }
}