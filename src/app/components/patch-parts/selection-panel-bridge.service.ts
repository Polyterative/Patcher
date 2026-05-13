import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  Subject
} from 'rxjs';
import {
  distinctUntilChanged,
  map,
  shareReplay,
  startWith,
  takeUntil,
  withLatestFrom
} from 'rxjs/operators';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { CVConnectionEntity } from '../../models/cv';
import { Patch } from '../../models/patch';
import { PatchConnection } from '../../models/connection';


// Lightweight identity used to compare connections
export interface ConnectionKey {
  aId: number;
  bId: number;
  instanceA?: number | undefined;
  instanceB?: number | undefined;
}

export interface CVSelectionState {
  a: CVConnectionEntity | null;
  b: CVConnectionEntity | null;
}

function normalizeInstanceId(v: number | null | undefined): number | undefined {
  return v === null ? undefined : v;
}

function connectionKeysEqual(k1: ConnectionKey | null, k2: ConnectionKey): boolean {
  if (!k1) { return false; }
  return k1.aId === k2.aId && k1.bId === k2.bId
    && k1.instanceA === k2.instanceA && k1.instanceB === k2.instanceB;
}

function selectionToConnectionKey(a: CVConnectionEntity, b: CVConnectionEntity): ConnectionKey {
  return {
    aId: a.cv.id,
    bId: b.cv.id,
    instanceA: normalizeInstanceId(a.cv.instance_id),
    instanceB: normalizeInstanceId(b.cv.instance_id)
  };
}


/**
 * Root-level message bus between PatchDetailDataService (module-scoped)
 * and SelectionPanelOutletComponent (root-level standalone component).
 *
 * Provided explicitly in AppModule providers — NOT providedIn: 'root'.
 * Both PatchDetailDataService (module-scoped) and SelectionPanelOutletComponent
 * (standalone) resolve this upward to AppModule injector.
 */
@Injectable()
export class SelectionPanelBridgeService extends SubManager {
  
  /** Current CV connection selection state — mirrored from PatchDetailDataService. */
  readonly selectionState$ = new BehaviorSubject<CVSelectionState>({a: null, b: null});
  
  /** Active patch — mirrored from PatchDetailDataService. */
  readonly patchData$ = new BehaviorSubject<Patch | undefined>(undefined);
  
  /** Instance label map — mirrored from PatchDetailDataService. */
  readonly instanceLabelMap$ = new BehaviorSubject<Map<number, string>>(new Map());
  
  // ── Action buses (outlet → bridge → PatchDetailDataService) ──────────────
  /** Outlet emits here to cancel the current selection. */
  readonly reset$ = new Subject<void>();
  
  /** Outlet emits here to confirm the pending connection. */
  readonly confirm$ = new Subject<void>();
  
  /** Outlet emits here to clear only side A (output). */
  readonly resetA$ = new Subject<void>();
  
  /** Outlet emits here to clear only side B (input). */
  readonly resetB$ = new Subject<void>();
  
  /** Service emits into this when a connection is recorded. Consumers should not write to `confirmed$` directly. */
  readonly record$ = new Subject<void>();
  
  /** Mirror of editor connections (DB/editor list) so bridge can detect existing recorded connections. */
  readonly editorConnections$ = new BehaviorSubject<PatchConnection[] | null>(null);
  
  /** The canonical recorded connection key (persisted in-memory) — set when `record$` emits. */
  readonly recordedKey$ = new BehaviorSubject<ConnectionKey | null>(null);
  
  /** Derived stream: emits `true` briefly when `record$` emits, and emits `false` whenever `selectionState$` changes.
   *  Starts with `false` and replays last value for late subscribers. This keeps confirmation state declarative.
   */
  readonly confirmed$ = combineLatest([
    this.selectionState$,
    this.recordedKey$,
    this.editorConnections$
  ]).pipe(
    map(([sel, recorded, conns]) => {
      if (!sel?.a || !sel?.b) { return false; }
      const curKey = selectionToConnectionKey(sel.a, sel.b);
      if (connectionKeysEqual(recorded, curKey)) { return true; }
      if (conns?.find(c => connectionKeysEqual(
        {aId: c.a.id, bId: c.b.id, instanceA: normalizeInstanceId(c.instance_id_a), instanceB: normalizeInstanceId(c.instance_id_b)},
        curKey
      ))) { return true; }
      return false;
    }),
    startWith(false),
    distinctUntilChanged(),
    shareReplay(1)
  );
  
  // When a record event occurs, capture the current selectionState$ into recordedKey$ so it persists
  // until explicitly changed by another record or external clearing.
  constructor() {
    super();
    this.record$.pipe(withLatestFrom(this.selectionState$), takeUntil(this.destroy$)).subscribe(([_, sel]) => {
      if (!sel?.a || !sel?.b) { return; }
      this.recordedKey$.next(selectionToConnectionKey(sel.a, sel.b));
    });
    // If the recorded key exists but the editorConnections list no longer contains it (deleted), clear it.
    // This treats deletion as a "new event" that invalidates the previously recorded key.
    combineLatest([this.recordedKey$, this.editorConnections$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([rk, conns]) => {
        if (!rk || !conns) { return; }
        const exists = conns.find(c => connectionKeysEqual(
          {aId: c.a.id, bId: c.b.id, instanceA: normalizeInstanceId(c.instance_id_a), instanceB: normalizeInstanceId(c.instance_id_b)},
          rk
        ));
        if (!exists) { this.recordedKey$.next(null); }
      });
  }
}