import { EMPTY, merge, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, exhaustMap, filter, map, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { ConfirmDialogComponent, ConfirmDialogDataInModel, ConfirmDialogDataOutModel } from 'src/app/shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { PatchDetailDataContext, PatchDetailDataDependencies } from './patch-detail-data.context.types';

export function bindRemovePatchFromCollection(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.removePatchFromCollection$
    .pipe(
      exhaustMap(x => deps.backend.delete.userPatch(x)),
      withLatestFrom(ctx.updateSinglePatchData$),
      takeUntil(ctx.destroy$)
    )
    .subscribe(([_a, b]) => {
      deps.analytics.capture('patch.collection_removed', { patch_id: ctx.singlePatchData$.value?.id });
      const patchName = ctx.singlePatchData$.value?.name;
      deps.snackBar.open(`"${ patchName }" removed from your library.`, undefined, {duration: 2000, panelClass: 'snack-success'});
      ctx.updateSinglePatchData$.next(b);
    });
}

export function bindPatchPrivacyToggle(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.requestPatchPrivacyStatusChange$
    .pipe(
      withLatestFrom(ctx.singlePatchData$),
      map(([_, patch]) => {
        const previousPublic = patch.public;
        patch.public = !patch.public;
        ctx.isCurrentPatchPrivate$.next(!patch.public);
        return {patch: {...patch}, previousPublic};
      }),
      exhaustMap(({patch, previousPublic}) => deps.backend.update.patch(patch).pipe(
        tap(() => {
          const msg = patch.public
            ? `"${ patch.name }" is now public — visible to everyone.`
            : `"${ patch.name }" is now private — only you can see it.`;
          SharedConstants.successCustom(deps.snackBar, msg);
          deps.analytics.capture('patch.privacy_toggled', { patch_id: patch?.id, public: patch.public });
        }),
        catchError(err => {
          console.error('Failed to toggle patch privacy:', err);
          if (ctx.singlePatchData$.value) {
            ctx.singlePatchData$.value.public = previousPublic;
          }
          ctx.isCurrentPatchPrivate$.next(!previousPublic);
          SharedConstants.errorCustom(deps.snackBar, 'Failed to update privacy — check your connection and try again.');
          return EMPTY;
        })
      )),
      takeUntil(ctx.destroy$)
    )
    .subscribe();
}

export function bindPatchEditingToggle(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.requestPatchEditingToggle$
    .pipe(
      withLatestFrom(ctx.patchEditingPanelOpenState$),
      takeUntil(ctx.destroy$)
    )
    .subscribe(([_, current]) => {
      const opened = !current;
      ctx.patchEditingPanelOpenState$.next(opened);
      deps.analytics.capture('patch.editing_toggled', { patch_id: ctx.singlePatchData$.value?.id, opened });
    });
}

export function bindPatchMetadataControls(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.formData.name.control.valueChanges
    .pipe(
      filter(_ => !!ctx.singlePatchData$.value),
      filter(_ => ctx.formData.name.control.valid),
      takeUntil(ctx.destroy$)
    )
    .subscribe(input => ctx.singlePatchData$.value.name = input);

  ctx.formData.description.control.valueChanges
    .pipe(
      filter(_ => !!ctx.singlePatchData$.value),
      filter(_ => ctx.formData.description.control.valid),
      filter(_ => !!ctx.formData.description.control.value || ctx.formData.description.control.value === ''),
      takeUntil(ctx.destroy$)
    )
    .subscribe(input => ctx.singlePatchData$.value.description = input);

  merge(
    ctx.formData.name.control.valueChanges,
    ctx.formData.description.control.valueChanges
  ).pipe(
    debounceTime(800),
    distinctUntilChanged(),
    withLatestFrom(ctx.singlePatchData$),
    filter(([_, patch]) => !!patch),
    filter(() => ctx.formData.name.control.valid && ctx.formData.description.control.valid),
    switchMap(([_, patch]) =>
      deps.backend.update.patchSilent({...patch}).pipe(
        tap(() => deps.analytics.capture('patch.metadata_saved', { patch_id: patch.id })),
        catchError(err => {
          console.error('Failed to auto-save patch metadata:', err);
          SharedConstants.errorCustom(deps.snackBar, 'Failed to save — check your connection and try again.');
          return EMPTY;
        })
      )
    ),
    takeUntil(ctx.destroy$)
  ).subscribe();
}

export function bindPatchDelete(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.deletePatch$
    .pipe(
      switchMap(_ => {
        const data: ConfirmDialogDataInModel = {
          title: 'Delete this patch?',
          description: 'This action cannot be undone. All connections associated with this patch will also be deleted.',
          positive: {
            label: 'Delete',
            theme: 'warning'
          }
        };
        return deps.dialog.open(
          ConfirmDialogComponent,
          {
            data,
            disableClose: false,
            width: '32rem'
          }
        )
          .afterClosed()
          .pipe(
            tap((x: ConfirmDialogDataOutModel) => {
              if (!x?.answer) SharedConstants.infoCustom(deps.snackBar, 'No changes made.');
            }),
            filter((x: ConfirmDialogDataOutModel) => !!x?.answer));
      }),
      withLatestFrom(ctx.deletePatch$),
      switchMap(([_z, x]) =>
        deps.backend.delete.patchConnectionsForPatch(x).pipe(
          switchMap(() => deps.backend.delete.patchModuleInstancesForPatch(x)),
          switchMap(() => deps.backend.delete.patch(x)),
          map(() => x),
          catchError(err => {
            console.error('Failed to delete patch:', err);
            SharedConstants.errorCustom(deps.snackBar, 'Failed to delete patch — check your connection and try again.');
            return EMPTY;
          })
        )
      ),
      takeUntil(ctx.destroy$)
    )
    .subscribe(_ => {
      deps.analytics.capture('patch.deleted', { patch_id: ctx.singlePatchData$.value?.id });
      deps.router.navigate(['/user/area']);
    });
}

export function bindPatchTagsAutoSave(
  ctx: PatchDetailDataContext,
  deps: PatchDetailDataDependencies,
  tagsUpdate$: Subject<string[]>
): void {
  tagsUpdate$
    .pipe(
      switchMap(tags => {
        const patch = ctx.singlePatchData$.value;
        if (!patch) { return EMPTY; }
        return deps.backend.update.patchTags(patch.id, tags).pipe(
          tap(() => deps.analytics.capture('patch.tags_saved', { patch_id: patch.id, tag_count: tags.length })),
          catchError(err => {
            console.error('Failed to save tags:', err);
            SharedConstants.errorCustom(deps.snackBar, 'Failed to save tags — check your connection.');
            return EMPTY;
          })
        );
      }),
      takeUntil(ctx.destroy$)
    )
    .subscribe();
}

export function addPatchTag(
  ctx: PatchDetailDataContext,
  analytics: PatchDetailDataDependencies['analytics'],
  tagsUpdate$: Subject<string[]>,
  tag: string
): void {
  const trimmed = tag.trim();
  if (!trimmed) { return; }
  const current = ctx.patchTags$.value;
  if (current.includes(trimmed)) { return; }
  const next = [...current, trimmed];
  ctx.patchTags$.next(next);
  if (ctx.singlePatchData$.value) {
    ctx.singlePatchData$.value.tags = next;
  }
  analytics.capture('patch.tag_added', { patch_id: ctx.singlePatchData$.value?.id, tag_count: next.length });
  tagsUpdate$.next(next);
}

export function removePatchTag(
  ctx: PatchDetailDataContext,
  analytics: PatchDetailDataDependencies['analytics'],
  tagsUpdate$: Subject<string[]>,
  tag: string
): void {
  const next = ctx.patchTags$.value.filter(t => t !== tag);
  ctx.patchTags$.next(next);
  if (ctx.singlePatchData$.value) {
    ctx.singlePatchData$.value.tags = next;
  }
  analytics.capture('patch.tag_removed', { patch_id: ctx.singlePatchData$.value?.id, tag_count: next.length });
  tagsUpdate$.next(next);
}
