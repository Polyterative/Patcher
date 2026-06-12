import { fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { ModuleCollectionEditorDataService } from './module-collection-editor-data.service';

describe('ModuleCollectionEditorDataService', () => {
  function build() {
    const backend = {
      GET: {
        searchPublicModulesForCollection: jasmine.createSpy('searchPublicModulesForCollection').and.returnValue(of([
          {id: 7, name: 'Clouds', manufacturer: {name: 'Mutable Instruments'}}
        ]))
      },
      storage: {
        uploadCollectionCover: jasmine.createSpy('uploadCollectionCover')
      }
    };
    const collectionsDataService = {
      saveCollection: jasmine.createSpy('saveCollection').and.returnValue(of(1))
    };
    const snackBar = {
      open: jasmine.createSpy('open')
    };
    const service = new ModuleCollectionEditorDataService(backend as any, collectionsDataService as any, snackBar as any);

    return {service, backend, collectionsDataService};
  }

  function buildCollection() {
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
      module_count: 1,
      entries: [
        {id: 1, ordinal: 0, module: {id: 99, name: 'Maths'}}
      ]
    } as any;
  }

  it('does not dump the module catalogue before the query is specific enough', () => {
    const {service, backend} = build();
    let results: unknown[] | undefined;

    service.searchModules(' c ').subscribe(value => {
      results = value;
    });

    expect(results).toEqual([]);
    expect(backend.GET.searchPublicModulesForCollection).not.toHaveBeenCalled();
  });

  it('searches public modules once the query has at least two characters', () => {
    const {service, backend} = build();
    let results: unknown[] | undefined;

    service.searchModules('cl').subscribe(value => {
      results = value;
    });

    expect(results).toEqual([
      {id: 7, name: 'Clouds', manufacturer: {name: 'Mutable Instruments'}}
    ]);
    expect(backend.GET.searchPublicModulesForCollection).toHaveBeenCalledWith('cl', 24);
  });

  it('autosaves title edits for an existing collection like rack name editing', fakeAsync(() => {
    const {service, collectionsDataService} = build();
    const collection = buildCollection();
    let updatedCollection: any;
    service.collectionUpdated$.subscribe(value => updatedCollection = value);

    service.initializeCollection(collection);
    service.nameControl.setValue('Utility stack revised');
    tick(799);

    expect(collectionsDataService.saveCollection).not.toHaveBeenCalled();

    tick(1);

    expect(collectionsDataService.saveCollection).toHaveBeenCalledOnceWith({
      id: 12,
      name: 'Utility stack revised',
      description: 'Useful utilities',
      public: false,
      image: null,
      moduleIds: [99]
    });
    expect(updatedCollection.name).toBe('Utility stack revised');
    expect(updatedCollection.entries.map((entry: any) => entry.module.id)).toEqual([99]);
  }));

  it('autosaves cover changes for an existing collection without an explicit save click', fakeAsync(() => {
    const {service, backend, collectionsDataService} = build();
    const collection = buildCollection();
    const file = new File(['cover'], 'cover.jpg', {type: 'image/jpeg'});
    let updatedCollection: any;
    spyOn(URL, 'createObjectURL').and.returnValue('blob:cover-preview');
    backend.storage.uploadCollectionCover.and.returnValue(of('covers/utility-stack.jpg'));
    service.collectionUpdated$.subscribe(value => updatedCollection = value);

    service.initializeCollection(collection);
    service.onCoverFileChange({0: file, length: 1, item: () => file} as any);
    tick();

    expect(backend.storage.uploadCollectionCover).toHaveBeenCalledWith(file, jasmine.stringMatching(/^utility-stack-.*\.jpg$/));
    expect(collectionsDataService.saveCollection).toHaveBeenCalledOnceWith({
      id: 12,
      name: 'Utility stack',
      description: 'Useful utilities',
      public: false,
      image: 'covers/utility-stack.jpg',
      moduleIds: [99]
    });
    expect(updatedCollection.image).toBe('covers/utility-stack.jpg');
  }));
});
