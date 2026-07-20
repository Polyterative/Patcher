import { BehaviorSubject } from 'rxjs';
import { ModuleCVItemComponent } from './module-cvitem.component';
import {
  CV,
  CVConnectionEntity,
  CVwithModule
} from 'src/app/models/cv';
import { PatchConnection } from 'src/app/models/connection';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { CVConnectionState } from 'src/app/components/patch-parts/patch-detail-data.models';
import {
  MinimalModule,
  UserModulePossessionKind
} from 'src/app/models/module';
import { Patch } from 'src/app/models/patch';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';


/**
 * Unit Tests — ModuleCVItemComponent Highlight Logic
 *
 * Regression guard: selecting a CV on one instance must NOT highlight the same
 * CV on a different instance of the same module. The highlight comparison must
 * check both cv.id AND instance_id.
 */
describe('ModuleCVItemComponent - Instance-Aware Highlighting', () => {
  let mockPatchService: PatchDetailDataServiceDouble;
  
  /** Factory: create a component instance */
  function createComponent(kind: 'in' | 'out', cv: CV, instanceId: number | undefined): ModuleCVItemComponent {
    const comp = new ModuleCVItemComponent(appStateDouble(), mockPatchService as PatchDetailDataService);
    Object.defineProperty(comp, 'data', {value: cv, writable: false});
    Object.defineProperty(comp, 'kind', {value: kind, writable: false});
    comp.instanceId = instanceId;
    comp.ngOnInit();
    return comp;
  }

  /** Helper: build a CVConnectionEntity */
  function makeCVEntity(cvId: number, instanceId: number | undefined, kind: 'in' | 'out'): CVConnectionEntity {
    return {
      cv: cvWithModuleFixture(cvId, instanceId, 10, 'Mod'),
      kind
    };
  }

  beforeEach(() => {
    mockPatchService = {
      selectedForConnection$: new BehaviorSubject<CVConnectionState>({a: null, b: null}),
      patchEditingPanelOpenState$: new BehaviorSubject<boolean>(true),
      editorConnections$: new BehaviorSubject<PatchConnection[] | null>(null)
    };
  });

  // -------------------------------------------------------------------
  // Regression: instance-aware highlighting
  // -------------------------------------------------------------------

  it('should highlight an input CV when cv.id AND instanceId both match', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), 501);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeTrue();
  });

  it('should NOT highlight an input CV on a different instance (same cv.id, different instanceId)', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), 502);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeFalse();
  });

  it('should highlight an output CV when cv.id AND instanceId both match', () => {
    const comp = createComponent('out', cvFixture(7, 'Out1'), 501);
    mockPatchService.selectedForConnection$.next({a: makeCVEntity(7, 501, 'out'), b: null});
    expect(comp.highlightedTo.value).toBeTrue();
  });
  
  it('should NOT highlight an output CV on a different instance (same cv.id, different instanceId)', () => {
    const comp = createComponent('out', cvFixture(7, 'Out1'), 502);
    mockPatchService.selectedForConnection$.next({a: makeCVEntity(7, 501, 'out'), b: null});
    expect(comp.highlightedTo.value).toBeFalse();
  });
  
  // -------------------------------------------------------------------
  // Edge case: modules with no instances (instanceId = undefined)
  // -------------------------------------------------------------------
  
  it('should highlight when both sides have undefined instanceId (0-instance module)', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), undefined);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, undefined, 'in')});
    expect(comp.highlightedFrom.value).toBeTrue();
  });
  
  it('should NOT highlight when component has undefined instanceId but selection has an instanceId', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), undefined);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeFalse();
  });
  
  // -------------------------------------------------------------------
  // Deselection: clearing selection removes highlight
  // -------------------------------------------------------------------
  
  it('should remove highlight when selection is cleared', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), 501);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeTrue();
    mockPatchService.selectedForConnection$.next({a: null, b: null});
    expect(comp.highlightedFrom.value).toBeFalse();
  });
  
  // -------------------------------------------------------------------
  // Different CV id: never highlights regardless of instance
  // -------------------------------------------------------------------
  
  it('should NOT highlight when cv.id differs even if instanceId matches', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), 501);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(99, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeFalse();
  });
  
  // -------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------
  
  it('should unsubscribe on destroy without errors', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), 501);
    expect(() => comp.ngOnDestroy()).not.toThrow();
  });
});

// =============================================================================
// connectionCount$ — connection indicator tests
// =============================================================================

