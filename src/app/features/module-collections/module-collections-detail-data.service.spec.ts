import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { MinimalModule } from 'src/app/models/module';
import { ModuleCollectionDetail } from 'src/app/models/module-collection';
import { ModuleCollectionsDetailDataService } from './module-collections-detail-data.service';

describe('ModuleCollectionsDetailDataService', () => {
  type SpyMethod<T> = T extends (...args: infer Params) => infer Result
    ? jasmine.Spy<(...args: Params) => Result>
    : never;

  interface BackendDouble {
    GET: {
      publicModuleCollectionByPublicId: SpyMethod<SupabaseService['GET']['publicModuleCollectionByPublicId']>;
      currentUserModuleCollectionById: SpyMethod<SupabaseService['GET']['currentUserModuleCollectionById']>;
    };
  }

  function buildModule(id: number, name: string): MinimalModule {
    return {
      id,
      name,
      description: 'Collection module',
      hp: 8,
      public: true,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      manufacturerId: 1,
      manufacturer: {id: 1, name: 'Maker'},
      standard: {id: 0, name: '3U Doepfer'},
      tags: [],
      panels: []
    };
  }

  function build() {
    const backend: BackendDouble = {
      GET: {
        publicModuleCollectionByPublicId: jasmine.createSpy('publicModuleCollectionByPublicId').and.returnValue(of(undefined)),
        currentUserModuleCollectionById: jasmine.createSpy('currentUserModuleCollectionById').and.returnValue(of(undefined))
      }
    };
    const analytics = jasmine.createSpyObj<AnalyticsService>('AnalyticsService', ['capture']);
    TestBed.configureTestingModule({
      providers: [
        ModuleCollectionsDetailDataService,
        {provide: SupabaseService, useValue: backend},
        {provide: AnalyticsService, useValue: analytics}
      ]
    });
    const service = TestBed.inject(ModuleCollectionsDetailDataService);
    return {service, backend};
  }

  it('patches the visible collection locally after editor autosave', () => {
    const {service} = build();
    let visibleCollection: ModuleCollectionDetail | undefined;
    service.collection$.subscribe(collection => visibleCollection = collection);
    const collection: ModuleCollectionDetail = {
      id: 3,
      authorid: 'user-1',
      name: 'Liquid filters',
      public: true,
      public_id: 'liquid',
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      author: {id: 'user-1', username: 'Curator'},
      entries: [{id: 1, ordinal: 0, module: buildModule(12, 'Filter')}],
      module_count: 1
    };

    service.localCollectionUpdated$.next(collection);

    expect(visibleCollection).toBe(collection);
  });

});
