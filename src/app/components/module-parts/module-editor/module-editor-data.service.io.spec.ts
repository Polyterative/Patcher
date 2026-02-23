import {
  BehaviorSubject,
  of
} from 'rxjs';
import {
  UntypedFormControl,
  UntypedFormGroup
} from '@angular/forms';
import { ModuleEditorDataService } from './module-editor-data.service';


describe('ModuleEditorDataService I/O branches', () => {
  let service: ModuleEditorDataService;
  let backend: any;
  
  beforeEach(() => {
    backend = {
      update: {
        module: jasmine.createSpy('update.module').and.returnValue(of({})),
        moduleINsOUTs: jasmine.createSpy('update.moduleINsOUTs').and.returnValue(of({}))
      },
      storage: {
        uploadModulePanel: jasmine.createSpy('storage.uploadModulePanel').and.returnValue(of('panel-db.jpg'))
      },
      add: {
        panel: jasmine.createSpy('add.panel').and.returnValue(of({}))
      }
    };
    service = new ModuleEditorDataService(backend as any);
  });
  
  it('rebuilds CV controls and publishes container value', () => {
    const group = new UntypedFormGroup({
      old: new UntypedFormControl('old')
    });
    const subject = new BehaviorSubject<any[]>([]);
    const cvs = [
      {
        id: 0,
        isApproved: false,
        name: new UntypedFormControl('A'),
        a: new UntypedFormControl(0),
        b: new UntypedFormControl(5)
      },
      {
        id: 1,
        isApproved: true,
        name: new UntypedFormControl('Locked'),
        a: new UntypedFormControl(1),
        b: new UntypedFormControl(2)
      }
    ];
    
    service.updateFormGroupAndContainer(cvs as any, group, subject as any);
    
    expect(group.contains('old')).toBeFalse();
    expect(group.contains('name0')).toBeTrue();
    expect(group.contains('a0')).toBeTrue();
    expect(group.contains('b0')).toBeTrue();
    expect(group.contains('name1')).toBeFalse();
    expect(subject.value).toEqual(cvs as any);
  });
  
  it('touchModule$ delegates to backend update.module', () => {
    service.touchModule$(321).subscribe();
    expect(backend.update.module).toHaveBeenCalledWith({id: 321});
  });
  
  it('creates and executes panel-save operation when panel file exists', (done) => {
    const file = {
      name: 'frontpanel',
      type: 'image/png',
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(4))
    } as any as File;
    
    const result = service.buildPersistPlan({
      module: {
        id: 7,
        name: 'My Module',
        manufacturer: {name: 'Acme Co'},
        standard: {name: '3U'}
      } as any,
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
        expect(backend.storage.uploadModulePanel).toHaveBeenCalled();
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
      module: {
        id: 7,
        name: 'My Module',
        manufacturer: {name: 'Acme Co'},
        standard: {name: '3U'}
      } as any,
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
});