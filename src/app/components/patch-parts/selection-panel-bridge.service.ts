import { Injectable } from '@angular/core';
import {
  BehaviorSubject,
  Subject
} from 'rxjs';
import { CVConnectionEntity } from '../../models/cv';
import { Patch } from '../../models/patch';
import {
  map,
  mergeWith,
  shareReplay,
  skip,
  startWith
} from 'rxjs/operators';


/**
 * Root-level message bus between PatchDetailDataService (module-scoped)
 * and SelectionPanelOutletComponent (root-level standalone component).
 *
 * Provided explicitly in AppModule providers — NOT providedIn: 'root'.
 * Both PatchDetailDataService (module-scoped) and SelectionPanelOutletComponent
 * (standalone) resolve this upward to AppModule injector.
 */
@Injectable()
export class SelectionPanelBridgeService {
  
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
  
  /** Derived stream: emits `true` briefly when `record$` emits, and emits `false` whenever `selectionState$` changes.
   *  Starts with `false` and replays last value for late subscribers. This keeps confirmation state declarative.
   */
  readonly confirmed$ = (
    // when a record event occurs -> true
    this.record$.pipe(map(() => true))
  ).pipe(
    // revert to false whenever selection changes (skip initial seed)
    mergeWith(this.selectionState$.pipe(skip(1), map(() => false))),
    startWith(false),
    // replay latest to new subscribers
    shareReplay(1)
  );
}