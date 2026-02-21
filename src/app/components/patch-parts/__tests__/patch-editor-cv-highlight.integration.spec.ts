/**
 * Integration Test — First CV Click Highlight Bug
 *
 * FEATURE: Sub-feature 3 — integration test for first-click selection bug
 *
 * BUG DESCRIPTION:
 * When a user clicks a CV chip on a module that has zero existing instances in the
 * patch, the chip does NOT highlight (red for output, blue for input) on the first
 * click. Subsequent clicks work correctly.
 *
 * ROOT CAUSE:
 * ModuleCVItemComponent.ngOnInit() subscribes to selectedForConnection$ and captures
 * `this.instanceId` in the subscription closure. When `instanceId` is `undefined` at
 * init time (0-instance module), the subscription compares:
 *
 *   data.a.cv.instance_id == this.instanceId  →  501 == undefined  →  false
 *
 * After instance creation, Angular propagates the new `instanceId` input to the
 * component, but the old subscription closure still holds the stale `undefined`
 * value. The component is OnPush, so it won't re-check unless a new input reference
 * or an async pipe emission triggers a CD pass.
 *
 * WHAT THIS TEST DOES:
 * 1. Renders ModuleCVsComponent + ModuleCVItemComponent via TestBed.
 * 2. Starts with instanceId = undefined (0-instance module).
 * 3. Simulates a CV click; the mock ensureModuleInstance$ creates a new instance and
 *    fires patchModuleInstances$.next() BEFORE returning the new id.
 * 4. Calls fixture.detectChanges() to propagate the new instanceId input.
 * 5. Fires clickOnModuleCV$.next() with the new instance_id.
 * 6. Asserts that the CV chip IS highlighted.
 *
 * EXPECTED RESULT: Tests 1 & 2 FAIL because the highlight is missing (bug confirmed).
 * Test 3 PASSES (control: existing-instance module works correctly).
 * Once the bug is fixed (e.g., by re-subscribing on ngOnChanges), all tests pass.
 */

import {
  Component,
  Input,
  NO_ERRORS_SCHEMA
} from '@angular/core';
import {
  ComponentFixture,
  fakeAsync,
  TestBed,
  tick
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import {
  BehaviorSubject,
  of,
  Subject
} from 'rxjs';
import {
  scan,
  takeUntil
} from 'rxjs/operators';

import { ModuleCVsComponent } from '../../module-parts/module-cvs/module-cvs.component';
import { ModuleCVItemComponent } from '../../module-parts/module-cvitem/module-cvitem.component';
import { PatchDetailDataService } from '../patch-detail-data.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import {
  CV,
  CVConnectionEntity
} from 'src/app/models/cv';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { DbModule } from 'src/app/models/module';


// ─── Fake module data ────────────────────────────────────────────────────────

const FAKE_MODULE: DbModule = {
  id: 10,
  name: 'TestMod',
  outs: [{id: 7, name: 'Out1', min: -5, max: 5} as CV],
  ins: [{id: 42, name: 'In1'} as CV],
  panels: [],
  manufacturer: {id: 1, name: 'TestMaker'} as any
} as any;

const FAKE_INSTANCE: PatchModuleInstance = {
  id: 501,
  patch_id: 1,
  module_id: 10,
  instance_label: null
};


// ─── Minimal host component ───────────────────────────────────────────────────
/**
 * Host drives the same @Input bindings the real PatchEditorComponent passes down
 * to app-module-cvs:  [data]="card.module"  [instanceId]="card.instance?.id"
 */
@Component({
  template: `
    <app-module-cvs
      [data]="module"
      [instanceId]="instanceId"
    ></app-module-cvs>
  `,
  standalone: false
})
class TestHostComponent {
  @Input() module: DbModule = FAKE_MODULE;
  @Input() instanceId: number | undefined = undefined;
}


// ─── Mock PatchDetailDataService factory ─────────────────────────────────────

