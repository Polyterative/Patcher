import { UntypedFormControl } from '@angular/forms';
import { TestBed } from '@angular/core/testing';
import {
  Observable,
  of
} from 'rxjs';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { SupabaseStorageFile } from 'src/app/features/backend/supabase.types';
import { CV } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { Database } from 'src/backend/database.types';
import {
  FormCV,
  ModuleEditorDataService,
  PendingSaveState
} from './module-editor-data.service';
import { BuildPersistPlanArgs } from './module-editor-data.types';

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
type CreateImageBitmapForBlob = (blob: Blob) => Promise<ImageBitmap>;
type GetImageDataForAnalysis = CanvasRenderingContext2D['getImageData'];
type DrawImageForAnalysis = (image: CanvasImageSource, dx: number, dy: number, dWidth: number, dHeight: number) => void;
type SyncDataSnapshotParams = Parameters<ModuleEditorDataService['syncDataSnapshotAfterSave']>[0];

interface ModuleEditorBackendDouble {
  update: {
    module: jasmine.Spy<ModuleUpdate>;
    moduleINsOUTs: jasmine.Spy<ModuleInsOutsUpdate>;
  };
  storage: {
    uploadModulePanel: jasmine.Spy<UploadModulePanel>;
  };
  add: {
    panel: jasmine.Spy<AddPanel>;
  };
}

function backendResponse<T>(data: T): BackendResponse<T> {
  return {
    data,
    error: null
  };
}


function makeFormCV(partial: Partial<FormCV> = {}): FormCV {
  return {
    id: partial.id ?? 1,
    isApproved: partial.isApproved ?? false,
    name: partial.name ?? new UntypedFormControl('CV Name'),
    a: partial.a ?? new UntypedFormControl(0),
    b: partial.b ?? new UntypedFormControl(5)
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
        .and.returnValue(of('file.jpg'))
    },
    add: {
      panel: jasmine
        .createSpy<AddPanel>('add.panel')
        .and.returnValue(of(backendResponse([])))
    }
  };
}

function makeImageBitmap(width: number, height: number, close: () => void): ImageBitmap {
  return {
    width,
    height,
    close
  };
}

function makeImageData(data: Uint8ClampedArray<ArrayBuffer>): ImageData {
  return new ImageData(data, Math.max(1, data.length / 4), 1);
}

