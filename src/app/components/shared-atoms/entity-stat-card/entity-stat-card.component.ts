import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { EntityStatItem } from '../entity-stat-grid/entity-stat-grid.component';

export interface EntityStatGroup {
  title?: string;
  items: EntityStatItem[];
}

@Component({
  selector: 'app-entity-stat-card',
  templateUrl: './entity-stat-card.component.html',
  styleUrls: ['./entity-stat-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class EntityStatCardComponent {
  @Input() rows: EntityStatGroup[][] = [];
  @Input() equalColumns = false;
  @Input() verticallyCentered = false;
  @Input() stackedItems = false;

  visibleRows(): EntityStatGroup[][] {
    return this.rows
      .map(row => row.filter(group => group.items.some(item => !item.hidden)))
      .filter(row => row.length > 0);
  }

  rowTrackKey(index: number): number {
    return index;
  }

  groupTrackKey(group: EntityStatGroup, rowIndex: number, groupIndex: number): string {
    return `${ rowIndex }|${ group.title ?? '' }|${ groupIndex }`;
  }
}