function buildMockPatchService() {
  const patchModuleInstances$ = new BehaviorSubject<PatchModuleInstance[]>([]);
  const selectedForConnection$ = new BehaviorSubject<{
    a: CVConnectionEntity | null;
    b: CVConnectionEntity | null
  }>({a: null, b: null});
  const clickOnModuleCV$ = new Subject<CVConnectionEntity>();
  const patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(true);
  const editorConnections$ = new BehaviorSubject<PatchConnection[] | null>(null);
  const destroy$ = new Subject<void>();
  
  // Mirror the real service's scan on clickOnModuleCV$ — keeps the test honest
  clickOnModuleCV$
    .pipe(
      scan(
        (
          state: {
            a: CVConnectionEntity | null;
            b: CVConnectionEntity | null
          },
          entity: CVConnectionEntity
        ) => {
          if (entity.kind === 'out') return {a: entity, b: state.b};
          return {a: state.a, b: entity};
        },
        {a: null, b: null} as {
          a: CVConnectionEntity | null;
          b: CVConnectionEntity | null
        }
      ),
      takeUntil(destroy$)
    )
    .subscribe(state => selectedForConnection$.next(state));
  
  return {
    patchModuleInstances$,
    selectedForConnection$,
    clickOnModuleCV$,
    patchEditingPanelOpenState$,
    editorConnections$,
    destroy$,
    
    /**
     * Simulates the real ensureModuleInstance$ sequence:
     *  1. Push instance into patchModuleInstances$ — this is step A in the real service
     *     (triggers Angular CD in the real app, which can recreate/update cvitem components).
     *  2. Return the new instance id as an observable.
     *
     * The critical race: in the real ModuleCVsComponent the flow is:
     *   ensureModuleInstance$(...).pipe(tap(id => clickOnModuleCV$.next(...)))
     * Because patchModuleInstances$.next() fires BEFORE of(id) completes, Angular can
     * run CD (updating instanceId on the cvitem) BEFORE clickOnModuleCV$.next() fires.
     * But the cvitem's subscription closure still has the old instanceId=undefined.
     */
    ensureModuleInstance$: (module: any) => {
      const existing = patchModuleInstances$.value.find((i: any) => i.module_id === module.id);
      if (existing) return of(existing.id);
      // Step A: update instances list (triggers CD in real app)
      patchModuleInstances$.next([...patchModuleInstances$.value, FAKE_INSTANCE]);
      // Step B: return new id (triggers tap → clickOnModuleCV$.next in caller)
      return of(FAKE_INSTANCE.id);
    }
  };
}

type MockPatchService = ReturnType<typeof buildMockPatchService>;


// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Integration — ModuleCVsComponent first CV click on 0-instance module', () => {
  
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let mockService: MockPatchService;
  
  beforeEach(async () => {
    mockService = buildMockPatchService();
    
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        NoopAnimationsModule,
        MatTooltipModule,
        MatIconModule,
        MatChipsModule
      ],
      declarations: [
        TestHostComponent,
        ModuleCVsComponent,
        ModuleCVItemComponent
      ],
      providers: [
        {provide: PatchDetailDataService, useValue: mockService},
        {provide: AppStateService, useValue: {}}
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();
    
    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });
  
  afterEach(() => {
    mockService.destroy$.next();
    mockService.destroy$.complete();
  });
  
  
  // ─── Helpers ─────────────────────────────────────────────────────────────
  
  function getCVItemComponents(): ModuleCVItemComponent[] {
    return fixture.debugElement
      .queryAll(de => de.componentInstance instanceof ModuleCVItemComponent)
      .map(de => de.componentInstance as ModuleCVItemComponent);
  }
  
  function getOutCVItemComponent(): ModuleCVItemComponent | undefined {
    return getCVItemComponents().find(c => c.kind === 'out');
  }
  
  function getInCVItemComponent(): ModuleCVItemComponent | undefined {
    return getCVItemComponents().find(c => c.kind === 'in');
  }
  
  
  // ─── Test 1: OUT CV on first click ───────────────────────────────────────
  
  /**
   * BUG DEMONSTRATION TEST — Expected to FAIL with current code.
   *
   * Sequence:
   *   1. outClick$.emit([cv, module])
   *   2. ensureModuleInstance$ fires patchModuleInstances$.next() → of(501)
   *   3. tap in ModuleCVsComponent fires clickOnModuleCV$.next({cv:{...,instance_id:501}, kind:'out'})
   *   4. selectedForConnection$ → {a: {cv:{id:7,instance_id:501,...}, kind:'out'}, b:null}
   *   5. host.instanceId=501, detectChanges() → Angular passes instanceId=501 to ModuleCVItemComponent
   *   6. BUT: ModuleCVItemComponent.ngOnInit() already ran with instanceId=undefined
   *           The closure checks: data.a.cv.instance_id == this.instanceId → 501==undefined → false
   *   7. highlightedTo.value === false  ← BUG
   */
  it('(BUG) OUT CV chip must be highlighted on first click — FAILS with current code', fakeAsync(() => {
    // Pre-condition: no instances exist
    expect(mockService.patchModuleInstances$.value.length)
      .withContext('Precondition: module has 0 instances').toBe(0);
    
    // Locate the ModuleCVsComponent
    const cvsDE = fixture.debugElement
      .query(de => de.componentInstance instanceof ModuleCVsComponent);
    expect(cvsDE).withContext('ModuleCVsComponent must be in DOM').toBeTruthy();
    const cvsComp = cvsDE.componentInstance as ModuleCVsComponent;
    expect(cvsComp.instanceId).withContext('instanceId must be undefined at start').toBeUndefined();
    
    // Step 1: simulate click on the OUT CV chip
    cvsComp.outClick$.emit([FAKE_MODULE.outs[0], FAKE_MODULE]);
    // At this point:
    //   - ensureModuleInstance$ fired patchModuleInstances$.next([FAKE_INSTANCE])
    //   - clickOnModuleCV$.next({cv:{id:7,instance_id:501,...}, kind:'out'}) was fired
    //   - selectedForConnection$ is {a:{cv:{id:7,instance_id:501,...},kind:'out'}, b:null}
    
    // Step 2: simulate Angular CD propagating updated instanceId from the parent
    // (real app: editorCards$ rebuilds → card.instance?.id=501 → @Input changes on cvitem)
    host.instanceId = FAKE_INSTANCE.id;
    fixture.detectChanges();
    tick();
    
    // Locate the OUT cvitem
    const outItem = getOutCVItemComponent();
    expect(outItem).withContext('OUT ModuleCVItemComponent must be in DOM').toBeTruthy();
    
    // THE FAILING ASSERTION:
    // highlightedTo should be true but is false because the subscription closure
    // still has instanceId=undefined from when ngOnInit() ran.
    expect(outItem!.highlightedTo.value).withContext(
      'BUG: OUT CV highlightedTo must be true — subscription closure has stale instanceId=undefined'
    ).toBeTrue();
    
    // Also verify the DOM element reflects the highlight via the 'b' CSS class
    // (module-cvitem.component.html: [ngClass]="{'b': highlightedTo | async}")
    const outEl = fixture.debugElement
      .queryAll(de => de.nativeElement?.classList?.contains?.('item-cvitem')
        && de.nativeElement?.classList?.contains?.('out'))
      .pop();
    if (outEl) {
      expect(outEl.nativeElement.classList.contains('b')).withContext(
        'BUG: OUT chip DOM element must have CSS class "b" when highlighted'
      ).toBeTrue();
    }
  }));
  
  
  // ─── Test 2: IN CV on first click ────────────────────────────────────────
  
  /**
   * BUG DEMONSTRATION TEST — Expected to FAIL with current code.
   */
  it('(BUG) IN CV chip must be highlighted on first click — FAILS with current code', fakeAsync(() => {
    expect(mockService.patchModuleInstances$.value.length)
      .withContext('Precondition: module has 0 instances').toBe(0);
    
    const cvsDE = fixture.debugElement
      .query(de => de.componentInstance instanceof ModuleCVsComponent);
    const cvsComp = cvsDE.componentInstance as ModuleCVsComponent;
    
    // Simulate click on IN CV chip
    cvsComp.inClick$.emit([FAKE_MODULE.ins[0], FAKE_MODULE]);
    
    host.instanceId = FAKE_INSTANCE.id;
    fixture.detectChanges();
    tick();
    
    const inItem = getInCVItemComponent();
    expect(inItem).withContext('IN ModuleCVItemComponent must be in DOM').toBeTruthy();
    
    // THE FAILING ASSERTION:
    expect(inItem!.highlightedFrom.value).withContext(
      'BUG: IN CV highlightedFrom must be true — subscription closure has stale instanceId=undefined'
    ).toBeTrue();
  }));
  
  
  // ─── Test 3: Control — existing instance works correctly ─────────────────
  
  /**
   * CONTROL TEST — Expected to PASS with current code.
   *
   * When the module already has an instance (instanceId is set at component init),
   * the subscription closure captures the correct instanceId and highlights work.
   * This test confirms the bug is specific to the 0-instance case.
   *
   * Uses a separate fixture with instanceId already set so ngOnInit sees the real id.
   */
  it('(CONTROL) OUT CV chip IS highlighted when module already has an instance', fakeAsync(() => {
    // Create a separate fixture where instanceId is set BEFORE the first detectChanges
    // so that ngOnInit captures the real instanceId=501 in its closure.
    mockService.patchModuleInstances$.next([FAKE_INSTANCE]);
    
    const controlFixture = TestBed.createComponent(TestHostComponent);
    const controlHost = controlFixture.componentInstance;
    controlHost.instanceId = FAKE_INSTANCE.id; // set before first detectChanges
    controlFixture.detectChanges();             // ngOnInit runs with instanceId=501
    
    const cvsDE = controlFixture.debugElement
      .query(de => de.componentInstance instanceof ModuleCVsComponent);
    const cvsComp = cvsDE.componentInstance as ModuleCVsComponent;
    expect(cvsComp.instanceId)
      .withContext('instanceId must be set (existing instance)').toBe(FAKE_INSTANCE.id);
    
    // Simulate click — ensureModuleInstance$ returns immediately (instance exists)
    cvsComp.outClick$.emit([FAKE_MODULE.outs[0], FAKE_MODULE]);
    tick();
    controlFixture.detectChanges();
    
    const outItems = controlFixture.debugElement
      .queryAll(de => de.componentInstance instanceof ModuleCVItemComponent)
      .map(de => de.componentInstance as ModuleCVItemComponent)
      .filter(c => c.kind === 'out');
    const outItem = outItems[0];
    expect(outItem).withContext('OUT ModuleCVItemComponent must be in DOM').toBeTruthy();
    
    // This PASSES: ngOnInit captured the correct instanceId=501
    expect(outItem!.highlightedTo.value).withContext(
      'CONTROL: OUT CV must be highlighted — instanceId was set correctly at init'
    ).toBeTrue();
  }));
});