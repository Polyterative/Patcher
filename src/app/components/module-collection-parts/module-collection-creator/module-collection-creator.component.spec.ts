import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { ModuleCollectionsDataService } from 'src/app/features/module-collections/module-collections-data.service';
import {
  ModuleCollectionCreatorComponent,
  ModuleCollectionCreatorResult
} from './module-collection-creator.component';

describe('ModuleCollectionCreatorComponent', () => {
  function build() {
    const collectionsDataService = jasmine.createSpyObj<ModuleCollectionsDataService>(
      'ModuleCollectionsDataService',
      ['createCollectionShell']
    );
    collectionsDataService.createCollectionShell.and.returnValue(of(42));
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    const dialogRef = jasmine.createSpyObj<MatDialogRef<ModuleCollectionCreatorComponent, ModuleCollectionCreatorResult>>(
      'MatDialogRef',
      ['close']
    );
    const component = new ModuleCollectionCreatorComponent(
      collectionsDataService,
      snackBar,
      dialogRef
    );

    return {component, collectionsDataService, dialogRef};
  }

  it('creates only the minimal collection shell and closes with the created id', () => {
    const {component, collectionsDataService, dialogRef} = build();

    component.nameControl.setValue('Patch ideas');
    component.publicControl.setValue(true);
    component.create$.next();

    expect(collectionsDataService.createCollectionShell).toHaveBeenCalledWith({
      name: 'Patch ideas',
      public: true
    });
    expect(dialogRef.close).toHaveBeenCalledWith({id: 42});
  });

  it('does not create until the collection has a valid name', () => {
    const {component, collectionsDataService, dialogRef} = build();

    component.nameControl.setValue('');
    component.create$.next();

    expect(collectionsDataService.createCollectionShell).not.toHaveBeenCalled();
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
