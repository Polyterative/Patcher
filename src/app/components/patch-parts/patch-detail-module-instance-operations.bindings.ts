import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { EMPTY, forkJoin, Observable, of } from 'rxjs';
import { catchError, exhaustMap, filter, map, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { ConfirmDialogComponent, ConfirmDialogDataInModel, ConfirmDialogDataOutModel } from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { PatchModuleInstance } from '../../models/connection';
import { DbModule, MinimalModule } from '../../models/module';
import { MAX_INSTANCES_PER_MODULE } from './patch-detail-data.models';
import { PatchDetailDataContext, PatchDetailDataDependencies } from './patch-detail-data.context.types';

export function bindAddModuleInstance(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.addModuleInstance$
    .pipe(
      withLatestFrom(ctx.singlePatchData$, ctx.patchModuleInstances$),
      filter(([_, patch]) => !!patch),
      exhaustMap(([module, patch, existingInstances]) => {
        const sameModuleCount = (existingInstances || []).filter(i => i.module_id === module.id).length;
        const wouldBeCount = sameModuleCount + (sameModuleCount === 0 ? 2 : 1);
        if (wouldBeCount > MAX_INSTANCES_PER_MODULE) {
          SharedConstants.errorCustom(deps.snackBar, `Maximum of ${ MAX_INSTANCES_PER_MODULE } copies per module reached.`);
          return EMPTY;
        }

        if (sameModuleCount === 0) {
          return (deps.backend.add.patchModuleInstances([
            {patch_id: patch.id, module_id: module.id, instance_label: '(1)'},
            {patch_id: patch.id, module_id: module.id, instance_label: '(2)'}
          ]) as Observable<PatchModuleInstance[]>).pipe(
            catchError(err => {
              console.error('Failed to add module instances:', err);
              SharedConstants.errorCustom(deps.snackBar, 'Failed to add module copies.');
              return EMPTY;
            })
          );
        }

        if (sameModuleCount === 1) {
          return forkJoin({
            relabeled: relabelExistingInstance$(ctx, deps, existingInstances, module.id, '(1)'),
            newInstance: deps.backend.add.patchModuleInstance(patch.id, module.id, '(2)') as Observable<PatchModuleInstance>
          }).pipe(
            map(({newInstance}) => [newInstance]),
            catchError(err => {
              console.error('Failed to add module instance:', err);
              SharedConstants.errorCustom(deps.snackBar, 'Failed to add module copy.');
              return EMPTY;
            })
          );
        }

        return (deps.backend.add.patchModuleInstance(patch.id, module.id, `(${ sameModuleCount + 1 })`) as Observable<PatchModuleInstance>).pipe(
          map(instance => [instance]),
          catchError(err => {
            console.error('Failed to add module instance:', err);
            SharedConstants.errorCustom(deps.snackBar, 'Failed to add module copy.');
            return EMPTY;
          })
        );
      }),
      takeUntil(ctx.destroy$)
    )
    .subscribe(newInstances => {
      ctx.patchModuleInstances$.next([...ctx.patchModuleInstances$.value, ...newInstances]);
      const moduleId = newInstances[0]?.module_id;
      if (moduleId != null) {
        renumberModuleInstances$(ctx, deps, moduleId).subscribe();
      }
      deps.analytics.capture('patch.module_instance_added', { patch_id: ctx.singlePatchData$.value?.id, module_id: moduleId, count: newInstances.length });
      const msg = newInstances.length > 1 ? 'Module split into 2 copies.' : 'Copy added.';
      SharedConstants.successCustom(deps.snackBar, msg);
    });
}

export function bindRemoveModuleInstance(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.removeModuleInstance$
    .pipe(
      switchMap((instance: PatchModuleInstance) => confirmModuleInstanceRemoval$(ctx, deps.dialog, deps.snackBar, instance)),
      switchMap((instance: PatchModuleInstance) =>
        (deps.backend.delete.patchModuleInstance(instance.id) as Observable<unknown>).pipe(
          map(() => instance),
          catchError(err => {
            console.error('Failed to remove module instance:', err);
            SharedConstants.errorCustom(deps.snackBar, 'Failed to remove instance.');
            return EMPTY;
          })
        )
      ),
      takeUntil(ctx.destroy$)
    )
    .subscribe((removed: PatchModuleInstance) => {
      ctx.patchModuleInstances$.next(
        ctx.patchModuleInstances$.value.filter(i => i.id !== removed.id)
      );

      const currentConnections = ctx.editorConnections$.value;
      if (currentConnections) {
        const scrubbed = currentConnections.map(conn => {
          let changed = false;
          const patched = {...conn};
          if (patched.instance_id_a === removed.id) {
            patched.instance_id_a = undefined;
            changed = true;
          }
          if (patched.instance_id_b === removed.id) {
            patched.instance_id_b = undefined;
            changed = true;
          }
          return changed ? patched : conn;
        });
        ctx.editorConnections$.next(scrubbed);
        deps.bridge.editorConnections$.next(scrubbed);
        ctx.requestConnectionDbSync$.next();
      }

      renumberModuleInstances$(ctx, deps, removed.module_id).subscribe();

      const sel = ctx.selectedForConnection$.value;
      const aAffected = sel?.a?.cv?.instance_id === removed.id;
      const bAffected = sel?.b?.cv?.instance_id === removed.id;
      if (aAffected && bAffected) {
        ctx.resetSelectedForConnection$.next();
      } else if (aAffected) {
        deps.bridge.resetA$.next();
      } else if (bAffected) {
        deps.bridge.resetB$.next();
      }

      SharedConstants.successCustom(deps.snackBar, `Instance removed.`);
      deps.analytics.capture('patch.module_instance_removed', { patch_id: ctx.singlePatchData$.value?.id, module_id: removed.module_id });
    });
}

export function ensureModuleInstance$(
  ctx: PatchDetailDataContext,
  deps: PatchDetailDataDependencies,
  module: DbModule | MinimalModule,
  forceNew = false
): Observable<number> {
  const patch = ctx.singlePatchData$.value;
  if (!patch) { return EMPTY as Observable<number>; }

  const existingInstances = ctx.patchModuleInstances$.value.filter(i => i.module_id === module.id);

  if (!forceNew && existingInstances.length > 0) {
    return of(existingInstances[0].id);
  }

  const wouldBeCount = existingInstances.length === 0 ? 1 : existingInstances.length + 1;
  if (wouldBeCount > MAX_INSTANCES_PER_MODULE) {
    return existingInstances.length > 0 ? of(existingInstances[0].id) : EMPTY as Observable<number>;
  }

  if (existingInstances.length === 0) {
    return (deps.backend.add.patchModuleInstance(patch.id, module.id, null) as Observable<PatchModuleInstance>).pipe(
      map(instance => {
        ctx.patchModuleInstances$.next([...ctx.patchModuleInstances$.value, instance]);
        return instance.id as number;
      }),
      catchError(err => {
        console.error('Failed to auto-create instance:', err);
        return EMPTY as Observable<number>;
      })
    );
  }

  if (existingInstances.length === 1) {
    return forkJoin({
      relabeled: relabelExistingInstance$(ctx, deps, existingInstances, module.id, '(1)'),
      newInstance: deps.backend.add.patchModuleInstance(patch.id, module.id, '(2)') as Observable<PatchModuleInstance>
    }).pipe(
      tap(({newInstance}) => {
        ctx.patchModuleInstances$.next([...ctx.patchModuleInstances$.value, newInstance]);
        renumberModuleInstances$(ctx, deps, module.id).subscribe();
      }),
      map(({newInstance}) => newInstance.id as number),
      catchError(err => {
        console.error('Failed to jumpstart instances:', err);
        return EMPTY as Observable<number>;
      })
    );
  }

  const nextLabel = `(${ existingInstances.length + 1 })`;
  return (deps.backend.add.patchModuleInstance(patch.id, module.id, nextLabel) as Observable<PatchModuleInstance>).pipe(
    tap(instance => {
      ctx.patchModuleInstances$.next([...ctx.patchModuleInstances$.value, instance]);
      renumberModuleInstances$(ctx, deps, module.id).subscribe();
    }),
    map(instance => instance.id as number),
    catchError(err => {
      console.error('Failed to add instance copy:', err);
      return EMPTY as Observable<number>;
    })
  );
}

export function relabelExistingInstance$(
  ctx: PatchDetailDataContext,
  deps: PatchDetailDataDependencies,
  existingInstances: PatchModuleInstance[],
  moduleId: number,
  newLabel: string
) {
  const first = existingInstances.find(i => i.module_id === moduleId);
  if (!first || first.instance_label === newLabel) { return of(null); }
  return deps.backend.update.patchModuleInstanceLabel(first.id, newLabel).pipe(
    tap(_ => {
      const current = ctx.patchModuleInstances$.value;
      const idx = current.findIndex(i => i.id === first.id);
      if (idx >= 0) {
        current[idx] = {...current[idx], instance_label: newLabel};
        ctx.patchModuleInstances$.next([...current]);
      }
    }),
    catchError(err => {
      console.error('Failed to relabel instance:', err);
      return of(null);
    })
  );
}

export function renumberModuleInstances$(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies, moduleId: number): Observable<null> {
  const all = ctx.patchModuleInstances$.value;
  const moduleInstances = all.filter(i => i.module_id === moduleId).sort((a, b) => a.id - b.id);

  if (moduleInstances.length <= 1) {
    const single = moduleInstances[0];
    if (single && single.instance_label != null) {
      return deps.backend.update.patchModuleInstanceLabel(single.id, null).pipe(
        tap(() => {
          const idx = all.findIndex(i => i.id === single.id);
          if (idx >= 0) {
            const updated = [...all];
            updated[idx] = {...updated[idx], instance_label: null};
            ctx.patchModuleInstances$.next(updated);
          }
        }),
        map(() => null),
        catchError(err => {
          console.error('Failed to clear instance label:', err);
          return of(null);
        })
      );
    }
    return of(null);
  }

  const updates: { instance: PatchModuleInstance; newLabel: string }[] = [];
  moduleInstances.forEach((inst, idx) => {
    const expectedLabel = `(${ idx + 1 })`;
    if (inst.instance_label !== expectedLabel) {
      updates.push({instance: inst, newLabel: expectedLabel});
    }
  });

  if (updates.length === 0) { return of(null); }

  return forkJoin(
    updates.map(u => deps.backend.update.patchModuleInstanceLabel(u.instance.id, u.newLabel).pipe(
      catchError(err => {
        console.error(`Failed to renumber instance ${ u.instance.id }:`, err);
        return of(null);
      })
    ))
  ).pipe(
    tap(() => {
      const current = ctx.patchModuleInstances$.value.map(inst => {
        const update = updates.find(u => u.instance.id === inst.id);
        return update ? {...inst, instance_label: update.newLabel} : inst;
      });
      ctx.patchModuleInstances$.next(current);
    }),
    map(() => null)
  );
}

function confirmModuleInstanceRemoval$(
  ctx: PatchDetailDataContext,
  dialog: MatDialog,
  snackBar: MatSnackBar,
  instance: PatchModuleInstance
): Observable<PatchModuleInstance> {
  const connections = ctx.editorConnections$.value || [];
  const connCount = connections.filter(
    c => c.instance_id_a === instance.id || c.instance_id_b === instance.id
  ).length;

  if (connCount > 0) {
    const dialogData: ConfirmDialogDataInModel = {
      title: 'Remove this copy?',
      description: `This copy has ${ connCount } connection${ connCount > 1 ? 's' : '' } that will be disconnected.`,
      positive: {label: 'Remove', theme: 'warning'}
    };
    return dialog.open(ConfirmDialogComponent, {
      data: dialogData,
      disableClose: false,
      width: '32rem'
    }).afterClosed().pipe(
      tap((result: ConfirmDialogDataOutModel) => {
        if (!result?.answer) SharedConstants.infoCustom(snackBar, 'No changes made.');
      }),
      filter((result: ConfirmDialogDataOutModel) => result?.answer === true),
      map(() => instance)
    );
  }

  return of(instance);
}
