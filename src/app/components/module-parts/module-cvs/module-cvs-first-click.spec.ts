import { BehaviorSubject, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModuleCVsComponent } from './module-cvs.component';
import { ModuleCVItemComponent } from '../module-cvitem/module-cvitem.component';
import { CV, CVConnectionEntity } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import { PatchConnection, PatchModuleInstance } from 'src/app/models/connection';

/**
 * Integration-style test: first CV click on a 0-instance module.
 *
 * Reproduces the real bug: user clicks a CV chip, the backend creates an instance,
 * patchModuleInstances$ fires (which in real life triggers Angular CD that recreates
 * child cvitem components), and THEN the click signal fires. A cvitem component
 * that subscribes to selectedForConnection$ between those two events must still
 * end up highlighted.
 */
describe('ModuleCVsComponent — first click on 0-instance module', () => {

  const fakeModule: DbModule = {
    id: 10, name: 'TestMod', ins: [{id: 42, name: 'In1'} as CV], outs: [{id: 7, name: 'Out1'} as CV]
  } as any;

  let patchModuleInstances$: BehaviorSubject<PatchModuleInstance[]>;
  let selectedForConnection$: BehaviorSubject<{ a: CVConnectionEntity | null; b: CVConnectionEntity | null }>;
  let clickOnModuleCV$: Subject<CVConnectionEntity>;
  let patchEditingPanelOpenState$: BehaviorSubject<boolean>;
  let singlePatchData$: BehaviorSubject<any>;
  let editorConnections$: BehaviorSubject<PatchConnection[] | null>;

  /** Minimal mock that has just enough of PatchDetailDataService */
  let mockService: any;

  /** Track cvitem components created during the test */
  let lateCreatedCvItem: ModuleCVItemComponent | null;
  let destroy$: Subject<void>;

  beforeEach(() => {
    patchModuleInstances$ = new BehaviorSubject<PatchModuleInstance[]>([]);
    selectedForConnection$ = new BehaviorSubject<{ a: CVConnectionEntity | null; b: CVConnectionEntity | null }>({a: null, b: null});
    clickOnModuleCV$ = new Subject<CVConnectionEntity>();
    patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(true);
    singlePatchData$ = new BehaviorSubject<any>({id: 1, name: 'TestPatch'});
    editorConnections$ = new BehaviorSubject<PatchConnection[] | null>(null);
    destroy$ = new Subject<void>();
    lateCreatedCvItem = null;

    // Wire up the scan (same logic as the real service) so clickOnModuleCV$ feeds selectedForConnection$
    clickOnModuleCV$
      .pipe(takeUntil(destroy$))
      .subscribe(entity => {
        const state = selectedForConnection$.value;
        if (entity.kind === 'out') {
          selectedForConnection$.next({a: entity, b: state.b});
        } else {
          selectedForConnection$.next({a: state.a, b: entity});
        }
      });

    mockService = {
      patchModuleInstances$,
      selectedForConnection$,
      clickOnModuleCV$,
      patchEditingPanelOpenState$,
      singlePatchData$,
      editorConnections$,
      // ensureModuleInstance$: simulates the real one — calls patchModuleInstances$.next()
      // inside the map (before returning), exactly like the real service.
      ensureModuleInstance$: (module: any) => {
        const existing = patchModuleInstances$.value.find((i: any) => i.module_id === module.id);
        if (existing) return of(existing.id);

        // Simulate the backend returning a new instance
        const newInstance: PatchModuleInstance = {id: 501, module_id: module.id} as any;
        // THIS is the critical line: state update fires BEFORE the observable completes.
        // In real life this triggers Angular CD which can recreate cvitem components.
        patchModuleInstances$.next([...patchModuleInstances$.value, newInstance]);

        // --- Simulate Angular CD effect ---
        // When patchModuleInstances$ fires, the editor rebuilds cards, Angular
        // destroys old cvitem components and creates new ones. The new cvitem
        // subscribes to selectedForConnection$ and gets {a:null, b:null} (stale).
        // We simulate this by creating a new ModuleCVItemComponent RIGHT HERE,
        // between patchModuleInstances$.next() and the return of instance.id
        // (which will then cause clickOnModuleCV$.next in the caller's tap).
        lateCreatedCvItem = new ModuleCVItemComponent({} as any, mockService);
        (lateCreatedCvItem as any).data = fakeModule.outs[0]; // cv id=7
        (lateCreatedCvItem as any).kind = 'out';
        lateCreatedCvItem.instanceId = 501; // Angular propagated the new instanceId
        lateCreatedCvItem.ngOnInit();

        return of(newInstance.id);
      }
    };
  });

  afterEach(() => {
    destroy$.next();
    destroy$.complete();
  });

  it('should have the out CV highlighted after the first click resolves', () => {
    // Create the ModuleCVsComponent (0-instance module, instanceId=undefined)
    const cvs = new ModuleCVsComponent(mockService, {open: jasmine.createSpy('open')} as any);
    (cvs as any).data = fakeModule;
    cvs.instanceId = undefined;
    cvs.ngOnInit();

    // Simulate user clicking the OUT cv chip
    cvs.outClick$.next([fakeModule.outs[0], fakeModule]);

    // After the whole chain: ensureModuleInstance$ resolved, clickOnModuleCV$ fired,
    // selectedForConnection$ was updated. The lateCreatedCvItem (simulating the
    // component Angular recreated mid-chain) should be highlighted.
    expect(lateCreatedCvItem).toBeTruthy();
    expect(lateCreatedCvItem!.highlightedTo.value).withContext(
      'The CV chip recreated during instance creation must still be highlighted'
    ).toBeTrue();
  });

  it('should have the in CV highlighted after the first click resolves', () => {
    // Adjust mock to create an IN cvitem instead
    mockService.ensureModuleInstance$ = (module: any) => {
      const existing = patchModuleInstances$.value.find((i: any) => i.module_id === module.id);
      if (existing) return of(existing.id);

      const newInstance: PatchModuleInstance = {id: 501, module_id: module.id} as any;
      patchModuleInstances$.next([...patchModuleInstances$.value, newInstance]);

      lateCreatedCvItem = new ModuleCVItemComponent({} as any, mockService);
      (lateCreatedCvItem as any).data = fakeModule.ins[0]; // cv id=42
      (lateCreatedCvItem as any).kind = 'in';
      lateCreatedCvItem.instanceId = 501;
      lateCreatedCvItem.ngOnInit();

      return of(newInstance.id);
    };

    const cvs = new ModuleCVsComponent(mockService, {open: jasmine.createSpy('open')} as any);
    (cvs as any).data = fakeModule;
    cvs.instanceId = undefined;
    cvs.ngOnInit();

    // Simulate user clicking the IN cv chip
    cvs.inClick$.next([fakeModule.ins[0], fakeModule]);

    expect(lateCreatedCvItem).toBeTruthy();
    expect(lateCreatedCvItem!.highlightedFrom.value).withContext(
      'The CV chip recreated during instance creation must still be highlighted'
    ).toBeTrue();
  });
});
