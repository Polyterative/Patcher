import { ActivatedRoute, Params } from '@angular/router';
import { BehaviorSubject, Subject } from 'rxjs';
import { ModuleCollectionsBrowserDetailComponent } from './module-collections-browser-detail.component';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SimpleUserModel } from 'src/app/features/backend/supabase.service';
import {
  ModuleCollectionDetail,
  ModuleCollectionEntry
} from 'src/app/models/module-collection';
import { MinimalModule } from 'src/app/models/module';
import { MinimalManufacturer } from 'src/app/models/manufacturer';
import { Standard } from 'src/app/models/standard';
import { ModuleCollectionsDetailDataService } from '../module-collections-detail-data.service';

type DetailDataServiceDouble = ModuleCollectionsDetailDataService & {
  collection$: BehaviorSubject<ModuleCollectionDetail | undefined>;
  clearCollection: jasmine.Spy<ModuleCollectionsDetailDataService['clearCollection']>;
};
type SeoAndUtilsServiceDouble = SeoAndUtilsService & {
  updateSeo: jasmine.Spy<SeoAndUtilsService['updateSeo']>;
};

describe('ModuleCollectionsBrowserDetailComponent', () => {
  function build() {
    const routeParams$ = new Subject<Params>();
    const seoAndUtilsService: SeoAndUtilsServiceDouble = Object.assign(
      Object.create(SeoAndUtilsService.prototype) as SeoAndUtilsService,
      { updateSeo: jasmine.createSpy<SeoAndUtilsService['updateSeo']>('updateSeo') }
    );
    const dataService: DetailDataServiceDouble = Object.assign(
      Object.create(ModuleCollectionsDetailDataService.prototype) as ModuleCollectionsDetailDataService,
      {
      collection$: new BehaviorSubject<ModuleCollectionDetail | undefined>(undefined),
      load$: new Subject<string>(),
      loadOwnedById$: new Subject<number>(),
      localCollectionUpdated$: new Subject<ModuleCollectionDetail>(),
      clearCollection: jasmine.createSpy<ModuleCollectionsDetailDataService['clearCollection']>('clearCollection')
      }
    );
    const userManagementService = Object.assign(
      Object.create(UserManagementService.prototype) as UserManagementService,
      { loggedUser$: new BehaviorSubject<SimpleUserModel | undefined>(undefined) }
    );
    const route = Object.assign(
      Object.create(ActivatedRoute.prototype) as ActivatedRoute,
      { params: routeParams$ }
    );
    const component = new ModuleCollectionsBrowserDetailComponent(
      dataService,
      userManagementService,
      route,
      seoAndUtilsService
    );

    return { component, dataService, routeParams$, seoAndUtilsService };
  }

  function buildMinimalModule(
    overrides: Partial<MinimalModule> & Pick<MinimalModule, 'id'>
  ): MinimalModule {
    const manufacturer = overrides.manufacturer ?? { id: 1, name: 'Make Noise' };
    const standard = overrides.standard ?? { id: 1, name: '3U Doepfer' };

    return {
      id: overrides.id,
      name: `Module ${ overrides.id }`,
      description: '',
      hp: 0,
      public: true,
      manufacturer,
      manufacturerId: manufacturer.id,
      standard,
      tags: [],
      panels: [],
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      ...overrides
    };
  }

  function buildEntry(
    id: number,
    ordinal: number,
    module: MinimalModule
  ): ModuleCollectionEntry {
    return { id, ordinal, module };
  }

  function buildManufacturer(id: number, name: string): MinimalManufacturer {
    return { id, name };
  }

  function buildStandard(id: number, name: string): Standard {
    return { id, name };
  }

  function buildCollection(): ModuleCollectionDetail {
    return {
      id: 12,
      authorid: 'user-1',
      author: { id: 'user-1', username: 'collector' },
      name: 'Utility stack',
      description: 'Useful utilities',
      image: null,
      public: false,
      public_id: 'utility-stack',
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      module_count: 0,
      entries: []
    };
  }

  it('keeps edit mode open when silent autosave patches local collection data', () => {
    const { component, dataService } = build();
    const collection = buildCollection();
    spyOn(dataService.localCollectionUpdated$, 'next').and.callThrough();
    component.collectionEditingPanelOpenState$.next(true);

    component.onCollectionUpdated(collection);

    expect(dataService.localCollectionUpdated$.next).toHaveBeenCalledOnceWith(collection);
    expect(component.collectionEditingPanelOpenState$.getValue()).toBeTrue();
  });

  it('closes edit mode only after explicit save', () => {
    const { component, dataService } = build();
    const collection = buildCollection();
    spyOn(dataService.load$, 'next').and.callThrough();
    component.collectionEditingPanelOpenState$.next(true);

    component.onCollectionSaved(collection);

    expect(component.collectionEditingPanelOpenState$.getValue()).toBeFalse();
    expect(dataService.load$.next).toHaveBeenCalledOnceWith(collection.public_id);
  });

  it('renders read-only module tags in public collection details', () => {
    const { component } = build();

    expect(component.viewConfig.hideTags).toBeFalse();
    expect(component.viewConfig.tagsReadOnly).toBeTrue();
  });

  it('summarizes useful module width and timing stats without exposing public id', () => {
    const { component } = build();
    const collection = {
      ...buildCollection(),
      created: '2026-06-10T10:00:00.000Z',
      updated: '2026-06-12T12:30:00.000Z',
      entries: [
        buildEntry(1, 0, buildMinimalModule({
          id: 1,
          hp: 10,
          manufacturer: buildManufacturer(1, 'Make Noise'),
          standard: buildStandard(1, '3U Doepfer')
        })),
        buildEntry(2, 1, buildMinimalModule({
          id: 2,
          hp: 20,
          manufacturer: buildManufacturer(2, 'Intellijel'),
          standard: buildStandard(2, 'Intellijel 1U')
        })),
        buildEntry(3, 2, buildMinimalModule({
          id: 3,
          hp: 6,
          manufacturer: buildManufacturer(1, 'Make Noise'),
          standard: buildStandard(1, '3U Doepfer')
        }))
      ]
    };

    const stats = component.collectionStats(collection);

    expect(stats.map(stat => stat.label)).not.toContain('Public ID');
    expect(stats).toContain(jasmine.objectContaining({label: 'Modules', value: '3'}));
    expect(stats).toContain(jasmine.objectContaining({label: 'Total width', value: '36 HP'}));
    expect(stats).toContain(jasmine.objectContaining({label: 'Average width', value: '12 HP'}));
    expect(stats).toContain(jasmine.objectContaining({label: 'Manufacturers', value: '2'}));
    expect(stats).toContain(jasmine.objectContaining({label: 'Formats', value: '2'}));
    expect(stats.map(stat => stat.label)).toEqual(jasmine.arrayContaining(['Created', 'Updated']));
  });

  it('emits share-ready SEO metadata for public collection details', () => {
    const { component, dataService, seoAndUtilsService } = build();
    const collection = {
      ...buildCollection(),
      public: true,
      image: 'covers/utility-stack.jpg',
      module_count: 2,
      entries: [
        buildEntry(1, 0, buildMinimalModule({
          id: 1,
          name: 'Maths',
          manufacturer: buildManufacturer(1, 'Make Noise')
        })),
        buildEntry(2, 1, buildMinimalModule({
          id: 2,
          name: 'Plaits',
          manufacturer: buildManufacturer(2, 'Mutable Instruments')
        }))
      ]
    };

    component.ngOnInit();
    dataService.collection$.next(collection);

    expect(seoAndUtilsService.updateSeo).toHaveBeenCalledWith(
      jasmine.objectContaining({
        title: 'Utility stack - Module collection',
        description: jasmine.stringMatching(/Useful utilities.*collector.*2 modules.*Maths, Plaits/),
        url: 'https://patcher.xyz/collections/utility-stack',
        author: 'collector',
        published: '2026-01-01T00:00:00.000Z',
        modified: '2026-01-01T00:00:00.000Z',
        keywords: jasmine.stringMatching(/Utility stack.*Make Noise.*Mutable Instruments.*eurorack/),
        image: jasmine.stringMatching(/\/storage\/v1\/object\/public\/module-collections\/covers\/utility-stack\.jpg$/)
      }),
      'Utility stack — Module collection'
    );
    component.ngOnDestroy();
  });

  it('omits SEO image when a collection has no cover image', () => {
    const { component, dataService, seoAndUtilsService } = build();

    component.ngOnInit();
    dataService.collection$.next(buildCollection());

    const seoData = seoAndUtilsService.updateSeo.calls.mostRecent().args[0];
    expect(seoData.image).toBeUndefined();
    component.ngOnDestroy();
  });
});
