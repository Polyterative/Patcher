import { Injectable } from '@angular/core';
import {
  EMPTY,
  Observable,
  of
} from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  take,
  tap,
  withLatestFrom
} from 'rxjs/operators';
import { Rack } from '../../models/rack';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from '../../shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import { buildUploadGuardrailAdvisory } from '../../shared-interproject/upload-guardrails/upload-guardrails';
import { RackDetailDataContext } from './rack-detail-data.service.types';

@Injectable()
export class RackDetailMediaImportDataService {
  bindMedia(context: RackDetailDataContext): void {
    context.downloadRackImageToUserComputer$.pipe(
      tap(() => context.snackBar.open('⏲️ Generating image...', undefined, {duration: 4000})),
      withLatestFrom(context.currentDownloadElementRef$),
      switchMap(([_, references]) => {
        return context.generateRackJpegWithoutAnalysisOverlays$(references.screen.nativeElement);
      }),
      withLatestFrom(context.singleRackData$),
      context.takeUntilDestroyed()
    )
      .subscribe(
        ([imageData, rackData]) => {
          const link = document.createElement('a');
          const downloadName = `${ rackData.name } by ${ rackData.author.username } - ${ rackData.hp } HP - ${ rackData.rows } rows - ${ new Date().toLocaleDateString() }`;
          link.download = `${ downloadName }.jpeg`;
          link.download = link.download.replace(/[/\\?%*:|"<>]/g, '-');
          link.href = imageData;
          link.click();
          link.remove();

          context.analytics.capture('rack.image_downloaded', { rack_id: rackData?.id });
          context.snackBar.open(`Image downloaded: ${  downloadName}`, undefined, {duration: 5000});
        }
      );

    context.updateRackImagePreview$.pipe(
      tap(() => context.snackBar.open('⏲️ Generating image: please wait, this can take a few moments...', undefined, {duration: 20000})),
      withLatestFrom(context.currentDownloadElementRef$),
      switchMap(([_, references]) => {
        return context.generateRackJpegWithoutAnalysisOverlays$(references.screen.nativeElement).pipe(
          map(imageData => {
            const byteCharacters = atob(imageData.split(',')[1]);
            const byteArray = new Uint8Array(Array.from(byteCharacters, c => c.charCodeAt(0)));
            return new Blob([byteArray], {type: 'image/jpeg'});
          })
        );
      }),
      withLatestFrom(context.singleRackData$, context.isCurrentRackPropertyOfCurrentUser$, context.isCurrentUserAdmin$),
      switchMap(([imageBlob, rackData, isOwner, isAdmin]) => {
        if (!isOwner && !isAdmin) {
          SharedConstants.errorCustom(context.snackBar, 'Only the rack owner or an admin can update the preview image.');
          return EMPTY;
        }
        const advisory = buildUploadGuardrailAdvisory('rack-preview', {
          byteSize: imageBlob.size,
          mimeType: imageBlob.type
        });
        if (!advisory.accepted) {
          SharedConstants.errorCustom(context.snackBar, advisory.summary);
          return EMPTY;
        }
        const fileName = `${ rackData.id }`;
        return context.backend.storage.uploadRackImage(imageBlob, `${ fileName }.jpeg`).pipe(
          switchMap(uploadResult => {
            const updatedRackData: Rack = {...rackData, image: uploadResult};
            const previousImage = rackData.image;
            return context.backend.update.rack(updatedRackData).pipe(
              map(() => ({updatedRackData, previousImage}))
            );
          })
        );
      }),
      switchMap(({updatedRackData, previousImage}): Observable<Rack> => {
        if (!previousImage) {
          return of(updatedRackData);
        }

        return context.backend.storage.deleteRackImage(previousImage).pipe(
          map(() => updatedRackData),
          catchError((error) => {
            const status = (error as {status?: number | string; statusCode?: number | string} | undefined)?.status
              ?? (error as {status?: number | string; statusCode?: number | string} | undefined)?.statusCode;
            const message = error instanceof Error
              ? error.message
              : String((error as {message?: unknown} | undefined)?.message ?? '');

            if (status === 404 || status === '404' || /not found/i.test(message)) {
              console.warn('Rack preview delete skipped because the previous image was already missing.', error);
              return of(updatedRackData);
            }

            throw error;
          })
        );
      }),
      tap((updatedRackData: Rack) => context.singleRackData$.next(updatedRackData)),
      catchError((err) => {
        console.error('Failed to update rack preview image:', err);
        SharedConstants.errorCustom(context.snackBar, 'Failed to update preview image. Please try again.');
        return EMPTY;
      }),
      context.takeUntilDestroyed()
    )
      .subscribe((updatedRackData: Rack) => {
        SharedConstants.successCustom(context.snackBar, `Preview image updated for "${ updatedRackData.name }".`);
        context.analytics.capture('rack.preview_image_updated', { rack_id: updatedRackData?.id });
      });
  }

  bindImport(context: RackDetailDataContext): void {
    context.deleteRack$
      .pipe(
        switchMap((rack) => {
          const data: ConfirmDialogDataInModel = {
            title: `Delete "${ rack.name }"?`,
            description: 'This action cannot be undone.',
            positive: {label: 'Delete', theme: 'warning'}
          };

          return context.dialog.open(
            ConfirmDialogComponent,
            {
              data,
              disableClose: false
            }
          )
            .afterClosed()
            .pipe(
              tap((x: ConfirmDialogDataOutModel) => {
                if (!x?.answer) SharedConstants.infoCustom(context.snackBar, 'No changes made.');
              }),
              filter((x: ConfirmDialogDataOutModel) => !!x?.answer),
              map(() => rack)
            );
        }),
        switchMap(rack => context.backend.delete.modulesOfRack(rack.id).pipe(map(() => rack))),
        switchMap(rack => context.backend.delete.commentsForRack(rack.id).pipe(map(() => rack))),
        switchMap(rack => rack.image ? context.backend.storage.deleteRackImage(rack.image).pipe(map(() => rack)) : of(rack)),
        switchMap(rack => context.backend.delete.userRack(rack.id).pipe(map(() => rack))),
        context.takeUntilDestroyed()
      )
      .subscribe((rack) => {
        context.router.navigate(['/user/area']);
        context.analytics.capture('rack.deleted', { rack_id: rack.id });
        SharedConstants.successCustom(context.snackBar, `"${ rack.name }" has been deleted.`);
      });

    context.duplicateRack$
      .pipe(
        switchMap(() => context.askForConfirmationWhenDuplicatingRack()),
        withLatestFrom(context.singleRackData$),
        tap(([_, rack]) => context.snackBar.open(`Duplicating "${ rack.name }"…`, undefined,)),
        map(([_, rack]) => rack),
        withLatestFrom(context.userService.loggedUser$),
        switchMap(([rack, user]) => {
          return context.createNewRackOnBackendForCurrentUser(user.id).pipe(
            map(x => ({newRackId: x.data[0].id, newRackPublicId: x.data[0].public_id, originalName: rack.name}))
          );
        }),
        switchMap(({newRackId, newRackPublicId, originalName}) => {
          const newUrl = newRackPublicId
            ? `/racks/${ newRackPublicId }`
            : `/racks/details/${ newRackId }`;
          history.replaceState({}, '', newUrl);

          const rackModules = context.removeInformationFromModulesOfCurrentRack(newRackId);

          if (newRackPublicId) {
            context.updateSingleRackByPublicId$.next(newRackPublicId);
          } else {
            context.updateSingleRackData$.next(newRackId);
          }
          return context.singleRackData$.pipe(
            filter(x => x.id === newRackId),
            take(1),
            map(() => ({rackModules, originalName})),
          );
        }),
        switchMap(({rackModules, originalName}) => context.callBackendToUpdateModulesOfRack(rackModules, context.singleRackData$.value).pipe(
          tap(() => context.rowedRackedModules$.next(rackModules)),
          map(() => originalName)
        )),
        context.takeUntilDestroyed()
      )
      .subscribe((originalName) => {
        const rackId = context.singleRackData$.value?.id;
        context.analytics.capture('rack.duplicated', { rack_id: rackId });
        SharedConstants.successCustom(context.snackBar, `"${ originalName }" duplicated successfully.`);
      });
  }
}
