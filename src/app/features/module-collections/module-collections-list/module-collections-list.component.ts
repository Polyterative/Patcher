import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output
} from '@angular/core';
import { ModuleCollectionSummary } from 'src/app/models/module-collection';
import { AutoContentLoadingIndicatorComponent } from '../../../shared-interproject/components/@smart/auto-content-loading-indicator/auto-content-loading-indicator/auto-content-loading-indicator.component';
import { EmptyStateComponent } from '../../../shared-interproject/components/@smart/empty-state/empty-state.component';
import { FlexboxRowFastComponent } from '../../../shared-interproject/components/@visual/fle-box-row-fast/flexbox-row-fast.component';
import { CleanCardComponent } from '../../../shared-interproject/components/@visual/clean-card/clean-card.component';
import { ModuleCollectionCardComponent } from '../../../components/module-collection-parts/module-collection-card/module-collection-card.component';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'app-module-collections-list',
    templateUrl: './module-collections-list.component.html',
    styleUrls: ['./module-collections-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AutoContentLoadingIndicatorComponent, EmptyStateComponent, FlexboxRowFastComponent, CleanCardComponent, ModuleCollectionCardComponent, MatButton]
})
export class ModuleCollectionsListComponent {
  @Input() collections: ModuleCollectionSummary[] | null | undefined;
  @Input() loading = false;
  @Input() hasMore = false;
  @Input() remainingCount = 0;
  @Output() readonly loadMore = new EventEmitter<void>();
}
