import { of } from 'rxjs';
import { ModuleCollectionCreatorComponent } from 'src/app/components/module-collection-parts/module-collection-creator/module-collection-creator.component';
import { UserCollectionsComponent } from './user-collections.component';

describe('UserCollectionsComponent', () => {
  function build(afterClosedValue: unknown = {id: 7}) {
    const dataService = {
      updateCurrentUserCollections$: jasmine.createSpyObj('Subject', ['next']),
      deleteCollection: jasmine.createSpy('deleteCollection').and.returnValue(of({}))
    };
    const dialog = {
      open: jasmine.createSpy('open').and.returnValue({
        afterClosed: () => of(afterClosedValue)
      })
    };
    const router = jasmine.createSpyObj('Router', ['navigate']);

    const component = new UserCollectionsComponent(dataService as any, dialog as any, router as any);
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
