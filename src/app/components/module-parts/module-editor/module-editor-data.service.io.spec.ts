import {
  BehaviorSubject,
  Observable,
  of
} from 'rxjs';
import {
  UntypedFormControl,
  UntypedFormGroup
} from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import { CV } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SupabaseStorageFile } from 'src/app/features/backend/supabase.types';
import { Database } from 'src/backend/database.types';
import {
  FormCV,
  ModuleEditorDataService
} from './module-editor-data.service';

type BackendResponse<T> = {
  data: T;
  error: null;
};

type ModulePanelInsert = Database['public']['Tables']['module_panels']['Insert'];
type ModuleUpdate = (data: Partial<DbModule>) => Observable<BackendResponse<null>>;
type ModuleInsOutsUpdate = (moduleId: number, ins: CV[], outs: CV[]) => Observable<BackendResponse<CV[]>>;
type UploadModulePanel = (
  file: SupabaseStorageFile,
  filenameAndExtension: string,
  contentType?: string
) => Observable<string>;
type AddPanel = (data: ModulePanelInsert[]) => Observable<BackendResponse<ModulePanelInsert[]>>;

type ModuleUpdateSpy = jasmine.Spy<ModuleUpdate>;
type ModuleInsOutsUpdateSpy = jasmine.Spy<ModuleInsOutsUpdate>;
type UploadModulePanelSpy = jasmine.Spy<UploadModulePanel>;
type AddPanelSpy = jasmine.Spy<AddPanel>;

interface ModuleEditorBackendDouble {
  update: {
    module: ModuleUpdateSpy;
    moduleINsOUTs: ModuleInsOutsUpdateSpy;
  };
  storage: {
    uploadModulePanel: UploadModulePanelSpy;
  };
  add: {
    panel: AddPanelSpy;
  };
}

function backendResponse<T>(data: T): BackendResponse<T> {
  return {
    data,
    error: null
  };
}

function makeDbModule(partial: Partial<DbModule> = {}): DbModule {
  return {
    id: 1,
    name: 'Test Module',
    hp: 4,
    ins: [],
    outs: [],
    switches: [],
    manualURL: '',
    store_url: null,
    additional: null,
    isComplete: false,
    isApproved: false,
    isDIY: false,
    powerPos12: 0,
    powerNeg12: 0,
    powerPos5: 0,
    depth: 0,
    weight: 0,
    public: true,
    manufacturer: {id: 1, name: 'Test Manufacturer'},
    manufacturerId: 1,
    standard: {id: 1, name: '3U'},
    tags: [],
    panels: [],
    description: '',
    created: '',
    updated: '',
    ...partial
  };
}

function makeBackendDouble(): ModuleEditorBackendDouble {
  return {
    update: {
      module: jasmine
        .createSpy<ModuleUpdate>('update.module')
        .and.returnValue(of(backendResponse(null))),
      moduleINsOUTs: jasmine
        .createSpy<ModuleInsOutsUpdate>('update.moduleINsOUTs')
        .and.returnValue(of(backendResponse([])))
    },
    storage: {
      uploadModulePanel: jasmine
        .createSpy<UploadModulePanel>('storage.uploadModulePanel')
        .and.returnValue(of('panel-db.jpg'))
    },
    add: {
      panel: jasmine
        .createSpy<AddPanel>('add.panel')
        .and.returnValue(of(backendResponse([])))
    }
  };
}


