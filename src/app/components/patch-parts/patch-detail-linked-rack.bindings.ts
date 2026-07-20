import { BehaviorSubject, combineLatest, EMPTY, Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, switchMap, takeUntil, tap, withLatestFrom } from 'rxjs/operators';
import { findAndApplyOptionForId, getCleanedValueId } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { Patch } from '../../models/patch';
import { Rack } from '../../models/rack';
import { DbModule, RackedModule } from '../../models/module';
import { LinkedRackPreviewState, PatchEditorSortStrategy } from './patch-editor/patch-editor.types';
import { buildLinkedRackPreviewState, defaultLinkedRackPreviewState } from './patch-editor/patch-editor.utils';
import { isLinkedRackSchemaMissingError, LINKED_RACK_PENDING_ENVIRONMENT_MESSAGE } from './linked-rack-rollout';
import { PatchDetailDataContext, PatchDetailDataDependencies } from './patch-detail-data.context.types';
import { buildLinkedRackUiState } from './patch-detail-data.utils';

type RackReadResponse = {
  data?: Rack | null;
};

type PublicReadAccess = {
  isPublicDetailMode: () => boolean;
};

export function bindCurrentUserRackOptions(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  combineLatestPatchAndUser(ctx, deps)
    .pipe(
      switchMap(([patch, user]) => patch && user && patch.author?.id === user.id
        ? deps.backend.get.currentUserRacks()
        : of([])
      ),
      takeUntil(ctx.destroy$)
    )
    .subscribe(racks => ctx.currentUserRacks$.next(racks));

  ctx.currentUserRacks$
    .pipe(takeUntil(ctx.destroy$))
    .subscribe(racks => {
      ctx.linkedRackOptions$.next(
        racks.map(rack => ({
          id: `${ rack.id }`,
          name: rack.name || `Rack #${ rack.id }`
        }))
      );
      syncLinkedRackControl(ctx, ctx.singlePatchData$.value, racks);
    });

  ctx.singlePatchData$
    .pipe(takeUntil(ctx.destroy$))
    .subscribe(patch => {
      syncLinkedRackControl(ctx, patch, ctx.currentUserRacks$.value);
    });
}

export function bindLinkedRackState(
  ctx: PatchDetailDataContext,
  deps: PatchDetailDataDependencies,
  access: PublicReadAccess
): void {
  combineLatestPatchRacksAndUser(ctx, deps)
    .pipe(
      switchMap(([patch, racks, user]) => {
        if (!patch || patch.linked_rack_id == null) {
          return of({linkedRack: null as Rack | null, isOwner: false, isLoggedIn: !!user});
        }

        const isOwner = !!user && patch.author?.id === user.id;
        const isLoggedIn = !!user;
        const ownedRack = racks.find(rack => rack.id === patch.linked_rack_id);
        if (ownedRack) {
          return of({linkedRack: ownedRack, isOwner, isLoggedIn});
        }

        if (isOwner) {
          return of({linkedRack: null as Rack | null, isOwner, isLoggedIn});
        }

        const rackRead$ = access.isPublicDetailMode() || !user
          ? deps.backend.GET.publicRackWithId(patch.linked_rack_id)
          : deps.backend.GET.rackWithId(patch.linked_rack_id);

        return rackRead$.pipe(
          map((response: RackReadResponse | null | undefined) => ({
            linkedRack: response?.data ?? null,
            isOwner,
            isLoggedIn
          })),
          catchError(() => of({linkedRack: null as Rack | null, isOwner, isLoggedIn}))
        );
      }),
      takeUntil(ctx.destroy$)
    )
    .subscribe(({linkedRack, isOwner, isLoggedIn}) => {
      ctx.linkedRackState$.next(
        buildLinkedRackUiState(ctx.singlePatchData$.value, ctx.currentUserRacks$.value, linkedRack, isOwner, isLoggedIn)
      );
    });
}

