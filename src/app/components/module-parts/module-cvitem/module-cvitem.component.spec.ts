import { BehaviorSubject } from 'rxjs';
import { ModuleCVItemComponent } from './module-cvitem.component';
import {
  CV,
  CVConnectionEntity
} from 'src/app/models/cv';
import { PatchConnection } from 'src/app/models/connection';


/**
 * Unit Tests — ModuleCVItemComponent Highlight Logic
 *
 * Regression guard: selecting a CV on one instance must NOT highlight the same
 * CV on a different instance of the same module. The highlight comparison must
 * check both cv.id AND instance_id.
 */
describe('ModuleCVItemComponent - Instance-Aware Highlighting', () => {
  
  /** Minimal mock of PatchDetailDataService */
  let mockPatchService: {
    selectedForConnection$: BehaviorSubject<{
      a: CVConnectionEntity | null;
      b: CVConnectionEntity | null
    }>;
    patchEditingPanelOpenState$: BehaviorSubject<boolean>;
    editorConnections$: BehaviorSubject<PatchConnection[] | null>;
  };
  
  /** Factory: create a component instance */
  function createComponent(kind: 'in' | 'out', cv: CV, instanceId: number | undefined): ModuleCVItemComponent {
    const comp = new ModuleCVItemComponent({} as any, mockPatchService as any);
    Object.defineProperty(comp, 'data', {value: cv, writable: false});
    Object.defineProperty(comp, 'kind', {value: kind, writable: false});
    comp.instanceId = instanceId;
    comp.ngOnInit();
    return comp;
  }

  /** Helper: build a CVConnectionEntity */
  function makeCVEntity(cvId: number, instanceId: number | undefined, kind: 'in' | 'out'): CVConnectionEntity {
    return {
      cv: {id: cvId, name: 'cv-' + cvId, module: {id: 10, name: 'Mod'}, instance_id: instanceId} as any,
      kind
    };
  }

  beforeEach(() => {
    mockPatchService = {
      selectedForConnection$: new BehaviorSubject<{
        a: CVConnectionEntity | null;
        b: CVConnectionEntity | null
      }>({a: null, b: null}),
      patchEditingPanelOpenState$: new BehaviorSubject<boolean>(true),
      editorConnections$: new BehaviorSubject<PatchConnection[] | null>(null)
    };
  });

  // -------------------------------------------------------------------
  // Regression: instance-aware highlighting
  // -------------------------------------------------------------------

  it('should highlight an input CV when cv.id AND instanceId both match', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, 501);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeTrue();
  });

  it('should NOT highlight an input CV on a different instance (same cv.id, different instanceId)', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, 502);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeFalse();
  });

  it('should highlight an output CV when cv.id AND instanceId both match', () => {
    const comp = createComponent('out', {id: 7, name: 'Out1'} as CV, 501);
    mockPatchService.selectedForConnection$.next({a: makeCVEntity(7, 501, 'out'), b: null});
    expect(comp.highlightedTo.value).toBeTrue();
  });
  
  it('should NOT highlight an output CV on a different instance (same cv.id, different instanceId)', () => {
    const comp = createComponent('out', {id: 7, name: 'Out1'} as CV, 502);
    mockPatchService.selectedForConnection$.next({a: makeCVEntity(7, 501, 'out'), b: null});
    expect(comp.highlightedTo.value).toBeFalse();
  });
  
  // -------------------------------------------------------------------
  // Edge case: modules with no instances (instanceId = undefined)
  // -------------------------------------------------------------------
  
  it('should highlight when both sides have undefined instanceId (0-instance module)', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, undefined);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, undefined, 'in')});
    expect(comp.highlightedFrom.value).toBeTrue();
  });
  
  it('should NOT highlight when component has undefined instanceId but selection has an instanceId', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, undefined);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeFalse();
  });
  
  // -------------------------------------------------------------------
  // Deselection: clearing selection removes highlight
  // -------------------------------------------------------------------
  
  it('should remove highlight when selection is cleared', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, 501);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(42, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeTrue();
    mockPatchService.selectedForConnection$.next({a: null, b: null});
    expect(comp.highlightedFrom.value).toBeFalse();
  });
  
  // -------------------------------------------------------------------
  // Different CV id: never highlights regardless of instance
  // -------------------------------------------------------------------
  
  it('should NOT highlight when cv.id differs even if instanceId matches', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, 501);
    mockPatchService.selectedForConnection$.next({a: null, b: makeCVEntity(99, 501, 'in')});
    expect(comp.highlightedFrom.value).toBeFalse();
  });
  
  // -------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------
  
  it('should unsubscribe on destroy without errors', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, 501);
    expect(() => comp.ngOnDestroy()).not.toThrow();
  });
});

