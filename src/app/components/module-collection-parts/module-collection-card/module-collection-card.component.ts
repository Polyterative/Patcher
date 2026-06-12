import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { ModuleCollectionSummary } from 'src/app/models/module-collection';
import { getPublicStorageUrl } from 'src/app/shared-interproject/utils/public-storage-url';
import { MatIcon } from '@angular/material/icon';
import { HeroClickableTitleComponent } from '../../../shared-interproject/components/@visual/hero-clickable-title/hero-clickable-title.component';
import { SharedAtomsModule } from '../../shared-atoms/shared-atoms.module';
import { MatCardSubtitle } from '@angular/material/card';

const MODULE_COLLECTIONS_STORAGE_BUCKET = 'module-collections';

@Component({
    selector: 'app-module-collection-card',
    templateUrl: './module-collection-card.component.html',
    styleUrls: ['./module-collection-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIcon, HeroClickableTitleComponent, SharedAtomsModule, MatCardSubtitle]
})
export class ModuleCollectionCardComponent {
  @Input({ required: true }) collection!: ModuleCollectionSummary;

  coverImageSrc(image: string | null | undefined): string | null {
    return getPublicStorageUrl(MODULE_COLLECTIONS_STORAGE_BUCKET, image);
  }
}
