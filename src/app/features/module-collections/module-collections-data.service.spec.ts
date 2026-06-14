import { of } from 'rxjs';
import { ModuleCollectionsDataService } from './module-collections-data.service';
import {
  ModuleCollectionDetail,
  ModuleCollectionSummary
} from 'src/app/models/module-collection';

describe('ModuleCollectionsDataService', () => {
  function build(addCollectionResult: unknown = 11) {
    const backend = {
      GET: {
        publicModuleCollections: jasmine.createSpy('publicModuleCollections').and.returnValue(of([
          {id: 1, name: 'Ambient starters', public: true, public_id: 'ambient', author: {username: 'Curator'}, module_count: 2}
        ])),
        currentUserModuleCollections: jasmine.createSpy('currentUserModuleCollections').and.returnValue(of([
          {id: 2, name: 'Private notes', public: false, public_id: 'private', author: {username: 'Me'}, module_count: 1}
        ])),
        publicModuleCollectionByPublicId: jasmine.createSpy('publicModuleCollectionByPublicId').and.returnValue(of({
          id: 1,
          name: 'Ambient starters',
          public: true,
          public_id: 'ambient',
          author: {username: 'Curator'},
          entries: [],
          module_count: 0
        })),
        currentUserModuleCollectionById: jasmine.createSpy('currentUserModuleCollectionById').and.returnValue(of({
          id: 2,
          name: 'Private notes',
          public: false,
          public_id: 'private',
          author: {username: 'Me'},
          entries: [],
          module_count: 0
        })),
        moduleCollectionsForModule: jasmine.createSpy('moduleCollectionsForModule').and.returnValue(of([]))
      },
      add: {
        moduleCollection: jasmine.createSpy('add.moduleCollection').and.returnValue(of(addCollectionResult))
      },
      update: {
        moduleCollection: jasmine.createSpy('update.moduleCollection').and.returnValue(of(12))
      },
      delete: {
        moduleCollection: jasmine.createSpy('delete.moduleCollection').and.returnValue(of({}))
      }
    };

    const analytics = {capture: jasmine.createSpy('capture')};

    const service = new ModuleCollectionsDataService(backend as any, analytics as any);
    return {service, backend, analytics};
  }

  it('loads public and owned collections on demand', () => {
    const {service, backend, analytics} = build();
    let publicCollections: ModuleCollectionSummary[] | undefined;
    let currentUserCollections: ModuleCollectionSummary[] | undefined;
    service.publicCollections$.subscribe(collections => publicCollections = collections);
    service.currentUserCollections$.subscribe(collections => currentUserCollections = collections);

    service.updatePublicCollections$.next();
    service.updateCurrentUserCollections$.next();

    expect(backend.GET.publicModuleCollections).toHaveBeenCalled();
    expect(backend.GET.currentUserModuleCollections).toHaveBeenCalled();
    expect(publicCollections?.[0].name).toBe('Ambient starters');
    expect(currentUserCollections?.[0].name).toBe('Private notes');
    expect(analytics.capture).toHaveBeenCalledWith('module_collection.browser_viewed', {view: 'public'});
    expect(analytics.capture).toHaveBeenCalledWith('module_collection.browser_viewed', {view: 'user_area'});
  });

  it('loads collection details and backlinks', () => {
    const {service, backend, analytics} = build();
    let publicCollection: ModuleCollectionDetail | undefined;
    let currentUserCollection: ModuleCollectionDetail | undefined;
    service.publicCollection$.subscribe(collection => publicCollection = collection);
    service.currentUserCollection$.subscribe(collection => currentUserCollection = collection);

    service.updatePublicCollectionByPublicId$.next('ambient');
    service.updateCurrentUserCollectionById$.next(2);
    service.updateModuleCollectionsForModule$.next(7);

    expect(backend.GET.publicModuleCollectionByPublicId).toHaveBeenCalledWith('ambient');
    expect(backend.GET.currentUserModuleCollectionById).toHaveBeenCalledWith(2);
    expect(backend.GET.moduleCollectionsForModule).toHaveBeenCalledWith(7);
    expect(publicCollection?.public_id).toBe('ambient');
    expect(currentUserCollection?.public).toBeFalse();
    expect(analytics.capture).toHaveBeenCalledWith('module_collection.viewed', {
      collection_id: 1,
      source: 'public'
    });
    expect(analytics.capture).toHaveBeenCalledWith('module_collection.viewed', {
      collection_id: 2,
      source: 'user_area'
    });
  });

  it('delegates create, update, and delete actions to the backend', () => {
    const {service, backend, analytics} = build();

    service.saveCollection({name: 'New set', moduleIds: [1, 2]}).subscribe();
    service.saveCollection({id: 2, name: 'Updated set', moduleIds: [3]}).subscribe();
    service.deleteCollection(2).subscribe();

    expect(backend.add.moduleCollection).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'New set',
      moduleIds: [1, 2]
    }));
    expect(backend.update.moduleCollection).toHaveBeenCalledWith(jasmine.objectContaining({
      id: 2,
      name: 'Updated set',
      moduleIds: [3]
    }));
    expect(backend.delete.moduleCollection).toHaveBeenCalledWith(2);
    expect(analytics.capture).toHaveBeenCalledWith('module_collection.created', {
      collection_id: 11,
      module_count: 2,
      public: false
    });
    expect(analytics.capture).toHaveBeenCalledWith('module_collection.updated', {
      collection_id: 2,
      module_count: 1,
      public: false
    });
    expect(analytics.capture).toHaveBeenCalledWith('module_collection.deleted', {collection_id: 2});
  });

  it('creates a minimal collection shell and returns the created id', () => {
    const {service, backend} = build();
    let createdId: number | undefined;

    service.createCollectionShell({name: 'Sketches', public: true}).subscribe(id => {
      createdId = id;
    });

    expect(createdId).toBe(11);
    expect(backend.add.moduleCollection).toHaveBeenCalledWith(jasmine.objectContaining({
      name: 'Sketches',
      public: true,
      moduleIds: []
    }));
  });

  it('patches the current user collection locally after editor autosave', () => {
    const {service} = build();
    let currentUserCollection: ModuleCollectionDetail | undefined;
    service.currentUserCollection$.subscribe(collection => currentUserCollection = collection);
    const collection = {
      id: 2,
      name: 'Private notes',
      public: false,
      public_id: 'private',
      author: {username: 'Me'},
      entries: [{id: 1, ordinal: 0, module: {id: 99, name: 'Saved module'}}],
      module_count: 1
    } as any;

    service.localCurrentUserCollectionUpdated$.next(collection);

    expect(currentUserCollection).toBe(collection);
  });
});
