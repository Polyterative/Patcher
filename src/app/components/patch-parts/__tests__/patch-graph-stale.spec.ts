/**
 * Unit tests for the patch-graph stale-state stream logic.
 *
 * These tests verify the reactive wiring introduced in the
 * "Graph Stale-State Indicator + Debounced Auto-Refresh" feature:
 *   - isStale$ starts as false
 *   - editorConnections$ changes AFTER the first build mark the graph stale
 *   - The _graphBuiltOnce guard prevents a false-stale on initial data load
 *   - A rebuild trigger (tap) clears isStale$ immediately
 *   - The manual refresh pipeline resolves to the latest editorConnections$ value
 *
 * No Angular TestBed needed — the logic is pure RxJS and can be wired
 * directly with BehaviorSubjects, mirroring the component constructor.
 */

import {
  fakeAsync,
  tick
} from '@angular/core/testing';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import {
  debounceTime,
  filter,
  map,
  withLatestFrom
} from 'rxjs/operators';
import { PatchConnection } from 'src/app/models/connection';
import { Patch } from 'src/app/models/patch';
import { CVwithModule } from 'src/app/models/cv';


// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCV(id: number, moduleId: number): CVwithModule {
  return {id, name: `CV ${ id }`, module: {id: moduleId, name: `M${ moduleId }`} as any};
}

function makeConnections(count = 1): PatchConnection[] {
  return Array.from({length: count}, (_, i) => ({
    a: makeCV(i + 1, 10),
    b: makeCV(i + 100, 20),
    patch: {id: 1} as Patch,
    instance_id_a: undefined,
    instance_id_b: undefined
  }));
}

/**
 * Minimal harness that reproduces the stale-state stream wiring from
 * PatchGraphComponent.ngOnInit() without spinning up Angular.
 */
function buildStaleHarness() {
  const editorConnections$ = new BehaviorSubject<PatchConnection[] | null>(null);
  const isStale$ = new BehaviorSubject<boolean>(false);
  const manualRefresh$ = new Subject<void>();
  let graphBuiltOnce = false;
  
  // Stale detection (mirrors component)
  editorConnections$
    .pipe(filter(() => graphBuiltOnce), filter(Boolean))
    .subscribe(() => isStale$.next(true));
  
  // Auto-refresh stream (debounced)
  const autoRefresh$ = editorConnections$.pipe(
    filter(() => graphBuiltOnce),
    filter(Boolean),
    debounceTime(3000)
  );
  
  // Manual refresh resolves latest connections
  const manualRefreshWithConnections$ = manualRefresh$.pipe(
    withLatestFrom(editorConnections$),
    map(([, connections]) => connections),
    filter(Boolean)
  );
  
  // Simulate the tap() that fires at the start of every rebuild
  const simulateRebuildStart = () => isStale$.next(false);
  
  // Simulate the subscribe callback that fires after a successful build
  const simulateBuildComplete = () => {
    graphBuiltOnce = true;
  };
  
  return {
    editorConnections$,
    isStale$,
    manualRefresh$,
    autoRefresh$,
    manualRefreshWithConnections$,
    simulateRebuildStart,
    simulateBuildComplete
  };
}


// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Patch graph — stale-state stream logic', () => {
  
  it('isStale$ starts as false', () => {
    const {isStale$} = buildStaleHarness();
    expect(isStale$.getValue()).toBe(false);
  });
  
  it('editorConnections$ change before first build does NOT mark stale (load guard)', () => {
    const {editorConnections$, isStale$} = buildStaleHarness();
    
    editorConnections$.next(makeConnections());
    
    expect(isStale$.getValue()).toBe(false);
  });
  
  it('editorConnections$ change AFTER first build marks stale', () => {
    const {editorConnections$, isStale$, simulateBuildComplete} = buildStaleHarness();
    
    editorConnections$.next(makeConnections());
    simulateBuildComplete();
    
    editorConnections$.next(makeConnections(2));
    
    expect(isStale$.getValue()).toBe(true);
  });
  
  it('null editorConnections$ emission does not mark stale (filter guard)', () => {
    const {editorConnections$, isStale$, simulateBuildComplete} = buildStaleHarness();
    
    editorConnections$.next(makeConnections());
    simulateBuildComplete();
    
    editorConnections$.next(null);
    
    expect(isStale$.getValue()).toBe(false);
  });
  
  it('rebuild start (tap) clears stale immediately', () => {
    const {editorConnections$, isStale$, simulateBuildComplete, simulateRebuildStart} = buildStaleHarness();
    
    editorConnections$.next(makeConnections());
    simulateBuildComplete();
    editorConnections$.next(makeConnections(2));
    expect(isStale$.getValue()).toBe(true);
    
    simulateRebuildStart();
    
    expect(isStale$.getValue()).toBe(false);
  });
  
  it('manual refresh resolves to latest editorConnections$ value', () => {
    const {editorConnections$, manualRefresh$, manualRefreshWithConnections$, simulateBuildComplete} = buildStaleHarness();
    
    const connections = makeConnections(3);
    editorConnections$.next(connections);
    simulateBuildComplete();
    
    let resolved: PatchConnection[] | null = null;
    manualRefreshWithConnections$.subscribe(c => resolved = c);
    
    manualRefresh$.next();
    
    expect(resolved).toBe(connections);
  });
  
  it('manual refresh does not emit when editorConnections$ is null', () => {
    const {manualRefresh$, manualRefreshWithConnections$} = buildStaleHarness();
    
    let emitCount = 0;
    manualRefreshWithConnections$.subscribe(() => emitCount++);
    
    manualRefresh$.next();
    
    expect(emitCount).toBe(0);
  });
  
  it('autoRefresh$ emits after debounce once graph is built', fakeAsync(() => {
    const {editorConnections$, autoRefresh$, simulateBuildComplete} = buildStaleHarness();
    
    const connections = makeConnections(2);
    editorConnections$.next(connections);
    simulateBuildComplete();
    
    let emitted: PatchConnection[] | null = null;
    autoRefresh$.subscribe(c => emitted = c);
    
    editorConnections$.next(connections);
    expect(emitted).toBeNull();
    
    tick(3000);
    
    expect(emitted).toBe(connections);
  }));
  
  it('autoRefresh$ does not emit before graph is built', fakeAsync(() => {
    const {editorConnections$, autoRefresh$} = buildStaleHarness();
    
    let emitCount = 0;
    autoRefresh$.subscribe(() => emitCount++);
    
    editorConnections$.next(makeConnections());
    tick(3000);
    
    expect(emitCount).toBe(0);
  }));
});