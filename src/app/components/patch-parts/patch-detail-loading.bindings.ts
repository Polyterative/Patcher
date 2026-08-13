import { EMPTY, of } from 'rxjs';
import { catchError, filter, map, pairwise, switchMap, take, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { PatchConnection } from '../../models/connection';
import { shouldCaptureCanonicalDetailView } from '../detail-analytics-surface';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { MultiInstanceModuleSummary } from './patch-detail-data.models';
import { PatchDetailDataContext, PatchDetailDataDependencies } from './patch-detail-data.context.types';
import { groupInstancesByModuleId } from './patch-detail-data.utils';
type PublicReadAccess = {
  isPublicDetailMode: () => boolean;
  buildUnavailableMessage: () => string;
};

export function bindPatchLoadByNumericId(
  ctx: PatchDetailDataContext,
  deps: PatchDetailDataDependencies,
  access: PublicReadAccess
): void {
  ctx.updateSinglePatchData$
    .pipe(
      tap(() => {
        ctx.patchConnections$.next(null);
        ctx.editorConnections$.next(null);
        ctx.patchModuleInstances$.next([]);
        ctx.singlePatchData$.next(undefined);
        ctx.patchDetailUnavailableMessage$.next(null);
        deps.backend.cacheResetter$.next(['patchModuleInstances', 'rackWithId']);
      }),
      withLatestFrom(ctx.detailAnalyticsSurface$),
      switchMap(([x, surface]) => (access.isPublicDetailMode()
        ? deps.backend.GET.publicPatchWithId(x)
        : deps.backend.get.patchWithId(x)
      ).pipe(
        map(result => ({result, surface})),
        catchError(() => of({result: {data: undefined, error: null}, surface}))
      )
      ),
      takeUntil(ctx.destroy$)
    )
    .subscribe(({result, surface}) => {
      const patch = result?.data ?? undefined;
      ctx.singlePatchData$.next(patch);
      if (patch && shouldCaptureCanonicalDetailView(surface)) {
        deps.analytics.capture('patch.viewed', { patch_id: patch.id });
      }
      if (!patch) {
        ctx.patchDetailUnavailableMessage$.next(access.buildUnavailableMessage());
      }
    });
}

export function bindPatchLoadByPublicId(
  ctx: PatchDetailDataContext,
  deps: PatchDetailDataDependencies,
  access: PublicReadAccess
): void {
  ctx.updateSinglePatchByPublicId$
    .pipe(
      tap(() => {
        ctx.patchConnections$.next(null);
        ctx.editorConnections$.next(null);
        ctx.patchModuleInstances$.next([]);
        ctx.singlePatchData$.next(undefined);
        ctx.patchDetailUnavailableMessage$.next(null);
        deps.backend.cacheResetter$.next(['patchModuleInstances', 'rackWithId']);
      }),
      withLatestFrom(ctx.detailAnalyticsSurface$),
      switchMap(([token, surface]) => deps.backend.GET.patchByPublicId(token).pipe(
        map(result => ({result, surface})),
        catchError(() => of({result: {data: undefined, error: null}, surface}))
      )),
      takeUntil(ctx.destroy$)
    )
    .subscribe(({result, surface}) => {
      const patch = result?.data ?? undefined;
      ctx.singlePatchData$.next(patch);
      if (patch && shouldCaptureCanonicalDetailView(surface)) {
        deps.analytics.capture('patch.viewed', { patch_id: patch.id });
      }
      if (!patch) {
        ctx.patchDetailUnavailableMessage$.next(access.buildUnavailableMessage());
      }
    });
}

export function bindCurrentPatchPrivacyProjection(ctx: PatchDetailDataContext): void {
  ctx.singlePatchData$
    .pipe(
      filter(x => !!x),
      takeUntil(ctx.destroy$)
    )
    .subscribe(x => ctx.isCurrentPatchPrivate$.next(!x.public));
}

export function bindPatchFormHydration(ctx: PatchDetailDataContext): void {
  ctx.singlePatchData$
    .pipe(
      filter(_ => !!ctx.singlePatchData$.value),
      takeUntil(ctx.destroy$)
    )
    .subscribe(data => {
      ctx.formData.name.control.reset(data.name, {emitEvent: false});
      ctx.formData.description.control.reset(data.description ?? '', {emitEvent: false});
      ctx.patchTags$.next(data.tags ?? []);
    });
}

export function bindPatchConnectionsLoad(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.singlePatchData$
    .pipe(
      filter(x => !!x),
      switchMap(x => deps.backend.GET.patchConnections(x.id)),
      map((connections: PatchConnection[]) => connections?.map(c => ({
        ...c,
        instance_id_a: c.instance_id_a ?? undefined,
        instance_id_b: c.instance_id_b ?? undefined
      }))),
      takeUntil(ctx.destroy$)
    )
    .subscribe(data => ctx.patchConnections$.next(data));
}

export function bindOwnedPatchEditorOpen(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.singlePatchData$
    .pipe(
      filter(x => !!x),
      withLatestFrom(deps.backend.auth.getUserSession$()),
      filter(([patch, user]) => !!patch && !!user && patch.author.id === user.id),
      filter(([patch, user]) => !!patch && !!patch.id && user && !!user.id),
      take(1),
      takeUntil(ctx.destroy$)
    )
    .subscribe(([patch, user]) => {
      ctx.patchEditingPanelOpenState$.next(
        patch.author.id === user.id
      );
    });
}

export function bindEditorPanelCloseSelectionReset(ctx: PatchDetailDataContext): void {
  ctx.patchEditingPanelOpenState$
    .pipe(
      pairwise(),
      filter(([wasOpen, isOpen]) => wasOpen === true && isOpen === false),
      takeUntil(ctx.destroy$)
    )
    .subscribe(_ => ctx.resetSelectedForConnection$.next());
}

export function bindEditorPanelCloseRefresh(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.patchEditingPanelOpenState$
    .pipe(
      pairwise(),
      filter(x => x[0] === true && x[1] === false),
      filter(() => !!ctx.singlePatchData$.value),
      takeUntil(ctx.destroy$)
    )
    .subscribe(() => {
      deps.analytics.capture('patch.editing_panel_closed', { patch_id: ctx.singlePatchData$.value.id });
      ctx.updateSinglePatchData$.next(ctx.singlePatchData$.value.id);
    });
}

export function bindPatchModuleInstancesLoad(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.singlePatchData$
    .pipe(
      filter(x => !!x),
      switchMap(patch => deps.backend.GET.patchModuleInstances(patch.id).pipe(
        catchError(err => {
          console.error('Failed to load patch module instances:', err);
          SharedConstants.errorCustom(deps.snackBar, 'Failed to load module instances — check your connection and try again.');
          return EMPTY;
        })
      )),
      takeUntil(ctx.destroy$)
    )
    .subscribe(instances => ctx.patchModuleInstances$.next(instances));
}

export function bindInstanceLabelMapProjection(ctx: PatchDetailDataContext): void {
  ctx.patchModuleInstances$
    .pipe(
      map(instances => {
        const labelMap = new Map<number, string>();
        const byModule = groupInstancesByModuleId(instances);
        for (const [, moduleInstances] of byModule) {
          if (moduleInstances.length >= 2) {
            moduleInstances.forEach((inst, idx) => {
              labelMap.set(inst.id, inst.instance_label || `(${ idx + 1 })`);
            });
          }
        }
        return labelMap;
      }),
      takeUntil(ctx.destroy$)
    )
    .subscribe(labelMap => ctx.instanceLabelMap$.next(labelMap));
}

export function bindMultiInstanceSummaryProjection(ctx: PatchDetailDataContext): void {
  ctx.patchModuleInstances$
    .pipe(
      map(instances => {
        if (!instances.length) { return []; }
        const byModule = groupInstancesByModuleId(instances);
        const summary: MultiInstanceModuleSummary[] = [];
        for (const [moduleId, moduleInstances] of byModule) {
          if (moduleInstances.length >= 2) {
            const firstWithModule = moduleInstances.find(i => i.module?.name);
            summary.push({
              moduleId,
              moduleName: firstWithModule?.module?.name ?? `Module #${ moduleId }`,
              manufacturerName: firstWithModule?.module?.manufacturer?.name ?? '',
              instanceCount: moduleInstances.length,
              labels: moduleInstances
                .sort((a, b) => a.id - b.id)
                .map((inst, idx) => inst.instance_label || `(${ idx + 1 })`)
            });
          }
        }
        return summary;
      }),
      takeUntil(ctx.destroy$)
    )
    .subscribe(summary => ctx.multiInstanceSummary$.next(summary));
}
