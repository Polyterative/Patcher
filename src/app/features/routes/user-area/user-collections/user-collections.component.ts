import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import {
  ModuleCollectionCreatorComponent,
  ModuleCollectionCreatorResult
} from 'src/app/components/module-collection-parts/module-collection-creator/module-collection-creator.component';
import { ModuleCollectionsDataService } from 'src/app/features/module-collections/module-collections-data.service';

@Component({
  selector: 'app-user-collections',
  templateUrl: './user-collections.component.html',
  styleUrls: ['./user-collections.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class UserCollectionsComponent {
  constructor(
    public dataService: ModuleCollectionsDataService,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.dataService.updateCurrentUserCollections$.next();
  }

  createCollection(): void {
    this.dialog.open<ModuleCollectionCreatorComponent, undefined, ModuleCollectionCreatorResult>(
      ModuleCollectionCreatorComponent,
      {
        width: 'min(96vw, 30rem)',
        maxWidth: '96vw'
      }
    ).afterClosed().subscribe((result) => {
      if (typeof result?.id === 'number') {
        this.dataService.updateCurrentUserCollections$.next();
        this.router.navigate(['/collection', result.id]);
      }
    });
  }

  collectionManagementPath(collectionId: number): string[] {
    return ['/collection', `${ collectionId }`];
  }

  deleteCollection(collectionId: number): void {
    this.dataService.deleteCollection(collectionId).subscribe(() => {
      this.dataService.updateCurrentUserCollections$.next();
    });
  }
}