export function bindLinkedRackControlChanges(ctx: PatchDetailDataContext): void {
  ctx.formData.linkedRack.control.valueChanges
    .pipe(takeUntil(ctx.destroy$))
    .subscribe(() => ctx.requestLinkedRackChange$.next(getSelectedLinkedRackId(ctx)));
}

export function bindLinkedRackPersistence(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies): void {
  ctx.requestLinkedRackChange$
    .pipe(
      withLatestFrom(ctx.singlePatchData$),
      filter(([_, patch]) => !!patch),
      filter(() => !ctx.linkedRackSelectionBlocked$.value && !ctx.linkedRackPersistenceBlocked$.value),
      filter(([linkedRackId, patch]) => (patch?.linked_rack_id ?? null) !== linkedRackId),
      switchMap(([linkedRackId, patch]) => {
        const nextPatch: Patch = {
          ...patch!,
          linked_rack_id: linkedRackId
        };
        return deps.backend.update.patchSilent(nextPatch).pipe(
          tap(() => {
            deps.backend.cacheResetter$.next(['rackWithId']);
            setLinkedRackPersistenceBlocked(ctx, false, null);
            if (ctx.singlePatchData$.value) {
              ctx.singlePatchData$.value.linked_rack_id = linkedRackId;
            }
            ctx.linkedRackState$.next(buildLinkedRackUiState(nextPatch, ctx.currentUserRacks$.value));
            syncLinkedRackControl(ctx, nextPatch, ctx.currentUserRacks$.value);
            deps.analytics.capture('patch.linked_rack_changed', { patch_id: nextPatch?.id, rack_id: linkedRackId });
            const message = linkedRackId == null
              ? 'Linked rack cleared.'
              : 'Linked rack updated.';
            SharedConstants.successCustom(deps.snackBar, message);
          }),
          catchError(err => {
            syncLinkedRackControl(ctx, patch!, ctx.currentUserRacks$.value);
            if (isLinkedRackSchemaMissingError(err)) {
              setLinkedRackPersistenceBlocked(ctx, true, LINKED_RACK_PENDING_ENVIRONMENT_MESSAGE);
              SharedConstants.errorCustom(deps.snackBar, 'Linked rack saving is not available yet in this environment.');
            } else {
              SharedConstants.errorCustom(deps.snackBar, 'Failed to save linked rack — check your connection and try again.');
            }
            console.error('Failed to save linked rack:', err);
            return EMPTY;
          })
        );
      }),
      takeUntil(ctx.destroy$)
    )
    .subscribe();
}

export function bindLinkedRackSelectionBlocking(
  ctx: PatchDetailDataContext,
  connectionSyncPendingCount$: BehaviorSubject<number>
): void {
  combineLatest([
    ctx.patchEditingPanelOpenState$,
    ctx.selectedForConnection$,
    connectionSyncPendingCount$.pipe(
      map(count => count > 0),
      distinctUntilChanged()
    )
  ])
    .pipe(
      map(([isEditing, selection, hasPendingConnectionSync]) => {
        if (!isEditing) {
          return {blocked: false, hint: null as string | null};
        }

        if (hasPendingConnectionSync) {
          return {
            blocked: true,
            hint: 'Wait for pending connection changes to finish saving before switching the linked rack.'
          };
        }

        if (selection.a || selection.b) {
          return {
            blocked: true,
            hint: 'Finish or cancel the pending connection before switching the linked rack.'
          };
        }

        return {blocked: false, hint: null as string | null};
      }),
      distinctUntilChanged((previous, current) =>
        previous.blocked === current.blocked && previous.hint === current.hint
      ),
      takeUntil(ctx.destroy$)
    )
    .subscribe(({blocked, hint}) => setLinkedRackSelectionBlocked(ctx, blocked, hint));
}

export function clearLinkedRack(ctx: PatchDetailDataContext): void {
  ctx.requestLinkedRackChange$.next(null);
}

