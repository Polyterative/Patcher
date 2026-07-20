import { SimpleChange } from '@angular/core';
import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { SeoAndUtilsService } from 'src/app/features/backbone/seo-and-utils.service';
import { UserManagementService } from 'src/app/features/backbone/login/user-management.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { ModuleCollectionsDataService } from 'src/app/features/module-collections/module-collections-data.service';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { ModuleDetailDataService } from 'src/app/components/module-parts/module-detail-data.service';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { AppShellLayoutService } from 'src/app/shared-interproject/app-shell-layout.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { ModuleCollectionEditorComponent } from './module-collection-editor.component';
import { ModuleCollectionEditorModule } from './module-collection-editor.module';
import { MinimalModule } from 'src/app/models/module';
import { ModuleCollectionDetail } from 'src/app/models/module-collection';

describe('ModuleCollectionEditorComponent', () => {
  let fixture: ComponentFixture<ModuleCollectionEditorComponent>;
  let collectionsDataService: jasmine.SpyObj<ModuleCollectionsDataService>;

  function buildModule(id: number, name = `Module ${ id }`): MinimalModule {
    return {
      id,
      name,
      description: 'Description',
      hp: 8,
      public: true,
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      manufacturerId: 1,
      manufacturer: {id: 1, name: 'Maker'} as any,
      standard: {id: 0, name: '3U Doepfer'} as any,
      tags: [],
      panels: []
    };
  }

  function buildCollection(modules: MinimalModule[] = [buildModule(1)]): ModuleCollectionDetail {
    return {
      id: 44,
      authorid: 'user-1',
      author: {id: 'user-1', username: 'creator'} as any,
      name: 'Distortion playlist',
      description: 'Rationale',
      image: null,
      public: false,
      public_id: 'distortion-playlist',
      created: '2026-01-01T00:00:00.000Z',
      updated: '2026-01-01T00:00:00.000Z',
      module_count: modules.length,
      entries: modules.map((module, index) => ({
        id: index + 1,
        ordinal: index,
        module
      }))
    };
  }

  beforeEach(async () => {
    collectionsDataService = jasmine.createSpyObj<ModuleCollectionsDataService>(
      'ModuleCollectionsDataService',
      ['saveCollection']
    );
    collectionsDataService.saveCollection.and.returnValue(of(1));

    await TestBed.configureTestingModule({
      imports: [
        ModuleCollectionEditorModule,
        NoopAnimationsModule,
        RouterTestingModule
      ],
      providers: [
        {
          provide: ModuleCollectionsDataService,
          useValue: collectionsDataService
        },
        {
          provide: SupabaseService,
          useValue: {
            GET: {
              manufacturers: jasmine.createSpy('manufacturers').and.returnValue(of({data: []})),
              modules: jasmine.createSpy('modules').and.returnValue(of({data: [], count: 0}))
            },
            get: {
              allTags: jasmine.createSpy('allTags').and.returnValue(of([]))
            },
            auth: {
              hasAdminRole$: jasmine.createSpy('hasAdminRole$').and.returnValue(of(false))
            },
            cacheResetter$: {next: jasmine.createSpy('cacheResetter$.next')}
          }
        },
        {
          provide: AnalyticsService,
          useValue: {capture: jasmine.createSpy('capture')}
        },
        {
          provide: SeoAndUtilsService,
          useValue: {updateSeo: jasmine.createSpy('updateSeo')}
        },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({}),
            snapshot: {data: {backgroundImage: 'assets/svg/undraw_Search_1px8.svg'}}
          }
        },
        {
          provide: AppShellLayoutService,
          useValue: {wideShell$: new BehaviorSubject(false)}
        },
        {
          provide: AppStateService,
          useValue: {
            isDev: false,
            preferredPanelColor$: new BehaviorSubject(null)
          }
        },
        {
          provide: UserManagementService,
          useValue: {
            loggedUser$: new BehaviorSubject(undefined),
            loggedUserFullProfile$: new BehaviorSubject(undefined),
            isAdmin$: new BehaviorSubject(false),
            hasAdminRole$: new BehaviorSubject(false)
          }
        },
        {
          provide: PatchDetailDataService,
          useValue: {}
        },
        {
          provide: ModuleDetailDataService,
          useValue: {
            userModulesList$: new BehaviorSubject([]),
            singleModuleData$: new BehaviorSubject(undefined),
            setModulePossession$: new BehaviorSubject(null),
            requestAddModuleToRack$: new BehaviorSubject(null),
            copyModuleNameAndManufacturer$: new BehaviorSubject(undefined)
          }
        },
        {
          provide: RackDetailDataService,
          useValue: {
            singleRackData$: new BehaviorSubject(undefined),
            isCurrentRackEditable$: new BehaviorSubject(false),
            addModuleToRack$: new BehaviorSubject(null)
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ModuleCollectionEditorComponent);
  });

  it('shows the selected-module empty state and embedded browser by default', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('No modules selected');
    expect(text).toContain('Add modules to');
  });

  it('uses the shared browser action copy for adding modules to the playlist', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance.moduleBrowserAction.label).toBe('Add to playlist');
    expect(fixture.componentInstance.moduleBrowserAction.disabledLabel).toBe('Already in playlist');
  });

  it('keeps module tags read-only while editing collections', () => {
    expect(fixture.componentInstance.playlistModuleViewConfig.tagsReadOnly).toBeTrue();
    expect(fixture.componentInstance.browserModuleViewConfig.tagsReadOnly).toBeTrue();
  });

  it('hides the explicit save action while editing an existing collection', () => {
    const collection = buildCollection();
    fixture.componentInstance.surface = 'page';
    fixture.componentInstance.collection = collection;
    fixture.componentInstance.ngOnChanges({
      collection: new SimpleChange(undefined, collection, true)
    });

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Save changes');
    expect(fixture.nativeElement.textContent).not.toContain('Create collection');
    expect(fixture.nativeElement.querySelector('.module-collection-editor__page-actions')).toBeNull();
  });

  it('keeps the create action for new collections before autosave can exist', () => {
    fixture.componentInstance.surface = 'page';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Create collection');
    expect(fixture.nativeElement.querySelector('.module-collection-editor__page-actions')).not.toBeNull();
  });

  it('updates visibility from the public collection toggle', () => {
    fixture.detectChanges();

    const toggle = fixture.debugElement.query(By.directive(MatSlideToggle));
    toggle.triggerEventHandler('change', {checked: true});

    expect(fixture.componentInstance.publicControl.value).toBeTrue();
  });

  it('auto-saves selected module additions for existing collections', () => {
    const firstModule = buildModule(1);
    const secondModule = buildModule(2);
    const collection = buildCollection([firstModule]);
    fixture.componentInstance.collection = collection;
    fixture.componentInstance.ngOnChanges({
      collection: new SimpleChange(undefined, collection, true)
    });
    collectionsDataService.saveCollection.calls.reset();
    spyOn(fixture.componentInstance.saved, 'emit');
    spyOn(fixture.componentInstance.collectionUpdated, 'emit').and.callThrough();

    fixture.componentInstance.addModule$.next(secondModule);

    expect(fixture.componentInstance.selectedModules$.value.map(module => module.id)).toEqual([1, 2]);
    expect(collectionsDataService.saveCollection).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      id: 44,
      name: 'Distortion playlist',
      description: 'Rationale',
      public: false,
      image: null,
      moduleIds: [1, 2]
    }));
    expect(fixture.componentInstance.saved.emit).not.toHaveBeenCalled();
    expect(fixture.componentInstance.collectionUpdated.emit).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      id: 44,
      module_count: 2,
      entries: jasmine.arrayContaining([
        jasmine.objectContaining({module: secondModule})
      ])
    }));
  });

  it('auto-saves selected module removals for existing collections', () => {
    const firstModule = buildModule(1);
    const secondModule = buildModule(2);
    const collection = buildCollection([firstModule, secondModule]);
    fixture.componentInstance.collection = collection;
    fixture.componentInstance.ngOnChanges({
      collection: new SimpleChange(undefined, collection, true)
    });
    collectionsDataService.saveCollection.calls.reset();

    fixture.componentInstance.removeSelectedModule$.next(firstModule.id);

    expect(fixture.componentInstance.selectedModules$.value.map(module => module.id)).toEqual([2]);
    expect(collectionsDataService.saveCollection).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      id: 44,
      moduleIds: [2]
    }));
  });

  it('auto-saves selected module reordering for existing collections', () => {
    const firstModule = buildModule(1);
    const secondModule = buildModule(2);
    const thirdModule = buildModule(3);
    const collection = buildCollection([firstModule, secondModule, thirdModule]);
    fixture.componentInstance.collection = collection;
    fixture.componentInstance.ngOnChanges({
      collection: new SimpleChange(undefined, collection, true)
    });
    collectionsDataService.saveCollection.calls.reset();

    fixture.componentInstance.onSelectedModulesDrop({
      previousIndex: 2,
      currentIndex: 0
    } as any);

    expect(fixture.componentInstance.selectedModules$.value.map(module => module.id)).toEqual([3, 1, 2]);
    expect(collectionsDataService.saveCollection).toHaveBeenCalledOnceWith(jasmine.objectContaining({
      id: 44,
      moduleIds: [3, 1, 2]
    }));
  });

  it('rolls back optimistic module changes when autosave fails', () => {
    const firstModule = buildModule(1);
    const secondModule = buildModule(2);
    const collection = buildCollection([firstModule]);
    spyOn(console, 'error');
    collectionsDataService.saveCollection.and.returnValue(throwError(() => new Error('save failed')));
    fixture.componentInstance.collection = collection;
    fixture.componentInstance.ngOnChanges({
      collection: new SimpleChange(undefined, collection, true)
    });

    fixture.componentInstance.addModule$.next(secondModule);

    expect(fixture.componentInstance.selectedModules$.value.map(module => module.id)).toEqual([1]);
  });

  it('does not auto-save module additions before a new collection has been created', () => {
    fixture.detectChanges();
    collectionsDataService.saveCollection.calls.reset();

    fixture.componentInstance.addModule$.next(buildModule(5));

    expect(fixture.componentInstance.selectedModules$.value.map(module => module.id)).toEqual([5]);
    expect(collectionsDataService.saveCollection).not.toHaveBeenCalled();
  });
});
