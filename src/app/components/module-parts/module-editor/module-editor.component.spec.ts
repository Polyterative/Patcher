import {
  UntypedFormBuilder,
  UntypedFormControl,
  Validators
} from '@angular/forms';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { FormCV } from './module-editor-data.service';
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

  return {component, moduleEditorDataService, fileDragHostService};
}

function makeDraftCv(partial: Partial<FormCV> = {}): FormCV {
  return {
    id: partial.id ?? 0,
    isApproved: partial.isApproved ?? false,
    name: partial.name ?? new UntypedFormControl('', Validators.required),
    a: partial.a ?? new UntypedFormControl(0, [Validators.min(-12), Validators.max(12)]),
    b: partial.b ?? new UntypedFormControl(5, [Validators.min(-12), Validators.max(12)])
  };
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

describe('ModuleEditorComponent validation messaging', () => {
  it('pinpoints the invalid power rail in the save reason', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.powerRailNegative.control.setValue(-1);
    component.formGroupPower.markAsDirty();

    expect(component.saveFabDisabledReason).toBe('Fix -12V Rail Current (mA)');
  });

  it('pinpoints the invalid physical field in the save reason', () => {
    const {component, moduleEditorDataService} = makeComponent();
    moduleEditorDataService.getPendingSaveState.and.callFake(({powerDirty, physicalDirty}: any) => ({
      ins: [],
      outs: [],
      shouldSaveInsOuts: false,
      shouldSavePower: powerDirty,
      shouldSavePhysical: physicalDirty,
      shouldSavePanel: false,
      hasPendingChanges: powerDirty || physicalDirty
    }));
    component.ngOnInit();

    component.depth.control.setValue(-1);
    component.formGroupPhysical.markAsDirty();

    expect(component.saveFabDisabledReason).toBe('Fix Depth (mm)');
  });

  it('reports duplicate panel type explicitly', () => {
    const {component, moduleEditorDataService, fileDragHostService} = makeComponent();
    moduleEditorDataService.getPendingSaveState.and.returnValue({
      ins: [],
      outs: [],
      shouldSaveInsOuts: false,
      shouldSavePower: false,
      shouldSavePhysical: false,
      shouldSavePanel: true,
      hasPendingChanges: true
    });
    component.ngOnInit();

    fileDragHostService.files$.next([{} as File]);
    component.panelTypeAlreadyExists$.next(true);
    component.duplicatePanelTypeName$.next('Light');

    expect(component.saveFabDisabledReason).toBe('Duplicate panel type: Light');
  });

  it('pinpoints the invalid port row and field', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.INs$.next([
      makeDraftCv({
        name: new UntypedFormControl('', Validators.required)
      })
    ]);
    component.formGroupA.addControl('name0', component.INs$.value[0].name);

    const feedback = (component as any).getValidationFeedback({
      ins: [],
      outs: [],
      shouldSaveInsOuts: true,
      shouldSavePower: false,
      shouldSavePhysical: false,
      shouldSavePanel: false,
      hasPendingChanges: true
    });

    expect(feedback.disabledReason).toBe('Fix Input 1 name');
    expect(feedback.errorMessage).toBe('Port fields need attention: Input 1 name.');
  });

  it('lists multiple invalid power rails together', () => {
    const {component} = makeComponent();
    component.ngOnInit();

    component.powerRailPositive.control.setValue(-1);
    component.powerRailNegative.control.setValue(-2);
    component.formGroupPower.markAsDirty();

    expect(component.saveFabDisabledReason).toBe('Fix +12V Rail Current (mA), -12V Rail Current (mA)');
  });
});
