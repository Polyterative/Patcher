import { Observable, of } from 'rxjs';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { ModuleCollectionsDataService } from './module-collections-data.service';
import {
  ModuleCollectionDetail,
  ModuleCollectionEntry,
  ModuleCollectionSummary
} from 'src/app/models/module-collection';
import { MinimalModule } from 'src/app/models/module';

interface ModuleCollectionMutationPayload {
  id?: number;
  name: string;
  description: string | null;
  public: boolean;
  image: string | null;
  moduleIds: number[];
}

type ModuleCollectionMutationResult = number | Record<string, never>;
type AddModuleCollection = (
  data: Omit<ModuleCollectionMutationPayload, 'id'>
) => Observable<ModuleCollectionMutationResult>;
type UpdateModuleCollection = (
  data: ModuleCollectionMutationPayload & { id: number }
) => Observable<number>;
type DeleteModuleCollection = (id: number) => Observable<Record<string, never>>;
type AnalyticsDouble = AnalyticsService & {
  capture: jasmine.Spy<AnalyticsService['capture']>;
};

describe('ModuleCollectionsDataService', () => {
  function buildSummary(overrides: Partial<ModuleCollectionSummary> = {}): ModuleCollectionSummary {
    return {
      id: 1,
      authorid: 'user-1',
      author: { id: 'user-1', username: 'Curator' },
      name: 'Ambient starters',
      description: null,
      image: null,
      public: true,
      public_id: 'ambient',
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-02T00:00:00.000Z',
      module_count: 2,
      ...overrides
    };
  }

  function buildDetail(overrides: Partial<ModuleCollectionDetail> = {}): ModuleCollectionDetail {
    return {
      ...buildSummary(overrides),
      entries: [],
      module_count: 0,
      ...overrides
    };
  }

  function buildMinimalModule(overrides: Partial<MinimalModule> & Pick<MinimalModule, 'id'>): MinimalModule {
    const manufacturer = overrides.manufacturer ?? { id: 1, name: 'Make Noise' };
    return {
      id: overrides.id,
      name: `Module ${ overrides.id }`,
      description: '',
      hp: 0,
      public: true,
      manufacturer,
      manufacturerId: manufacturer.id,
      standard: { id: 1, name: '3U Doepfer' },
      tags: [],
      panels: [],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      ...overrides
    };
  }

  function buildEntry(id: number, module: MinimalModule): ModuleCollectionEntry {
    return { id, ordinal: id - 1, module };
  }

  function build(addCollectionResult: ModuleCollectionMutationResult = 11) {
    const getNamespace = Object.assign(Object.create(null) as SupabaseService['GET'], {
      publicModuleCollections: jasmine.createSpy<SupabaseService['GET']['publicModuleCollections']>('publicModuleCollections')
        .and.returnValue(of([
          buildSummary()
        ])),
      currentUserModuleCollections: jasmine.createSpy<SupabaseService['GET']['currentUserModuleCollections']>('currentUserModuleCollections')
        .and.returnValue(of([
          buildSummary({
            id: 2,
            authorid: 'user-2',
            author: { id: 'user-2', username: 'Me' },
            name: 'Private notes',
            public: false,
            public_id: 'private',
            module_count: 1
          })
        ])),
      publicModuleCollectionByPublicId: jasmine.createSpy<SupabaseService['GET']['publicModuleCollectionByPublicId']>('publicModuleCollectionByPublicId')
        .and.returnValue(of(buildDetail())),
      currentUserModuleCollectionById: jasmine.createSpy<SupabaseService['GET']['currentUserModuleCollectionById']>('currentUserModuleCollectionById')
        .and.returnValue(of(buildDetail({
          id: 2,
          authorid: 'user-2',
          author: { id: 'user-2', username: 'Me' },
          name: 'Private notes',
          public: false,
          public_id: 'private'
        }))),
      moduleCollectionsForModule: jasmine.createSpy<SupabaseService['GET']['moduleCollectionsForModule']>('moduleCollectionsForModule')
        .and.returnValue(of([]))
    });
    const addNamespace = Object.assign(Object.create(null) as SupabaseService['add'], {
      moduleCollection: jasmine.createSpy<AddModuleCollection>('add.moduleCollection')
        .and.returnValue(of(addCollectionResult))
    });
    const updateNamespace = Object.assign(Object.create(null) as SupabaseService['update'], {
      moduleCollection: jasmine.createSpy<UpdateModuleCollection>('update.moduleCollection')
        .and.returnValue(of(12))
    });
    const deleteNamespace = Object.assign(Object.create(null) as SupabaseService['delete'], {
      moduleCollection: jasmine.createSpy<DeleteModuleCollection>('delete.moduleCollection')
        .and.returnValue(of({}))
    });
    const backend = Object.assign(Object.create(SupabaseService.prototype) as SupabaseService, {
      GET: getNamespace,
      add: addNamespace,
      update: updateNamespace,
      delete: deleteNamespace
    });

    const analytics: AnalyticsDouble = Object.assign(
      Object.create(AnalyticsService.prototype) as AnalyticsService,
      { capture: jasmine.createSpy<AnalyticsService['capture']>('capture') }
    );

    const service = new ModuleCollectionsDataService(backend, analytics);
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
    const collection: ModuleCollectionDetail = {
      id: 2,
      authorid: 'user-2',
      name: 'Private notes',
      public: false,
      public_id: 'private',
      author: { id: 'user-2', username: 'Me' },
      description: null,
      image: null,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-02T00:00:00.000Z',
      entries: [buildEntry(1, buildMinimalModule({ id: 99, name: 'Saved module' }))],
      module_count: 1
    };

    service.localCurrentUserCollectionUpdated$.next(collection);

    expect(currentUserCollection).toBe(collection);
  });
});