describe('ModuleCVItemComponent - connectionCount$', () => {
  let mockPatchService: PatchDetailDataServiceDouble;
  
  function createComponent(kind: 'in' | 'out', cv: CV, instanceId: number | undefined): ModuleCVItemComponent {
    const comp = new ModuleCVItemComponent(appStateDouble(), mockPatchService as PatchDetailDataService);
    Object.defineProperty(comp, 'data', {value: cv, writable: false});
    Object.defineProperty(comp, 'kind', {value: kind, writable: false});
    comp.instanceId = instanceId;
    comp.ngOnInit();
    return comp;
  }
  
  function makeConnection(
    aId: number, instanceIdA: number | undefined,
    bId: number, instanceIdB: number | undefined
  ): PatchConnection {
    return {
      patch: patchFixture(),
      a: cvWithModuleFixture(aId, instanceIdA, 10, 'Mod', 'cv-a'),
      b: cvWithModuleFixture(bId, instanceIdB, 20, 'Mod2', 'cv-b'),
      instance_id_a: instanceIdA,
      instance_id_b: instanceIdB
    };
  }
  
  beforeEach(() => {
    mockPatchService = {
      selectedForConnection$: new BehaviorSubject<CVConnectionState>({a: null, b: null}),
      patchEditingPanelOpenState$: new BehaviorSubject<boolean>(true),
      editorConnections$: new BehaviorSubject<PatchConnection[] | null>(null)
    };
  });
  
  it('should be 0 when editorConnections$ is null (read-only view)', () => {
    const comp = createComponent('out', cvFixture(7, 'Out1'), 501);
    mockPatchService.editorConnections$.next(null);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should be 0 when there are no connections', () => {
    const comp = createComponent('out', cvFixture(7, 'Out1'), 501);
    mockPatchService.editorConnections$.next([]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should count 1 OUT connection matching cv.id and instanceId', () => {
    const comp = createComponent('out', cvFixture(7, 'Out1'), 501);
    mockPatchService.editorConnections$.next([makeConnection(7, 501, 99, 200)]);
    expect(comp.connectionCount$.value).toBe(1);
  });
  
  it('should count 2 OUT connections for the same port', () => {
    const comp = createComponent('out', cvFixture(7, 'Out1'), 501);
    mockPatchService.editorConnections$.next([
      makeConnection(7, 501, 99, 200),
      makeConnection(7, 501, 88, 300)
    ]);
    expect(comp.connectionCount$.value).toBe(2);
  });
  
  it('should NOT count an OUT connection on a different instance', () => {
    const comp = createComponent('out', cvFixture(7, 'Out1'), 502);
    mockPatchService.editorConnections$.next([makeConnection(7, 501, 99, 200)]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should count 1 IN connection matching cv.id and instanceId', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), 501);
    mockPatchService.editorConnections$.next([makeConnection(7, 200, 42, 501)]);
    expect(comp.connectionCount$.value).toBe(1);
  });
  
  it('should NOT count an IN connection for a different instanceId', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), 502);
    mockPatchService.editorConnections$.next([makeConnection(7, 200, 42, 501)]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should NOT count an OUT connection as IN', () => {
    // cv id 7 is the OUT side (a), not the IN side (b)
    const comp = createComponent('in', cvFixture(7, 'In7'), 501);
    mockPatchService.editorConnections$.next([makeConnection(7, 501, 99, 200)]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should update reactively when connections list changes', () => {
    const comp = createComponent('out', cvFixture(7, 'Out1'), 501);
    mockPatchService.editorConnections$.next([]);
    expect(comp.connectionCount$.value).toBe(0);
    
    mockPatchService.editorConnections$.next([makeConnection(7, 501, 99, 200)]);
    expect(comp.connectionCount$.value).toBe(1);
    
    mockPatchService.editorConnections$.next([]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should work for undefined instanceId (0-instance module) on OUT', () => {
    const comp = createComponent('out', cvFixture(7, 'Out1'), undefined);
    mockPatchService.editorConnections$.next([makeConnection(7, undefined, 99, undefined)]);
    expect(comp.connectionCount$.value).toBe(1);
  });
  
  it('should work for undefined instanceId (0-instance module) on IN', () => {
    const comp = createComponent('in', cvFixture(42, 'In1'), undefined);
    mockPatchService.editorConnections$.next([makeConnection(7, undefined, 42, undefined)]);
    expect(comp.connectionCount$.value).toBe(1);
  });
});

type PatchDetailDataServiceDouble = Pick<
  PatchDetailDataService,
  'selectedForConnection$' | 'patchEditingPanelOpenState$' | 'editorConnections$'
>;

function appStateDouble(): AppStateService {
  return jasmine.createSpyObj<AppStateService>('AppStateService', ['ngOnDestroy']);
}

function cvFixture(id: number, name = `cv-${ id }`): CV {
  return {id, name};
}

function cvWithModuleFixture(
  id: number,
  instanceId: number | undefined,
  moduleId: number,
  moduleName: string,
  name = `cv-${ id }`
): CVwithModule {
  return {
    ...cvFixture(id, name),
    module: minimalModuleFixture(moduleId, moduleName),
    instance_id: instanceId
  };
}

function minimalModuleFixture(
  id: number,
  name: string,
  possessionKind?: UserModulePossessionKind
): MinimalModule {
  return {
    id,
    name,
    description: '',
    hp: 10,
    public: true,
    manufacturer: {
      id,
      name: 'Manufacturer'
    },
    manufacturerId: id,
    standard: {
      id: 0,
      name: 'Eurorack'
    },
    tags: [],
    panels: [],
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z',
    possessionKind
  };
}

function patchFixture(): Patch {
  return {
    id: 1,
    author: {
      id: 'user-1',
      username: 'patcher'
    },
    name: 'Patch',
    description: '',
    public: true,
    created: '2026-01-01T00:00:00.000Z',
    updated: '2026-01-01T00:00:00.000Z'
  };
}