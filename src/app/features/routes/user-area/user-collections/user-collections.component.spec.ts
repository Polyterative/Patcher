import { of } from 'rxjs';
import { ModuleCollectionCreatorComponent } from 'src/app/components/module-collection-parts/module-collection-creator/module-collection-creator.component';
import { UserCollectionsComponent } from './user-collections.component';
import { ModuleCollectionsDataService } from 'src/app/features/module-collections/module-collections-data.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ModuleCollectionCreatorResult } from 'src/app/components/module-collection-parts/module-collection-creator/module-collection-creator.component';

type CreatorCloseResult = ModuleCollectionCreatorResult | null | Partial<ModuleCollectionCreatorResult>;

describe('UserCollectionsComponent', () => {
  function build(afterClosedValue: CreatorCloseResult = {id: 7}) {
    const updateCurrentUserCollections$ = jasmine.createSpyObj<ModuleCollectionsDataService['updateCurrentUserCollections$']>(
      'updateCurrentUserCollections$',
      ['next']
    );
    const dataService = jasmine.createSpyObj<ModuleCollectionsDataService>(
      'ModuleCollectionsDataService',
      ['deleteCollection'],
      {updateCurrentUserCollections$}
    );
    dataService.deleteCollection.and.returnValue(of(undefined));
    const dialogRef = jasmine.createSpyObj<MatDialogRef<ModuleCollectionCreatorComponent, ModuleCollectionCreatorResult>>(
      'MatDialogRef',
      ['afterClosed']
    );
    dialogRef.afterClosed.and.returnValue(of(afterClosedValue as ModuleCollectionCreatorResult | undefined));
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue(dialogRef);
    const router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    const component = new UserCollectionsComponent(dataService, dialog, router);
    return {component, dataService, dialog, router};
  }

  it('opens the minimal creator and navigates to the full collection page after creation', () => {
    const {component, dataService, dialog, router} = build({id: 7});

    component.createCollection();

    expect(dialog.open).toHaveBeenCalledWith(ModuleCollectionCreatorComponent, {
      width: 'min(96vw, 30rem)',
      maxWidth: '96vw'
    });
    expect(dataService.updateCurrentUserCollections$.next).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/collection', 7]);
  });

  it('does not navigate when collection creation is cancelled', () => {
    const {component, router} = build(null);

    component.createCollection();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('does not navigate when the creator closes without a collection id', () => {
    const {component, router} = build({});

    component.createCollection();

    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('deletes a collection and refreshes the owned list', () => {
    const {component, dataService} = build();

    component.deleteCollection(11);

    expect(dataService.deleteCollection).toHaveBeenCalledWith(11);
    expect(dataService.updateCurrentUserCollections$.next).toHaveBeenCalled();
  });
});
