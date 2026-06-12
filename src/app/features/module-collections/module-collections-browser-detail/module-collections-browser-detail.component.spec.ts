import { BehaviorSubject, Subject } from 'rxjs';
import { ModuleCollectionsBrowserDetailComponent } from './module-collections-browser-detail.component';
import { ModuleCollectionDetail } from 'src/app/models/module-collection';

describe('ModuleCollectionsBrowserDetailComponent', () => {
  function build() {
    const dataService = {
      collection$: new BehaviorSubject<ModuleCollectionDetail | undefined>(undefined),
      load$: new Subject<string>(),
      loadOwnedById$: new Subject<number>(),
      localCollectionUpdated$: new Subject<ModuleCollectionDetail>(),
      clearCollection: jasmine.createSpy('clearCollection')
    };
    const component = new ModuleCollectionsBrowserDetailComponent(
      dataService as any,
      { loggedUser$: new BehaviorSubject(null) } as any,
      { params: new Subject() } as any,
      { updateSeo: jasmine.createSpy('updateSeo') } as any
    );

    return { component, dataService };
  }

  function buildCollection(): ModuleCollectionDetail {
    return {
      id: 12,
      authorid: 'user-1',
      author: { id: 'user-1', username: 'collector' } as any,
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
    spyOn(dataService.loadOwnedById$, 'next').and.callThrough();
    component.collectionEditingPanelOpenState$.next(true);

    component.onCollectionSaved(collection);

    expect(component.collectionEditingPanelOpenState$.getValue()).toBeFalse();
    expect(dataService.loadOwnedById$.next).toHaveBeenCalledOnceWith(collection.id);
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
        {id: 1, ordinal: 0, module: {id: 1, hp: 10, manufacturer: {id: 1}, standard: {name: '3U Doepfer'}}},
        {id: 2, ordinal: 1, module: {id: 2, hp: 20, manufacturer: {id: 2}, standard: {name: 'Intellijel 1U'}}},
        {id: 3, ordinal: 2, module: {id: 3, hp: 6, manufacturer: {id: 1}, standard: {name: '3U Doepfer'}}}
      ] as any
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
});
