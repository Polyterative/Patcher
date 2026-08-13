import { Injectable } from '@angular/core';
import { EMPTY } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  exhaustMap,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { Rack } from '../../models/rack';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import {
  extractCreatedPatchId,
  extractCreatedPublicId
} from './rack-detail-data.utils';
import {
  isLinkedRackSchemaMissingError,
  LINKED_RACK_PENDING_CREATE_MESSAGE
} from '../patch-parts/linked-rack-rollout';
import { generatePatchName } from '../patch-parts/patch-name-generator';
import { RackDetailDataContext } from './rack-detail-data.service.types';

@Injectable()
export class RackDetailEditingDataService {
  bind(context: RackDetailDataContext): void {
    context.requestRackPrivacyStatusChange$
      .pipe(
        withLatestFrom(context.singleRackData$),
        map(([_, x]) => {
          const previousPublic = x.public;
          x.public = !x.public;
          context.isCurrentRackPrivate$.next(!x.public);
          return {rack: x, previousPublic};
        }),
        exhaustMap(({rack, previousPublic}) => context.backend.update.rack(rack).pipe(
          catchError(err => {
            console.error('Failed to toggle rack privacy:', err);
            if (context.singleRackData$.value) {
              context.singleRackData$.value.public = previousPublic;
            }
            context.isCurrentRackPrivate$.next(!previousPublic);
            SharedConstants.errorCustom(context.snackBar, 'Failed to update privacy — check your connection and try again.');
            return EMPTY;
          })
        )),
        context.takeUntilDestroyed()
      )
      .subscribe(() => {
        context.analytics.capture('rack.privacy_toggled', { rack_id: context.singleRackData$.value?.id, public: context.singleRackData$.value?.public });
      });

    context.requestRackEditableStatusChange$
      .pipe(
        withLatestFrom(context.singleRackData$, context.isCurrentRackEditable$),
        map(([_, x, y]) => {
          const previousEditable = y;
          const previousName = x.name;
          const editable: boolean = !y;
          if (editable) {
            context.formData.name.control.reset(x.name, {emitEvent: false});
          }
          context.isCurrentRackEditable$.next(editable);
          x.locked = !editable;
          return {rack: x, previousEditable, previousName};
        }),
        switchMap(({rack, previousEditable, previousName}) => context.backend.update.rack(rack).pipe(
          catchError(err => {
            console.error('Failed to toggle rack edit lock:', err);
            if (context.singleRackData$.value) {
              context.singleRackData$.value.locked = !previousEditable;
            }
            context.isCurrentRackEditable$.next(previousEditable);
            if (!previousEditable) {
              // toggle was entering edit mode and reset the name control — revert that too
              context.formData.name.control.reset(previousName, {emitEvent: false});
            }
            SharedConstants.errorCustom(context.snackBar, 'Failed to update edit lock — check your connection and try again.');
            return EMPTY;
          })
        )),
        context.takeUntilDestroyed()
      )
      .subscribe(() => {
        context.analytics.capture('rack.lock_toggled', { rack_id: context.singleRackData$.value?.id, locked: context.singleRackData$.value?.locked });
      });

    context.requestCreatePatchFromRack$
      .pipe(
        withLatestFrom(context.singleRackData$, context.isCurrentRackPropertyOfCurrentUser$),
        switchMap(([_, rack, isOwner]) => {
          if (!rack) {
            SharedConstants.errorCustom(context.snackBar, 'Rack data is still loading. Try again in a moment.');
            return EMPTY;
          }

          if (!isOwner) {
            SharedConstants.errorCustom(context.snackBar, 'Only the rack owner can start a linked patch from this rack.');
            return EMPTY;
          }

          return context.askForConfirmationWhenCreatingPatchFromRack(rack);
        }),
        switchMap((rack) => {
          const generatedPatchName = generatePatchName();
          context.snackBar.open(`Creating "${ generatedPatchName }"…`, undefined);

          return context.backend.add.patch({
            name: generatedPatchName,
            public: true,
            linked_rack_id: rack.id
          }).pipe(
            map((response) => ({
              rack,
              generatedPatchName,
              createdPatchId: extractCreatedPatchId(response),
              createdPatchPublicId: extractCreatedPublicId(response)
            })),
            catchError((error) => {
              if (isLinkedRackSchemaMissingError(error)) {
                SharedConstants.errorCustom(context.snackBar, LINKED_RACK_PENDING_CREATE_MESSAGE);
              } else {
                console.error('Failed to create linked patch from rack:', error);
                SharedConstants.errorCustom(context.snackBar, 'Patch creation failed — check your connection and try again.');
              }

              return EMPTY;
            })
          );
        }),
        context.takeUntilDestroyed()
      )
      .subscribe(({rack, generatedPatchName, createdPatchId, createdPatchPublicId}) => {
        context.analytics.capture('rack.linked_patch_created', { rack_id: rack?.id, patch_id: createdPatchId });
        const target = createdPatchPublicId
          ? ['/patches', createdPatchPublicId]
          : ['/patches/details', createdPatchId];
        context.router.navigate(target);
        SharedConstants.successCustom(context.snackBar, `"${ generatedPatchName }" is ready with "${ rack.name }" linked.`);
      });

    context.formData.name.control.valueChanges
      .pipe(
        filter(() => !!context.singleRackData$.value),
        filter(() => context.formData.name.control.valid),
        context.takeUntilDestroyed()
      )
      .subscribe(input => context.singleRackData$.value.name = input ?? '');

    context.formData.name.control.valueChanges
      .pipe(
        debounceTime(800),
        distinctUntilChanged(),
        withLatestFrom(context.singleRackData$),
        filter(([_, rack]) => !!rack),
        map(([_, rack]) => rack as Rack),
        filter(() => context.formData.name.control.valid),
        switchMap(rack =>
          context.backend.update.rack({...rack}).pipe(
            tap(() => context.analytics.capture('rack.name_changed', { rack_id: rack?.id })),
            catchError(err => {
              console.error('Failed to auto-save rack name:', err);
              SharedConstants.errorCustom(context.snackBar, 'Failed to save — check your connection and try again.');
              return EMPTY;
            })
          )
        ),
        context.takeUntilDestroyed()
      )
      .subscribe();
  }
}
