import { UntypedFormControl } from '@angular/forms';
import { of } from 'rxjs';
import { CV } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import {
  FormCV,
  ModuleEditorDataService
} from './module-editor-data.service';


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
  } as DbModule;
}

describe('ModuleEditorDataService', () => {
  let service: ModuleEditorDataService;
  let mockBackend: any;
  
  beforeEach(() => {
    mockBackend = {
      update: {
        module: jasmine.createSpy().and.returnValue(of(null)),
        moduleINsOUTs: jasmine.createSpy().and.returnValue(of(null))
      },
      storage: {uploadModulePanel: jasmine.createSpy().and.returnValue(of('file.jpg'))},
      add: {panel: jasmine.createSpy().and.returnValue(of(null))}
    };
    service = new ModuleEditorDataService(mockBackend as any);
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
    it('creates a jpg file for the cropped panel output', () => {
      const sourceFile = new File(['source'], 'front-panel.jpeg', {type: 'image/jpeg'});
      const croppedBlob = new Blob(['cropped'], {type: 'image/jpeg'});

      const result = service.buildCroppedPanelFile(sourceFile, croppedBlob);

      expect(result.name).toBe('front-panel-cropped.jpg');
      expect(result.type).toBe('image/jpeg');
      expect(result.size).toBe(croppedBlob.size);
    });

    it('falls back to the source file extension when the blob type is missing', () => {
      const sourceFile = new File(['source'], 'front-panel.png', {type: 'image/png'});
      const croppedBlob = new Blob(['cropped']);

      const result = service.buildCroppedPanelFile(sourceFile, croppedBlob);

      expect(result.name).toBe('front-panel-cropped.png');
      expect(result.type).toBe('image/png');
    });
  });

  describe('suggestPanelTypeFromBlob', () => {
    const imageBitmapTarget = window as Window & {createImageBitmap?: (blob: Blob) => Promise<unknown>};
    let previousCreateImageBitmap: typeof imageBitmapTarget.createImageBitmap;
    let createImageBitmapSpy: jasmine.Spy;
    let drawImageSpy: jasmine.Spy;
    let getImageDataSpy: jasmine.Spy;
    let closeSpy: jasmine.Spy;

    beforeEach(() => {
      drawImageSpy = jasmine.createSpy('drawImage');
      getImageDataSpy = jasmine.createSpy('getImageData');
      closeSpy = jasmine.createSpy('close');
      previousCreateImageBitmap = imageBitmapTarget.createImageBitmap;
      createImageBitmapSpy = jasmine.createSpy('createImageBitmap');
      imageBitmapTarget.createImageBitmap = createImageBitmapSpy as any;
      const nativeCreateElement = document.createElement.bind(document);
      spyOn(document, 'createElement').and.callFake((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({
              drawImage: drawImageSpy,
              getImageData: getImageDataSpy
            })
          } as any;
        }
        return nativeCreateElement(tagName);
      });
    });

    afterEach(() => {
      imageBitmapTarget.createImageBitmap = previousCreateImageBitmap;
    });

    it('suggests Light for bright desaturated panels', async () => {
      createImageBitmapSpy.and.resolveTo({width: 4, height: 4, close: closeSpy} as any);
      getImageDataSpy.and.returnValue({
        data: new Uint8ClampedArray([
          240, 240, 240, 255, 245, 245, 245, 255, 235, 235, 235, 255, 238, 238, 238, 255
        ])
      });

      await expectAsync(service.suggestPanelTypeFromBlob(new Blob(['x'], {type: 'image/jpeg'}))).toBeResolvedTo(1);
    });

    it('suggests Dark for dark desaturated panels', async () => {
      createImageBitmapSpy.and.resolveTo({width: 4, height: 4, close: closeSpy} as any);
      getImageDataSpy.and.returnValue({
        data: new Uint8ClampedArray([
          20, 20, 20, 255, 32, 32, 32, 255, 40, 40, 40, 255, 28, 28, 28, 255
        ])
      });

      await expectAsync(service.suggestPanelTypeFromBlob(new Blob(['x'], {type: 'image/jpeg'}))).toBeResolvedTo(2);
    });

    it('suggests Special edition for colorful panels', async () => {
      createImageBitmapSpy.and.resolveTo({width: 4, height: 4, close: closeSpy} as any);
      getImageDataSpy.and.returnValue({
        data: new Uint8ClampedArray([
          255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 180, 0, 255
        ])
      });

      await expectAsync(service.suggestPanelTypeFromBlob(new Blob(['x'], {type: 'image/jpeg'}))).toBeResolvedTo(3);
    });

    it('downsamples oversized images before reading pixels', async () => {
      createImageBitmapSpy.and.resolveTo({width: 1200, height: 600, close: closeSpy} as any);
      getImageDataSpy.and.returnValue({
        data: new Uint8ClampedArray([240, 240, 240, 255])
      });

      await service.suggestPanelTypeFromBlob(new Blob(['x'], {type: 'image/jpeg'}));

      expect(drawImageSpy).toHaveBeenCalledWith(jasmine.anything(), 0, 0, 192, 96);
      expect(getImageDataSpy).toHaveBeenCalledWith(0, 0, 192, 96);
    });
  });
  
  describe('createFormCV', () => {
    it('uses empty string when name is undefined', () => {
      const result = service.createFormCV({}, null, null);
      expect(result.name.value).toBe('');
    });
    
    it('uses 0 for min and max when undefined', () => {
      const result = service.createFormCV({}, null, null);
      expect(result.a.value).toBe(0);
      expect(result.b.value).toBe(0);
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
    function makePendingState(overrides: any = {}): any {
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
    
    function makeArgs(pendingState: any): any {
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
    function makeParams(pendingOverrides: any = {}, paramOverrides: any = {}): any {
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
