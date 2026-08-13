import { BehaviorSubject, EMPTY, Observable, of, merge } from 'rxjs';
import { catchError, concatMap, finalize, map, scan, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { PatchConnection } from '../../models/connection';
import { Patch } from '../../models/patch';
import { CVConnectionEvent, CVConnectionState, EMPTY_CV_CONNECTION_STATE } from './patch-detail-data.models';
import { PatchDetailDataContext, PatchDetailDataDependencies } from './patch-detail-data.context.types';

export function bindConnectionSelection(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  merge(
    ctx.clickOnModuleCV$.pipe(
      tap(cv => deps.analytics.capture('patch.cv_clicked', {
        patch_id: ctx.singlePatchData$.value?.id,
        cv_kind: cv.kind,
        module_id: cv.cv.module.id
      })),
      map(cv => ({type: 'cv', cv} as CVConnectionEvent))
    ),
    ctx.resetSelectedForConnection$.pipe(
      tap(() => deps.analytics.capture('patch.connection_selection_reset', { patch_id: ctx.singlePatchData$.value?.id })),
      map(() => ({type: 'reset'} as CVConnectionEvent))
    ),
    deps.bridge.resetA$.pipe(map(() => ({type: 'resetA'} as CVConnectionEvent))),
    deps.bridge.resetB$.pipe(map(() => ({type: 'resetB'} as CVConnectionEvent)))
  )
    .pipe(
      scan((state: CVConnectionState, ev: CVConnectionEvent): CVConnectionState => {
        switch (ev.type) {
          case 'reset':  return EMPTY_CV_CONNECTION_STATE;
          case 'resetA': return {a: null, b: state.b};
          case 'resetB': return {a: state.a, b: null};
          case 'cv':
            return ev.cv.kind === 'in'
              ? {a: state.a, b: ev.cv}
              : {a: ev.cv, b: state.b};
        }
      }, EMPTY_CV_CONNECTION_STATE),
      takeUntil(ctx.destroy$)
    )
    .subscribe((state) => {
      ctx.selectedForConnection$.next(state);
    });
}

export function bindConfirmSelectedConnection(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.confirmSelectedConnection$
    .pipe(
      withLatestFrom(ctx.editorConnections$),
      takeUntil(ctx.destroy$)
    )
    .subscribe(([_, patchConnections]) => {
      patchConnections = patchConnections || [];
      const selection: CVConnectionState = ctx.selectedForConnection$.value;
      const patch: Patch = ctx.singlePatchData$.value;
      if (!selection.a || !selection.b || !patch) { return; }
      const newConnection: PatchConnection = {
        a: selection.a.cv,
        b: selection.b.cv,
        patch,
        instance_id_a: selection.a.cv.instance_id,
        instance_id_b: selection.b.cv.instance_id
      };
      const isAlreadyInList: boolean = !!patchConnections.find(connection =>
        connection.a.id === newConnection.a.id
        && connection.b.id === newConnection.b.id
        && connection.instance_id_a === newConnection.instance_id_a
        && connection.instance_id_b === newConnection.instance_id_b
      );
      if (!isAlreadyInList) {
        const nextList = [
          ...patchConnections,
          newConnection
        ];
        ctx.editorConnections$.next(nextList);
        deps.bridge.editorConnections$.next(nextList);
        ctx.requestConnectionDbSync$.next(patchConnections);
        deps.analytics.capture('patch.connection_added', { patch_id: patch.id });
        SharedConstants.successCustom(deps.snackBar, `${ newConnection.a.module.name } "${ newConnection.a.name }" → ${ newConnection.b.module.name } "${ newConnection.b.name }" recorded.`);
        deps.bridge.record$.next();
      } else {
        deps.analytics.capture('patch.connection_duplicate_attempted', { patch_id: patch?.id });
        SharedConstants.errorCustom(deps.snackBar, `${ newConnection.a.module.name } "${ newConnection.a.name }" → ${ newConnection.b.module.name } "${ newConnection.b.name }" is already in this patch.`);
      }
    });
}

export function bindPatchConnectionMirror(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.patchConnections$
    .pipe(takeUntil(ctx.destroy$))
    .subscribe(x => {
      ctx.editorConnections$.next(x);
      deps.bridge.editorConnections$.next(x);
    });
}

export function bindRemoveConnectionFromEditor(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.removeConnectionFromEditor$
    .pipe(
      withLatestFrom(ctx.editorConnections$),
      takeUntil(ctx.destroy$)
    )
    .subscribe(([x, data]) => {
      const next = data.filter(
        connection => !(connection.a.id === x.a.id && connection.b.id === x.b.id
          && connection.instance_id_a === x.instance_id_a
          && connection.instance_id_b === x.instance_id_b))
      ;
      ctx.editorConnections$.next(next);
      deps.bridge.editorConnections$.next(next);
      deps.analytics.capture('patch.connection_removed', { patch_id: ctx.singlePatchData$.value?.id });
      ctx.requestConnectionDbSync$.next(data);
    });
}

export function bindConnectionDbSync(
  ctx: PatchDetailDataContext,
  deps: PatchDetailDataDependencies,
  connectionSyncPendingCount$: BehaviorSubject<number>
): void {
  // CAS guard: only roll back if nothing newer has landed in editorConnections$ since this
  // sync's snapshot was taken — otherwise a slow/failed sync would clobber a newer optimistic edit.
  const rollbackIfStillCurrent = (previousConnections: PatchConnection[] | null, connections: PatchConnection[] | null): void => {
    if (ctx.editorConnections$.value !== connections) { return; }
    ctx.editorConnections$.next(previousConnections);
    deps.bridge.editorConnections$.next(previousConnections);
  };

  ctx.requestConnectionDbSync$
    .pipe(
      tap(() => connectionSyncPendingCount$.next(connectionSyncPendingCount$.value + 1)),
      withLatestFrom(ctx.editorConnections$, ctx.singlePatchData$),
      concatMap(([previousConnections, connections, patch]) => {
        let request$: Observable<unknown>;
        if (!patch || connections === null) {
          request$ = of(null);
        } else if (connections.length === 0) {
          request$ = deps.backend.delete.patchConnectionsForPatch(patch.id).pipe(
            catchError(err => {
              console.error('Failed to save connections:', err);
              SharedConstants.errorCustom(deps.snackBar, 'Failed to save — check your connection and try again.');
              rollbackIfStillCurrent(previousConnections, connections);
              return EMPTY;
            })
          );
        } else {
          request$ = deps.backend.update.patchConnectionsSilent(connections).pipe(
            catchError(err => {
              console.error('Failed to save connections:', err);
              SharedConstants.errorCustom(deps.snackBar, 'Failed to save — check your connection and try again.');
              rollbackIfStillCurrent(previousConnections, connections);
              return EMPTY;
            })
          );
        }

        return request$.pipe(
          finalize(() => connectionSyncPendingCount$.next(Math.max(0, connectionSyncPendingCount$.value - 1)))
        );
      }),
      takeUntil(ctx.destroy$)
    )
    .subscribe();
}

export function bindPatchConnectionNoteSync(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.requestNoteSync$
    .pipe(
      switchMap(conn =>
        deps.backend.update.patchConnectionNoteSilent(conn).pipe(
          tap(() => deps.analytics.capture('patch.connection_note_saved', { patch_id: ctx.singlePatchData$.value?.id })),
          catchError(_ => {
            SharedConstants.errorCustom(deps.snackBar, 'Failed to save note — check your connection.');
            return EMPTY;
          })
        )
      ),
      takeUntil(ctx.destroy$)
    )
    .subscribe();
}

export function bindSelectionPanelBridge(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.selectedForConnection$
    .pipe(takeUntil(ctx.destroy$))
    .subscribe(v => deps.bridge.selectionState$.next(v));

  ctx.singlePatchData$
    .pipe(takeUntil(ctx.destroy$))
    .subscribe(v => deps.bridge.patchData$.next(v));

  ctx.instanceLabelMap$
    .pipe(takeUntil(ctx.destroy$))
    .subscribe(v => deps.bridge.instanceLabelMap$.next(v));

  deps.bridge.reset$
    .pipe(takeUntil(ctx.destroy$))
    .subscribe(() => ctx.resetSelectedForConnection$.next());

  deps.bridge.confirm$
    .pipe(takeUntil(ctx.destroy$))
    .subscribe(() => ctx.confirmSelectedConnection$.next());
}