// =============================================================================
// connectionCount$ — connection indicator tests
// =============================================================================

describe('ModuleCVItemComponent - connectionCount$', () => {
  
  let mockPatchService: {
    selectedForConnection$: BehaviorSubject<{
      a: CVConnectionEntity | null;
      b: CVConnectionEntity | null
    }>;
    patchEditingPanelOpenState$: BehaviorSubject<boolean>;
    editorConnections$: BehaviorSubject<PatchConnection[] | null>;
  };
  
  function createComponent(kind: 'in' | 'out', cv: CV, instanceId: number | undefined): ModuleCVItemComponent {
    const comp = new ModuleCVItemComponent({} as any, mockPatchService as any);
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
      patch: {} as any,
      a: {id: aId, name: 'cv-a', module: {id: 10, name: 'Mod'}} as any,
      b: {id: bId, name: 'cv-b', module: {id: 20, name: 'Mod2'}} as any,
      instance_id_a: instanceIdA,
      instance_id_b: instanceIdB
    };
  }
  
  beforeEach(() => {
    mockPatchService = {
      selectedForConnection$: new BehaviorSubject<{
        a: CVConnectionEntity | null;
        b: CVConnectionEntity | null
      }>({a: null, b: null}),
      patchEditingPanelOpenState$: new BehaviorSubject<boolean>(true),
      editorConnections$: new BehaviorSubject<PatchConnection[] | null>(null)
    };
  });
  
  it('should be 0 when editorConnections$ is null (read-only view)', () => {
    const comp = createComponent('out', {id: 7, name: 'Out1'} as CV, 501);
    mockPatchService.editorConnections$.next(null);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should be 0 when there are no connections', () => {
    const comp = createComponent('out', {id: 7, name: 'Out1'} as CV, 501);
    mockPatchService.editorConnections$.next([]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should count 1 OUT connection matching cv.id and instanceId', () => {
    const comp = createComponent('out', {id: 7, name: 'Out1'} as CV, 501);
    mockPatchService.editorConnections$.next([makeConnection(7, 501, 99, 200)]);
    expect(comp.connectionCount$.value).toBe(1);
  });
  
  it('should count 2 OUT connections for the same port', () => {
    const comp = createComponent('out', {id: 7, name: 'Out1'} as CV, 501);
    mockPatchService.editorConnections$.next([
      makeConnection(7, 501, 99, 200),
      makeConnection(7, 501, 88, 300)
    ]);
    expect(comp.connectionCount$.value).toBe(2);
  });
  
  it('should NOT count an OUT connection on a different instance', () => {
    const comp = createComponent('out', {id: 7, name: 'Out1'} as CV, 502);
    mockPatchService.editorConnections$.next([makeConnection(7, 501, 99, 200)]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should count 1 IN connection matching cv.id and instanceId', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, 501);
    mockPatchService.editorConnections$.next([makeConnection(7, 200, 42, 501)]);
    expect(comp.connectionCount$.value).toBe(1);
  });
  
  it('should NOT count an IN connection for a different instanceId', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, 502);
    mockPatchService.editorConnections$.next([makeConnection(7, 200, 42, 501)]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should NOT count an OUT connection as IN', () => {
    // cv id 7 is the OUT side (a), not the IN side (b)
    const comp = createComponent('in', {id: 7, name: 'In7'} as CV, 501);
    mockPatchService.editorConnections$.next([makeConnection(7, 501, 99, 200)]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should update reactively when connections list changes', () => {
    const comp = createComponent('out', {id: 7, name: 'Out1'} as CV, 501);
    mockPatchService.editorConnections$.next([]);
    expect(comp.connectionCount$.value).toBe(0);
    
    mockPatchService.editorConnections$.next([makeConnection(7, 501, 99, 200)]);
    expect(comp.connectionCount$.value).toBe(1);
    
    mockPatchService.editorConnections$.next([]);
    expect(comp.connectionCount$.value).toBe(0);
  });
  
  it('should work for undefined instanceId (0-instance module) on OUT', () => {
    const comp = createComponent('out', {id: 7, name: 'Out1'} as CV, undefined);
    mockPatchService.editorConnections$.next([makeConnection(7, undefined, 99, undefined)]);
    expect(comp.connectionCount$.value).toBe(1);
  });
  
  it('should work for undefined instanceId (0-instance module) on IN', () => {
    const comp = createComponent('in', {id: 42, name: 'In1'} as CV, undefined);
    mockPatchService.editorConnections$.next([makeConnection(7, undefined, 42, undefined)]);
    expect(comp.connectionCount$.value).toBe(1);
  });
});