describe('ModuleEditorDataService I/O branches', () => {
  let service: ModuleEditorDataService;
  let backend: ModuleEditorBackendDouble;
  
  beforeEach(() => {
    backend = makeBackendDouble();
    TestBed.configureTestingModule({
      providers: [
        ModuleEditorDataService,
        {provide: SupabaseService, useValue: backend}
      ]
    });
    service = TestBed.inject(ModuleEditorDataService);
  });
  
  it('rebuilds CV controls and publishes container value', () => {
    const group = new UntypedFormGroup({
      old: new UntypedFormControl('old')
    });
    const subject = new BehaviorSubject<FormCV[]>([]);
    const cvs: FormCV[] = [
      {
        id: 0,
        isApproved: false,
        isAudio: null,
        isDCC: null,
        isVOCT: null,
        name: new UntypedFormControl('A'),
        a: new UntypedFormControl(0),
        b: new UntypedFormControl(5)
      },
      {
        id: 1,
        isApproved: true,
        isAudio: null,
        isDCC: null,
        isVOCT: null,
        name: new UntypedFormControl('Locked'),
        a: new UntypedFormControl(1),
        b: new UntypedFormControl(2)
      }
    ];
    
    service.updateFormGroupAndContainer(cvs, group, subject);
    
    expect(group.contains('old')).toBeFalse();
    expect(group.contains('name0')).toBeTrue();
    expect(group.contains('a0')).toBeTrue();
    expect(group.contains('b0')).toBeTrue();
    expect(group.contains('name1')).toBeFalse();
    expect(subject.value).toEqual(cvs);
  });
  
  it('touchModule$ delegates to backend update.module', () => {
    service.touchModule$(321).subscribe();
    expect(backend.update.module).toHaveBeenCalledWith({id: 321});
  });

  it('queues a module power update with the entered rail values', () => {
    service.buildPersistPlan({
      module: makeDbModule({
        id: 17,
        name: 'Power Test',
        manufacturer: {id: 1, name: 'Acme'},
        standard: {id: 1, name: '3U'}
      }),
      pendingState: {
        ins: [],
        outs: [],
        shouldSaveInsOuts: false,
        shouldSavePower: true,
        shouldSavePhysical: false,
        shouldSavePanel: false,
        hasPendingChanges: true
      },
      powerPos12: 123,
      powerNeg12: 45,
      powerPos5: 6,
      weight: undefined,
      depth: undefined,
      panelFile: undefined,
      panelTypeValue: {name: 'light', value: 1},
      panelDescription: ''
    });

    expect(backend.update.module).toHaveBeenCalledWith({
      id: 17,
      powerPos12: 123,
      powerNeg12: 45,
      powerPos5: 6
    });
  });
  
  it('creates and executes panel-save operation when panel file exists', (done) => {
    const file = new File([new Uint8Array([0, 0, 0, 0])], 'frontpanel', {type: 'image/png'});
    
    const result = service.buildPersistPlan({
      module: makeDbModule({
        id: 7,
        name: 'My Module',
        manufacturer: {id: 1, name: 'Acme Co'},
        standard: {id: 1, name: '3U'}
      }),
      pendingState: {
        ins: [],
        outs: [],
        shouldSaveInsOuts: false,
        shouldSavePower: false,
        shouldSavePhysical: false,
        shouldSavePanel: true,
        hasPendingChanges: true
      },
      powerPos12: 0,
      powerNeg12: 0,
      powerPos5: 0,
      weight: undefined,
      depth: undefined,
      panelFile: file,
      panelTypeValue: {name: 'light', value: 2},
      panelDescription: 'desc'
    });
    
    expect(result.savedSections).toEqual(['panel']);
    expect(result.operations.length).toBe(1);
    
    result.operations[0].subscribe({
      complete: () => {
        expect(backend.storage.uploadModulePanel).toHaveBeenCalledWith(
          jasmine.any(ArrayBuffer),
          'My_Module-Acme_Co-light-3U.png',
          'image/png'
        );
        expect(backend.add.panel).toHaveBeenCalledWith([{
          filename: 'panel-db.jpg',
          color: 2,
          description: 'desc',
          moduleid: 7
        }]);
        done();
      }
    });
  });
  
  it('panel operation is a no-op when file is missing', (done) => {
    const result = service.buildPersistPlan({
      module: makeDbModule({
        id: 7,
        name: 'My Module',
        manufacturer: {id: 1, name: 'Acme Co'},
        standard: {id: 1, name: '3U'}
      }),
      pendingState: {
        ins: [],
        outs: [],
        shouldSaveInsOuts: false,
        shouldSavePower: false,
        shouldSavePhysical: false,
        shouldSavePanel: true,
        hasPendingChanges: true
      },
      powerPos12: 0,
      powerNeg12: 0,
      powerPos5: 0,
      weight: undefined,
      depth: undefined,
      panelFile: undefined,
      panelTypeValue: {name: 'light', value: 2},
      panelDescription: 'desc'
    });
    
    result.operations[0].subscribe({
      complete: () => {
        expect(backend.storage.uploadModulePanel).not.toHaveBeenCalled();
        expect(backend.add.panel).not.toHaveBeenCalled();
        done();
      }
    });
  });

  it('queues IN/OUT persistence and reports the saved section', () => {
    const ins: CV[] = [{id: 1, name: 'In', min: 0, max: 5, isApproved: false}];
    const outs: CV[] = [{id: 2, name: 'Out', min: -5, max: 5, isApproved: false}];
    const result = service.buildPersistPlan({
      module: makeDbModule({
        id: 7,
        name: 'Signal Module',
        manufacturer: {id: 1, name: 'Acme Co'},
        standard: {id: 1, name: '3U'}
      }),
      pendingState: {
        ins,
        outs,
        shouldSaveInsOuts: true,
        shouldSavePower: false,
        shouldSavePhysical: false,
        shouldSavePanel: false,
        hasPendingChanges: true
      },
      powerPos12: 0,
      powerNeg12: 0,
      powerPos5: 0,
      weight: undefined,
      depth: undefined,
      panelFile: undefined,
      panelTypeValue: {name: 'light', value: 2},
      panelDescription: 'desc'
    });

    expect(result.savedSections).toEqual(['IN/OUT ports']);
    expect(result.operations.length).toBe(1);
    expect(backend.update.moduleINsOUTs).toHaveBeenCalledWith(
      7,
      ins,
      outs
    );
    expect(backend.update.module).not.toHaveBeenCalled();
    expect(backend.storage.uploadModulePanel).not.toHaveBeenCalled();
  });
});