export function getRackPreviewUrl(baseUrl: string, filename: string): string {
  return `${ baseUrl }${ filename }`;
}

export function loadEditorCollectionModules$(
  deps: PatchDetailDataDependencies,
  strategy: PatchEditorSortStrategy
): Observable<DbModule[]> {
  return deps.backend.GET.currentUserModules(
    true,
    false,
    strategy.backendOrder
  ).pipe(
    map((modules: DbModule[]) => modules.filter(module => module.possessionKind !== 'WANTS'))
  );
}

export function loadLinkedRackPreview$(
  deps: PatchDetailDataDependencies,
  linkedRackId: number | null
): Observable<LinkedRackPreviewState> {
  if (linkedRackId == null) {
    return of(defaultLinkedRackPreviewState);
  }

  return deps.backend.auth.getUserSession$().pipe(
    switchMap(user => {
      const rackRead$ = user
        ? deps.backend.GET.rackWithId(linkedRackId)
        : deps.backend.GET.publicRackWithId(linkedRackId);

      return rackRead$.pipe(
        switchMap((response: {data?: Rack | null}) => {
          const rack = response?.data ?? undefined;
          if (!rack) {
            return of(buildLinkedRackPreviewState(undefined));
          }

          return deps.backend.get.rackedModules(linkedRackId).pipe(
            map((rackedModules: RackedModule[]) => buildLinkedRackPreviewState(rack, rackedModules)),
            catchError(() => of(buildLinkedRackPreviewState(undefined)))
          );
        }),
        catchError(() => of(buildLinkedRackPreviewState(undefined)))
      );
    })
  );
}

export function setLinkedRackPersistenceBlocked(ctx: PatchDetailDataContext, blocked: boolean, hint: string | null): void {
  ctx.linkedRackPersistenceBlocked$.next(blocked);
  ctx.linkedRackPersistenceHint$.next(hint);
  refreshLinkedRackControlAvailability(ctx);
}

export function setLinkedRackSelectionBlocked(ctx: PatchDetailDataContext, blocked: boolean, hint: string | null): void {
  ctx.linkedRackSelectionBlocked$.next(blocked);
  ctx.linkedRackSelectionHint$.next(hint);
  refreshLinkedRackControlAvailability(ctx);
}

function getSelectedLinkedRackId(ctx: PatchDetailDataContext): number | null {
  const selectedId = Number.parseInt(getCleanedValueId(ctx.formData.linkedRack.control), 10);
  return Number.isFinite(selectedId) ? selectedId : null;
}

function refreshLinkedRackControlAvailability(ctx: PatchDetailDataContext): void {
  const shouldDisable = ctx.linkedRackPersistenceBlocked$.value || ctx.linkedRackSelectionBlocked$.value;
  if (shouldDisable) {
    ctx.formData.linkedRack.control.disable({emitEvent: false});
    return;
  }

  ctx.formData.linkedRack.control.enable({emitEvent: false});
}

function syncLinkedRackControl(ctx: PatchDetailDataContext, patch: Patch | undefined, racks: Rack[]): void {
  ctx.formData.linkedRack.control.reset('', {emitEvent: false});
  if (patch?.linked_rack_id == null) {
    return;
  }

  const matchingRack = racks.find(rack => rack.id === patch.linked_rack_id);
  if (!matchingRack) {
    return;
  }

  const options = ctx.linkedRackOptions$.value;
  findAndApplyOptionForId(`${ matchingRack.id }`, ctx.formData.linkedRack.control, options);
}

function combineLatestPatchAndUser(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies) {
  return combineLatest([
    ctx.singlePatchData$,
    deps.backend.auth.getUserSession$()
  ]);
}

function combineLatestPatchRacksAndUser(ctx: PatchDetailDataContext, deps: PatchDetailDataDependencies) {
  return combineLatest([
    ctx.singlePatchData$,
    ctx.currentUserRacks$,
    deps.backend.auth.getUserSession$()
  ]);
}
