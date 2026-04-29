import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';

export interface EntityStatItem {
  label: string;
  value: string;
  icon?: string;
  hidden?: boolean;
  size?: string;
  badge?: string;
  routerLink?: any[];
}

@Component({
  selector: 'app-entity-stat-grid',
  templateUrl: './entity-stat-grid.component.html',
  styleUrls: ['./entity-stat-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class EntityStatGridComponent {
  @Input() items: EntityStatItem[] = [];
  @Input() equalColumns = false;
  @Input() stacked = false;

  visibleItems(): EntityStatItem[] {
    return this.items.filter(item => !item.hidden);
  }

  itemFlex(item: EntityStatItem): string {
    return this.equalColumns ? '1 1 0' : `1 1 ${ item.size ?? '12rem' }`;
  }
}
