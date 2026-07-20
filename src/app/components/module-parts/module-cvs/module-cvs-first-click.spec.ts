import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ModuleCVsComponent } from './module-cvs.component';
import { ModuleCVItemComponent } from '../module-cvitem/module-cvitem.component';
import { CV, CVConnectionEntity } from 'src/app/models/cv';
import { DbModule, MinimalModule } from 'src/app/models/module';
import { PatchConnection, PatchModuleInstance } from 'src/app/models/connection';
import { PatchDetailDataService } from '../../patch-parts/patch-detail-data.service';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { CVConnectionState, EMPTY_CV_CONNECTION_STATE } from '../../patch-parts/patch-detail-data.models';
import { dbModuleFixture, patchFixture } from '../../patch-parts/patch-graph/patch-graph-test-fixtures';

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

  const TEST_PATCH_ID = 1;
  const TEST_INSTANCE_ID = 501;
  const inCv: CV = {id: 42, name: 'In1'};
  const outCv: CV = {id: 7, name: 'Out1'};
  const fakeModule: DbModule = dbModuleFixture(10, 'TestMod', [inCv], [outCv]);

  type ModuleCvPatchServiceDouble = Pick<PatchDetailDataService,
    | 'patchModuleInstances$'
    | 'selectedForConnection$'
    | 'clickOnModuleCV$'
    | 'patchEditingPanelOpenState$'
    | 'singlePatchData$'
    | 'editorConnections$'
    | 'ensureModuleInstance$'
  >;

  let patchModuleInstances$: BehaviorSubject<PatchModuleInstance[]>;
  let selectedForConnection$: BehaviorSubject<CVConnectionState>;
  let clickOnModuleCV$: Subject<CVConnectionEntity>;
  let patchEditingPanelOpenState$: BehaviorSubject<boolean>;
  let editorConnections$: BehaviorSubject<PatchConnection[] | null>;

  let mockService: ModuleCvPatchServiceDouble;
  let appState: jasmine.SpyObj<AppStateService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  /** Track cvitem components created during the test */
  let lateCreatedCvItem: ModuleCVItemComponent | null;
  let destroy$: Subject<void>;

  function buildPatchModuleInstance(moduleId: number): PatchModuleInstance {
    return {
      id: TEST_INSTANCE_ID,
      patch_id: TEST_PATCH_ID,
      module_id: moduleId,
      instance_label: null
    };
  }

  function patchServiceDouble(): PatchDetailDataService {
    return mockService as PatchDetailDataService;
  }

  function createLateCvItem(kind: 'in' | 'out', cv: CV): void {
    lateCreatedCvItem = new ModuleCVItemComponent(appState, patchServiceDouble());
    lateCreatedCvItem.data = cv;
    lateCreatedCvItem.kind = kind;
    lateCreatedCvItem.instanceId = TEST_INSTANCE_ID;
    lateCreatedCvItem.ngOnInit();
  }

  function createModuleCvsComponent(): ModuleCVsComponent {
    return new ModuleCVsComponent(patchServiceDouble(), snackBar);
  }

  beforeEach(() => {
    patchModuleInstances$ = new BehaviorSubject<PatchModuleInstance[]>([]);
    selectedForConnection$ = new BehaviorSubject<CVConnectionState>(EMPTY_CV_CONNECTION_STATE);
    clickOnModuleCV$ = new Subject<CVConnectionEntity>();
    patchEditingPanelOpenState$ = new BehaviorSubject<boolean>(true);
    editorConnections$ = new BehaviorSubject<PatchConnection[] | null>(null);
    destroy$ = new Subject<void>();
    lateCreatedCvItem = null;
    appState = jasmine.createSpyObj<AppStateService>('AppStateService', ['ngOnDestroy']);
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

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
      singlePatchData$: new BehaviorSubject(patchFixture(TEST_PATCH_ID, {name: 'TestPatch'})),
      editorConnections$,
      // ensureModuleInstance$: simulates the real one — calls patchModuleInstances$.next()
      // inside the map (before returning), exactly like the real service.
      ensureModuleInstance$: (module: DbModule | MinimalModule): Observable<number> => {
        const existing = patchModuleInstances$.value.find(i => i.module_id === module.id);
        if (existing) return of(existing.id);

        // Simulate the backend returning a new instance
        const newInstance = buildPatchModuleInstance(module.id);
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
        createLateCvItem('out', fakeModule.outs[0]);

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
    const cvs = createModuleCvsComponent();
    cvs.data = fakeModule;
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
    mockService.ensureModuleInstance$ = (module: DbModule | MinimalModule): Observable<number> => {
      const existing = patchModuleInstances$.value.find(i => i.module_id === module.id);
      if (existing) return of(existing.id);

      const newInstance = buildPatchModuleInstance(module.id);
      patchModuleInstances$.next([...patchModuleInstances$.value, newInstance]);

      createLateCvItem('in', fakeModule.ins[0]);

      return of(newInstance.id);
    };

    const cvs = createModuleCvsComponent();
    cvs.data = fakeModule;
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