describe('ModuleEditorDataService', () => {
  let service: ModuleEditorDataService;
  let mockBackend: ModuleEditorBackendDouble;
  
  beforeEach(() => {
    mockBackend = makeBackendDouble();
    TestBed.configureTestingModule({
      providers: [
        ModuleEditorDataService,
        {provide: SupabaseService, useValue: mockBackend}
      ]
    });
    service = TestBed.inject(ModuleEditorDataService);
  });
  
  describe('buildCvSummary', () => {
    it('returns correct totals with mix of new (id=0) and stored (id>0) CVs', () => {
      const cvs = [
        makeFormCV({id: 0}),
        makeFormCV({id: 1}),
        makeFormCV({id: 0}),
        makeFormCV({id: 2})
      ];
      const result = service.buildCvSummary(cvs);
      expect(result.total).toBe(4);
      expect(result.editable).toBe(2);
      expect(result.locked).toBe(2);
    });
    
    it('editable is count of id===0 CVs', () => {
      const cvs = [makeFormCV({id: 0}), makeFormCV({id: 0}), makeFormCV({id: 3})];
      const result = service.buildCvSummary(cvs);
      expect(result.editable).toBe(2);
      expect(result.locked).toBe(1);
    });
  });

  describe('buildCroppedPanelFile', () => {
    it('creates a webp file when the cropped blob is webp', () => {
      const sourceFile = new File(['source'], 'front-panel.jpeg', {type: 'image/jpeg'});
      const croppedBlob = new Blob(['cropped'], {type: 'image/webp'});

      const result = service.buildCroppedPanelFile(sourceFile, croppedBlob);

      expect(result.name).toBe('front-panel-cropped.webp');
      expect(result.type).toBe('image/webp');
      expect(result.size).toBe(croppedBlob.size);
    });

    it('falls back to the source file extension when the blob type is missing', () => {
      const sourceFile = new File(['source'], 'front-panel.png', {type: 'image/png'});
      const croppedBlob = new Blob(['cropped']);

      const result = service.buildCroppedPanelFile(sourceFile, croppedBlob);

      expect(result.name).toBe('front-panel-cropped.png');
      expect(result.type).toBe('image/png');
    });

    it('falls back to a default jpg filename when neither blob nor source define a format', () => {
      const sourceFile = new File(['source'], 'panel-source');
      const croppedBlob = new Blob(['cropped']);

      const result = service.buildCroppedPanelFile(sourceFile, croppedBlob);

      expect(result.name).toBe('panel-source-cropped.jpg');
      expect(result.type).toBe('image/jpeg');
      expect(result.size).toBe(croppedBlob.size);
    });
  });

  describe('buildGuardedCroppedPanelFile', () => {
    const imageBitmapTarget = window as Window & {createImageBitmap?: CreateImageBitmapForBlob};
    let previousCreateImageBitmap: typeof imageBitmapTarget.createImageBitmap;
    let closeSpy: jasmine.Spy;

    beforeEach(() => {
      closeSpy = jasmine.createSpy('close');
      previousCreateImageBitmap = imageBitmapTarget.createImageBitmap;
      imageBitmapTarget.createImageBitmap = jasmine
        .createSpy<CreateImageBitmapForBlob>('createImageBitmap')
        .and.resolveTo(makeImageBitmap(320, 640, closeSpy));
    });

    afterEach(() => {
      imageBitmapTarget.createImageBitmap = previousCreateImageBitmap;
    });

    it('returns a structured advisory for the cropped panel file at the data-service seam', async () => {
      const sourceFile = new File(['source'], 'front-panel.jpeg', {type: 'image/jpeg'});
      const croppedBlob = new Blob(['cropped'], {type: 'image/webp'});

      const result = await service.buildGuardedCroppedPanelFile(sourceFile, croppedBlob, 'image/webp');

      expect(result.file.name).toBe('front-panel-cropped.webp');
      expect(result.file.type).toBe('image/webp');
      expect(result.compression.advisory.status).toBe('within-limits');
      expect(result.compression.widthPx).toBe(320);
      expect(result.compression.heightPx).toBe(640);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPreferredPanelCropFormat', () => {
    it('prefers webp when canvas encoding is supported', () => {
      const nativeCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        if (tagName === 'canvas') {
          const canvas = nativeCreateElement('canvas');
          spyOn(canvas, 'toDataURL')
            .and.callFake((type?: string) => type === 'image/webp' ? 'data:image/webp;base64,AAAA' : 'data:image/png;base64,AAAA');
          return canvas;
        }
        return nativeCreateElement(tagName);
      });

      expect(service.getPreferredPanelCropFormat()).toBe('webp');
    });

    it('falls back to jpeg when webp encoding is unavailable', () => {
      const nativeCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        if (tagName === 'canvas') {
          const canvas = nativeCreateElement('canvas');
          spyOn(canvas, 'toDataURL').and.returnValue('data:image/png;base64,AAAA');
          return canvas;
        }
        return nativeCreateElement(tagName);
      });

      expect(service.getPreferredPanelCropFormat()).toBe('jpeg');
    });

    it('falls back to jpeg when the canvas cannot encode data urls', () => {
      const nativeCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        if (tagName === 'canvas') {
          return nativeCreateElement('div');
        }
        return nativeCreateElement(tagName);
      });

      expect(service.getPreferredPanelCropFormat()).toBe('jpeg');
    });
  });

  describe('suggestPanelTypeFromBlob', () => {
    const imageBitmapTarget = window as Window & {createImageBitmap?: CreateImageBitmapForBlob};
    let previousCreateImageBitmap: typeof imageBitmapTarget.createImageBitmap;
    let createImageBitmapSpy: jasmine.Spy<CreateImageBitmapForBlob>;
    let drawImageSpy: jasmine.Spy<DrawImageForAnalysis>;
    let getImageDataSpy: jasmine.Spy<GetImageDataForAnalysis>;
    let closeSpy: jasmine.Spy;

    beforeEach(() => {
      closeSpy = jasmine.createSpy('close');
      previousCreateImageBitmap = imageBitmapTarget.createImageBitmap;
      const nativeCreateElement = document.createElement.bind(document);
      const canvas = nativeCreateElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        fail('Expected a 2D canvas context for panel analysis tests');
        return;
      }

      drawImageSpy = spyOn(context, 'drawImage');
      getImageDataSpy = spyOn(context, 'getImageData');
      spyOn(canvas, 'getContext').and.returnValue(context);
      createImageBitmapSpy = jasmine.createSpy<CreateImageBitmapForBlob>('createImageBitmap');
      imageBitmapTarget.createImageBitmap = createImageBitmapSpy;
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        if (tagName === 'canvas') {
          return canvas;
        }
        return nativeCreateElement(tagName);
      });
    });

    afterEach(() => {
      imageBitmapTarget.createImageBitmap = previousCreateImageBitmap;
    });

    it('suggests Light for bright desaturated panels', async () => {
      createImageBitmapSpy.and.resolveTo(makeImageBitmap(4, 4, closeSpy));
      getImageDataSpy.and.returnValue(
        makeImageData(new Uint8ClampedArray([
          240, 240, 240, 255, 245, 245, 245, 255, 235, 235, 235, 255, 238, 238, 238, 255
        ]))
      );

      await expectAsync(service.suggestPanelTypeFromBlob(new Blob(['x'], {type: 'image/jpeg'}))).toBeResolvedTo(1);
    });

    it('suggests Dark for dark desaturated panels', async () => {
      createImageBitmapSpy.and.resolveTo(makeImageBitmap(4, 4, closeSpy));
      getImageDataSpy.and.returnValue(
        makeImageData(new Uint8ClampedArray([
          20, 20, 20, 255, 32, 32, 32, 255, 40, 40, 40, 255, 28, 28, 28, 255
        ]))
      );

      await expectAsync(service.suggestPanelTypeFromBlob(new Blob(['x'], {type: 'image/jpeg'}))).toBeResolvedTo(2);
    });

    it('suggests Special edition for colorful panels', async () => {
      createImageBitmapSpy.and.resolveTo(makeImageBitmap(4, 4, closeSpy));
      getImageDataSpy.and.returnValue(
        makeImageData(new Uint8ClampedArray([
          255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 180, 0, 255
        ]))
      );

      await expectAsync(service.suggestPanelTypeFromBlob(new Blob(['x'], {type: 'image/jpeg'}))).toBeResolvedTo(3);
    });

    it('downsamples oversized images before reading pixels', async () => {
      createImageBitmapSpy.and.resolveTo(makeImageBitmap(1200, 600, closeSpy));
      getImageDataSpy.and.returnValue(makeImageData(new Uint8ClampedArray([240, 240, 240, 255])));

      await service.suggestPanelTypeFromBlob(new Blob(['x'], {type: 'image/jpeg'}));

      expect(drawImageSpy).toHaveBeenCalledWith(jasmine.anything(), 0, 0, 192, 96);
      expect(getImageDataSpy).toHaveBeenCalledWith(0, 0, 192, 96);
    });

    it('releases decoded image resources after analysis', async () => {
      createImageBitmapSpy.and.resolveTo(makeImageBitmap(4, 4, closeSpy));
      getImageDataSpy.and.returnValue(makeImageData(new Uint8ClampedArray([240, 240, 240, 255])));

      await service.suggestPanelTypeFromBlob(new Blob(['x'], {type: 'image/jpeg'}));

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('createFormCV', () => {
    it('uses empty string when name is undefined', () => {
      const result = service.createFormCV({}, null, null);
      expect(result.name.value).toBe('');
    });
    
    it('uses empty string for min and max when undefined', () => {
      const result = service.createFormCV({}, null, null);
      expect(result.a.value).toBe('');
      expect(result.b.value).toBe('');
    });
    
    it('controls are enabled for new CVs (id=0)', () => {
      const result = service.createFormCV({id: 0, isApproved: false}, null, null);
      expect(result.name.enabled).toBeTrue();
      expect(result.a.enabled).toBeTrue();
      expect(result.b.enabled).toBeTrue();
    });
    
    it('controls are disabled for approved stored CVs (id>0, isApproved=true)', () => {
      const result = service.createFormCV({id: 5, isApproved: true}, null, null);
      expect(result.name.disabled).toBeTrue();
      expect(result.a.disabled).toBeTrue();
      expect(result.b.disabled).toBeTrue();
    });
    
    it('controls remain enabled for unapproved stored CVs (id>0, isApproved=false)', () => {
      const result = service.createFormCV({id: 5, isApproved: false}, null, null);
      expect(result.name.enabled).toBeTrue();
      expect(result.a.enabled).toBeTrue();
      expect(result.b.enabled).toBeTrue();
    });
  });
  
  describe('formCVToCV', () => {
    it('maps FormCV array to CV array with correct field mapping', () => {
      const formCVs = [
        makeFormCV({
          id: 7,
          isApproved: true,
          name: new UntypedFormControl('Gate'),
          a: new UntypedFormControl(-5),
          b: new UntypedFormControl(5)
        })
      ];
      const result = service.formCVToCV(formCVs);
      expect(result).toEqual([{name: 'Gate', id: 7, min: -5, max: 5, isApproved: true}]);
    });

    it('maps empty voltage fields to undefined', () => {
      const formCVs = [
        makeFormCV({
          id: 0,
          isApproved: false,
          name: new UntypedFormControl('Unknown range'),
          a: new UntypedFormControl(''),
          b: new UntypedFormControl('')
        })
      ];

      const result = service.formCVToCV(formCVs);
      expect(result).toEqual([{name: 'Unknown range', id: 0, min: undefined, max: undefined, isApproved: false}]);
    });
  });
  
  describe('getPendingSaveState', () => {
    it('shouldSaveInsOuts is true when CV lists differ from module', () => {
      const module = makeDbModule({ins: [], outs: []});
      const formIns = [makeFormCV({id: 0, name: new UntypedFormControl('New In')})];
      
      const result = service.getPendingSaveState({
        module,
        formIns,
        formOuts: [],
        powerDirty: false,
        physicalDirty: false,
        panelFileCount: 0
      });
      
      expect(result.shouldSaveInsOuts).toBeTrue();
    });
    
    it('shouldSaveInsOuts is false when CV lists are identical to module', () => {
      const cv: CV = {id: 1, name: 'Pitch', min: 0, max: 10, isApproved: false};
      const module = makeDbModule({ins: [cv], outs: []});
      const formIns = [
        makeFormCV({
          id: 1,
          isApproved: false,
          name: new UntypedFormControl('Pitch'),
          a: new UntypedFormControl(0),
          b: new UntypedFormControl(10)
        })
      ];
      
      const result = service.getPendingSaveState({
        module,
        formIns,
        formOuts: [],
        powerDirty: false,
        physicalDirty: false,
        panelFileCount: 0
      });
      
      expect(result.shouldSaveInsOuts).toBeFalse();
    });
    
    it('hasPendingChanges is true when any shouldSave flag is true', () => {
      const module = makeDbModule();
      
      const result = service.getPendingSaveState({
        module,
        formIns: [],
        formOuts: [],
        powerDirty: true,
        physicalDirty: false,
        panelFileCount: 0
      });
      
      expect(result.hasPendingChanges).toBeTrue();
    });
    
    it('hasPendingChanges is false when no flags are set', () => {
      const cv: CV = {id: 1, name: 'CV', min: 0, max: 5, isApproved: false};
      const module = makeDbModule({ins: [cv], outs: []});
      const formIns = [
        makeFormCV({
          id: 1,
          isApproved: false,
          name: new UntypedFormControl('CV'),
          a: new UntypedFormControl(0),
          b: new UntypedFormControl(5)
        })
      ];
      
      const result = service.getPendingSaveState({
        module,
        formIns,
        formOuts: [],
        powerDirty: false,
        physicalDirty: false,
        panelFileCount: 0
      });
      
      expect(result.hasPendingChanges).toBeFalse();
    });
  });
  
  describe('buildPersistPlan', () => {
    function makePendingState(overrides: Partial<PendingSaveState> = {}): PendingSaveState {
      return {
        ins: [],
        outs: [],
        shouldSaveInsOuts: false,
        shouldSavePower: false,
        shouldSavePhysical: false,
        shouldSavePanel: false,
        hasPendingChanges: false,
        ...overrides
      };
    }
    
    function makeArgs(pendingState: PendingSaveState): BuildPersistPlanArgs {
      return {
        module: makeDbModule(),
        pendingState,
        powerPos12: 100,
        powerNeg12: 50,
        powerPos5: 20,
        weight: 200,
        depth: 30,
        panelFile: undefined,
        panelTypeValue: {name: 'light', value: 1},
        panelDescription: 'Test panel'
      };
    }
    
    it('includes module update operation when power is dirty', () => {
      const result = service.buildPersistPlan(makeArgs(makePendingState({shouldSavePower: true})));
      expect(result.operations.length).toBeGreaterThan(0);
      expect(mockBackend.update.module).toHaveBeenCalled();
    });
    
    it('includes module update operation when physical is dirty', () => {
      const result = service.buildPersistPlan(makeArgs(makePendingState({shouldSavePhysical: true})));
      expect(result.operations.length).toBeGreaterThan(0);
      expect(mockBackend.update.module).toHaveBeenCalled();
    });
    
    it('includes insOuts operation when CVs changed', () => {
      const result = service.buildPersistPlan(makeArgs(makePendingState({shouldSaveInsOuts: true})));
      expect(mockBackend.update.moduleINsOUTs).toHaveBeenCalled();
    });
    
    it('returns empty operations and savedSections when nothing changed', () => {
      const result = service.buildPersistPlan(makeArgs(makePendingState()));
      expect(result.operations.length).toBe(0);
      expect(result.savedSections.length).toBe(0);
    });
    
    it('savedSections labels match queued operations', () => {
      const result = service.buildPersistPlan(
        makeArgs(makePendingState({shouldSavePower: true, shouldSaveInsOuts: true}))
      );
      expect(result.savedSections).toContain('module specs');
      expect(result.savedSections).toContain('IN/OUT ports');
    });
  });
  
  describe('syncDataSnapshotAfterSave', () => {
    function makeParams(
      pendingOverrides: Partial<PendingSaveState> = {},
      paramOverrides: Partial<SyncDataSnapshotParams> = {}
    ): SyncDataSnapshotParams {
      return {
        module: makeDbModule(),
        pendingState: {
          ins: [],
          outs: [],
          shouldSaveInsOuts: false,
          shouldSavePower: false,
          shouldSavePhysical: false,
          shouldSavePanel: false,
          hasPendingChanges: false,
          ...pendingOverrides
        },
        powerPos12: 100,
        powerNeg12: 50,
        powerPos5: 20,
        weight: 200,
        depth: 30,
        ...paramOverrides
      };
    }
    
    it('merges power fields into module when shouldSavePower is true', () => {
      const params = makeParams({shouldSavePower: true});
      const result = service.syncDataSnapshotAfterSave(params);
      expect(result.powerPos12).toBe(100);
      expect(result.powerNeg12).toBe(50);
      expect(result.powerPos5).toBe(20);
    });
    
    it('merges physical fields when shouldSavePhysical is true', () => {
      const params = makeParams({shouldSavePhysical: true});
      const result = service.syncDataSnapshotAfterSave(params);
      expect(result.weight).toBe(200);
      expect(result.depth).toBe(30);
    });
    
    it('merges ins/outs when shouldSaveInsOuts is true', () => {
      const ins: CV[] = [{id: 1, name: 'Pitch', min: 0, max: 10, isApproved: false}];
      const outs: CV[] = [{id: 2, name: 'Gate', min: 0, max: 5, isApproved: false}];
      const params = makeParams({shouldSaveInsOuts: true, ins, outs});
      const result = service.syncDataSnapshotAfterSave(params);
      expect(result.ins).toEqual(ins);
      expect(result.outs).toEqual(outs);
    });
    
    it('does not overwrite module fields when no flags are set', () => {
      const module = makeDbModule({powerPos12: 42, depth: 99});
      const params = makeParams({}, {module});
      const result = service.syncDataSnapshotAfterSave(params);
      expect(result.powerPos12).toBe(42);
      expect(result.depth).toBe(99);
    });
  });
});
