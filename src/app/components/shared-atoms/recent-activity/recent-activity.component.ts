import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import {
  RecentActivityItem,
  RecentActivityType
} from './recent-activity.model';


@Component({
  selector: 'app-recent-activity',
  templateUrl: './recent-activity.component.html',
  styleUrls: ['./recent-activity.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class RecentActivityComponent {
  @Input() title = 'Recent activity';
  @Input() emptyText = 'No recent activity yet.';
  @Input() loadingText = 'Loading recent activity...';
  @Input() maxItems = 5;
  @Input() items: RecentActivityItem[] | null | undefined = undefined;
  
  private readonly defaultIcons: Record<RecentActivityType, string> = {
    comment: 'chat_bubble_outline',
    update: 'edit',
    create: 'add_circle_outline',
    listing: 'sell',
    price: 'payments',
    generic: 'history'
  };
  
  get visibleItems(): RecentActivityItem[] {
    const source = this.items ?? [];
    return source.slice(0, this.maxItems);
  }
  
  resolveIcon(item: RecentActivityItem): string {
    if (item.icon) {
      return item.icon;
    }
    return this.defaultIcons[item.type] ?? this.defaultIcons.generic;
  }
}