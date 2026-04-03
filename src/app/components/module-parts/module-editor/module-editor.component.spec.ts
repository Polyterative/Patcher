import { UntypedFormBuilder } from '@angular/forms';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ModuleEditorComponent } from './module-editor.component';

function makeComponent() {
  const dataService = {
    moduleEditorHasPendingChanges$: new BehaviorSubject<boolean>(false),
    updateSingleModuleData$: new Subject<number>()
  };
  const fileDragHostService = {
    files$: new BehaviorSubject<File[]>([]),
    removeAllFiles$: {emit: jasmine.createSpy('removeAllFiles.emit')}
  };
  const moduleEditorDataService = {
    buildCvSummary: jasmine.createSpy('buildCvSummary').and.returnValue({total: 0, editable: 0, locked: 0}),
    createFormCV: jasmine.createSpy('createFormCV'),
    updateFormGroupAndContainer: jasmine.createSpy('updateFormGroupAndContainer'),
    buildPersistPlan: jasmine.createSpy('buildPersistPlan').and.returnValue({operations: [], savedSections: []}),
    touchModule$: jasmine.createSpy('touchModule$').and.returnValue(of(null)),
    syncDataSnapshotAfterSave: jasmine.createSpy('syncDataSnapshotAfterSave'),
    getPendingSaveState: jasmine.createSpy('getPendingSaveState').and.callFake(({powerDirty}: any) => ({
      ins: [],
      outs: [],
      shouldSaveInsOuts: false,
      shouldSavePower: powerDirty,
      shouldSavePhysical: false,
      shouldSavePanel: false,
      hasPendingChanges: powerDirty
    }))
  };

  const component = new ModuleEditorComponent(
    new UntypedFormBuilder(),
    dataService as any,
    {open: jasmine.createSpy('open')} as any,
    fileDragHostService as any,
    moduleEditorDataService as any
  );

  component.data = {
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
    powerPos12: null,
    powerNeg12: null,
    powerPos5: null,
    depth: null,
    weight: null,
    public: true,
    manufacturer: {id: 1, name: 'Test Manufacturer'},
    manufacturerId: 1,
    standard: {id: 1, name: '3U'},
    tags: [],
    panels: [],
    description: '',
    created: '',
    updated: ''
  } as any;

  return {component};
}

describe('ModuleEditorComponent power autofill', () => {
  it('fills blank sibling rails with zero after the user enters one rail', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.powerRailPositive.control.setValue(120);

    expect(component.powerRailPositive.control.value).toBe(120);
    expect(component.powerRailNegative.control.value).toBe(0);
    expect(component.powerRailFiveVolts.control.value).toBe(0);
  });

  it('does not override sibling rails that already have values', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.powerRailNegative.control.setValue(35);
    component.powerRailPositive.control.setValue(120);

    expect(component.powerRailPositive.control.value).toBe(120);
    expect(component.powerRailNegative.control.value).toBe(35);
    expect(component.powerRailFiveVolts.control.value).toBe(0);
  });

  it('does not auto-fill during initial data hydration', () => {
    const {component} = makeComponent();
    component.data = {
      ...component.data,
      powerPos12: 80,
      powerNeg12: null,
      powerPos5: null
    };

    component.ngOnInit();

    expect(component.powerRailPositive.control.value).toBe(80);
    expect(component.powerRailNegative.control.value).toBe('');
    expect(component.powerRailFiveVolts.control.value).toBe('');
  });
});
