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
  readonly selectionState$ = new BehaviorSubject<{
    a: CVConnectionEntity | null;
    b: CVConnectionEntity | null;
  }>({a: null, b: null});
  
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
      const norm = (v: number | null | undefined) => (v === null ? undefined : v);
      const curKey: ConnectionKey = {
        aId: sel.a.cv.id,
        bId: sel.b.cv.id,
        instanceA: norm(sel.a.cv.instance_id),
        instanceB: norm(sel.b.cv.instance_id)
      };
      
      const keyEquals = (k1: ConnectionKey | null, k2: ConnectionKey) => {
        if (!k1) { return false; }
        return k1.aId === k2.aId && k1.bId === k2.bId && (k1.instanceA === k2.instanceA) && (k1.instanceB === k2.instanceB);
      };
      
      if (keyEquals(recorded, curKey)) { return true; }
      if (conns && conns.find(c => {
        const k: ConnectionKey = {aId: c.a.id, bId: c.b.id, instanceA: norm(c.instance_id_a), instanceB: norm(c.instance_id_b)};
        return keyEquals(k, curKey);
      })) { return true; }
      
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
      if (!sel?.a || !sel?.b) {
        // nothing to record
        return;
      }
      const norm = (v: number | null | undefined) => (v === null ? undefined : v);
      this.recordedKey$.next({
        aId: sel.a.cv.id,
        bId: sel.b.cv.id,
        instanceA: norm(sel.a.cv.instance_id),
        instanceB: norm(sel.b.cv.instance_id)
      });
    });
    // If the recorded key exists but the editorConnections list no longer contains it (deleted), clear it.
    // This treats deletion as a "new event" that invalidates the previously recorded key.
    combineLatest([this.recordedKey$, this.editorConnections$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([rk, conns]) => {
      if (!rk) return;
      if (!conns) return;
      const norm = (v: number | null | undefined) => (v === null ? undefined : v);
      const exists = conns.find(c =>
        c.a.id === rk.aId && c.b.id === rk.bId && norm(c.instance_id_a) === rk.instanceA && norm(c.instance_id_b) === rk.instanceB
      );
      if (!exists) this.recordedKey$.next(null);
    });
  }
}