import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { ModuleCollectionSummary } from 'src/app/models/module-collection';

@Component({
  selector: 'app-module-collections-list',
  templateUrl: './module-collections-list.component.html',
  styleUrls: ['./module-collections-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleCollectionsListComponent {
  @Input() collections: ModuleCollectionSummary[] | null | undefined;
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() remainingCount = 0;
  @Output() readonly loadMore = new EventEmitter<void>();
}
