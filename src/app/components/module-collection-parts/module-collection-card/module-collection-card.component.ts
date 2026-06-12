import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { ModuleCollectionSummary } from 'src/app/models/module-collection';
import { getPublicStorageUrl } from 'src/app/shared-interproject/utils/public-storage-url';

const MODULE_COLLECTIONS_STORAGE_BUCKET = 'module-collections';

@Component({
  selector: 'app-module-collection-card',
  templateUrl: './module-collection-card.component.html',
  styleUrls: ['./module-collection-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModuleCollectionCardComponent {
  @Input({ required: true }) collection!: ModuleCollectionSummary;

  coverImageSrc(image: string | null | undefined): string | null {
    return getPublicStorageUrl(MODULE_COLLECTIONS_STORAGE_BUCKET, image);
  }
}
