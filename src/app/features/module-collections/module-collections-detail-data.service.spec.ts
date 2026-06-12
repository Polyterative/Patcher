import { of } from 'rxjs';
import { ModuleCollectionDetail } from 'src/app/models/module-collection';
import { ModuleCollectionsDetailDataService } from './module-collections-detail-data.service';

describe('ModuleCollectionsDetailDataService', () => {
  function build() {
    const backend = {
      GET: {
        publicModuleCollectionByPublicId: jasmine.createSpy('publicModuleCollectionByPublicId').and.returnValue(of(undefined)),
        currentUserModuleCollectionById: jasmine.createSpy('currentUserModuleCollectionById').and.returnValue(of(undefined))
      },
      update: {
        moduleCollection: jasmine.createSpy('update.moduleCollection').and.returnValue(of(1))
      }
    };
    const analytics = {capture: jasmine.createSpy('capture')};
    const service = new ModuleCollectionsDetailDataService(backend as any, analytics as any);
    return {service, backend};
  }

  it('patches the visible collection locally after editor autosave', () => {
    const {service} = build();
    let visibleCollection: ModuleCollectionDetail | undefined;
    service.collection$.subscribe(collection => visibleCollection = collection);
    const collection = {
      id: 3,
      name: 'Liquid filters',
      public: true,
      public_id: 'liquid',
      author: {username: 'Curator'},
      entries: [{id: 1, ordinal: 0, module: {id: 12, name: 'Filter'}}],
      module_count: 1
    } as any;

    service.localCollectionUpdated$.next(collection);

    expect(visibleCollection).toBe(collection);
  });

});
