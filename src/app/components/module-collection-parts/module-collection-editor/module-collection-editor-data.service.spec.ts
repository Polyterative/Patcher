import {
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { ModuleCollectionsDataService } from 'src/app/features/module-collections/module-collections-data.service';
import { MinimalModule } from 'src/app/models/module';
import { ModuleCollectionDetail } from 'src/app/models/module-collection';
import { ModuleCollectionEditorDataService } from './module-collection-editor-data.service';

describe('ModuleCollectionEditorDataService', () => {
  type SpyMethod<T> = T extends (...args: infer Params) => infer Result
    ? jasmine.Spy<(...args: Params) => Result>
    : never;

  interface BackendDouble {
    GET: {
      searchPublicModulesForCollection: SpyMethod<SupabaseService['GET']['searchPublicModulesForCollection']>;
    };
    storage: {
      uploadCollectionCover: SpyMethod<SupabaseService['storage']['uploadCollectionCover']>;
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
        searchPublicModulesForCollection: jasmine.createSpy('searchPublicModulesForCollection').and.returnValue(of([
          buildModule(7, 'Clouds')
        ]))
      },
      storage: {
        uploadCollectionCover: jasmine.createSpy('uploadCollectionCover')
      }
    };
    const collectionsDataService = jasmine.createSpyObj<ModuleCollectionsDataService>(
      'ModuleCollectionsDataService',
      ['saveCollection']
    );
    collectionsDataService.saveCollection.and.returnValue(of(1));
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      providers: [
        ModuleCollectionEditorDataService,
        {provide: SupabaseService, useValue: backend},
        {provide: ModuleCollectionsDataService, useValue: collectionsDataService},
        {provide: MatSnackBar, useValue: snackBar}
      ]
    });
    const service = TestBed.inject(ModuleCollectionEditorDataService);

    return {service, backend, collectionsDataService, snackBar};
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
      module_count: 1,
      entries: [
        {id: 1, ordinal: 0, module: buildModule(99, 'Maths')}
      ]
    };
  }

  function buildFileList(file: File): FileList {
    return {
      0: file,
      length: 1,
      item: (index: number) => index === 0 ? file : null,
      [Symbol.iterator]: function* () {
        yield file;
      }
    };
  }

  it('does not dump the module catalogue before the query is specific enough', () => {
    const {service, backend} = build();
    let results: MinimalModule[] | undefined;

    service.searchModules(' c ').subscribe(value => {
      results = value;
    });

    expect(results).toEqual([]);
    expect(backend.GET.searchPublicModulesForCollection).not.toHaveBeenCalled();
  });

  it('searches public modules once the query has at least two characters', () => {
    const {service, backend} = build();
    let results: MinimalModule[] | undefined;

    service.searchModules('cl').subscribe(value => {
      results = value;
    });

    expect(results).toEqual([
      buildModule(7, 'Clouds')
    ]);
    expect(backend.GET.searchPublicModulesForCollection).toHaveBeenCalledWith('cl', 24);
  });

  it('autosaves title edits for an existing collection like rack name editing', fakeAsync(() => {
    const {service, collectionsDataService} = build();
    const collection = buildCollection();
    let updatedCollection: ModuleCollectionDetail | undefined;
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
    expect(updatedCollection?.name).toBe('Utility stack revised');
    expect(updatedCollection?.entries.map(entry => entry.module.id)).toEqual([99]);
  }));

  it('autosaves cover changes for an existing collection without an explicit save click', fakeAsync(() => {
    const {service, backend, collectionsDataService} = build();
    const collection = buildCollection();
    const file = new File(['cover'], 'cover.jpg', {type: 'image/jpeg'});
    let updatedCollection: ModuleCollectionDetail | undefined;
    spyOn(URL, 'createObjectURL').and.returnValue('blob:cover-preview');
    backend.storage.uploadCollectionCover.and.returnValue(of('covers/utility-stack.jpg'));
    service.collectionUpdated$.subscribe(value => updatedCollection = value);

    service.initializeCollection(collection);
    service.onCoverFileChange(buildFileList(file));
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
    expect(updatedCollection?.image).toBe('covers/utility-stack.jpg');
  }));

  it('blocks an explicit save with an empty title and marks the title control touched', () => {
    const {service, collectionsDataService, snackBar} = build();

    service.save$.next();

    expect(service.nameControl.touched).toBeTrue();
    expect(collectionsDataService.saveCollection).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Please enter a collection title.',
      undefined,
      {duration: 3000, panelClass: 'snack-info'}
    );
  });

  it('creates a collection and signals explicit-save success', () => {
    const {service, collectionsDataService, snackBar} = build();
    const module = buildModule(7, 'Clouds');
    let completed = false;
    service.nameControl.setValue('New collection');
    service.addModule$.next(module);
    service.explicitSaveCompleted$.subscribe(() => completed = true);

    service.save$.next();

    expect(collectionsDataService.saveCollection).toHaveBeenCalledOnceWith({
      name: 'New collection',
      description: '',
      public: false,
      image: null,
      moduleIds: [7]
    });
    expect(completed).toBeTrue();
    expect(service.saving$.value).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Collection created.',
      undefined,
      {duration: 4000, panelClass: 'snack-success'}
    );
  });

  it('reports an explicit save failure without emitting completion', () => {
    const {service, collectionsDataService, snackBar} = build();
    const error = new Error('offline');
    spyOn(console, 'error');
    collectionsDataService.saveCollection.and.returnValue(throwError(() => error));
    service.nameControl.setValue('New collection');
    let completed = false;
    service.explicitSaveCompleted$.subscribe(() => completed = true);

    service.save$.next();

    expect(completed).toBeFalse();
    expect(service.saving$.value).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to save collection.',
      undefined,
      {duration: 5000, panelClass: 'snack-error'}
    );
  });

  it('patches local module entries after a successful playlist autosave', () => {
    const {service, collectionsDataService} = build();
    const collection = buildCollection();
    const addedModule = buildModule(7, 'Clouds');
    let updatedCollection: ModuleCollectionDetail | undefined;
    service.initializeCollection(collection);
    service.collectionUpdated$.subscribe(value => updatedCollection = value);

    service.addModule$.next(addedModule);

    expect(collectionsDataService.saveCollection).toHaveBeenCalledOnceWith({
      id: 12,
      name: 'Utility stack',
      description: 'Useful utilities',
      public: false,
      image: null,
      moduleIds: [99, 7]
    });
    expect(service.selectedModules$.value.map(module => module.id)).toEqual([99, 7]);
    expect(updatedCollection?.entries.map(entry => [entry.id, entry.ordinal, entry.module.id])).toEqual([
      [1, 0, 99],
      [0, 1, 7]
    ]);
    expect(service.saving$.value).toBeFalse();
  });

  it('reverts optimistic module changes and reports a failed playlist autosave', () => {
    const {service, collectionsDataService, snackBar} = build();
    spyOn(console, 'error');
    collectionsDataService.saveCollection.and.returnValue(throwError(() => new Error('offline')));
    service.initializeCollection(buildCollection());

    service.addModule$.next(buildModule(7, 'Clouds'));

    expect(service.selectedModules$.value.map(module => module.id)).toEqual([99]);
    expect(service.saving$.value).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Failed to save collection modules - changes reverted. Check your connection and try again.',
      undefined,
      {duration: 5000, panelClass: 'snack-error'}
    );
  });

  it('stops handling module changes after the service is destroyed', () => {
    const {service, collectionsDataService} = build();
    service.initializeCollection(buildCollection());
    service.ngOnDestroy();

    service.addModule$.next(buildModule(7, 'Clouds'));

    expect(service.selectedModules$.value.map(module => module.id)).toEqual([99]);
    expect(collectionsDataService.saveCollection).not.toHaveBeenCalled();
  });
});
