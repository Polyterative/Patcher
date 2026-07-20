import { Injectable } from '@angular/core';
import {
  filter,
  map,
  tap
} from 'rxjs/operators';
import {
  ConfirmDialogComponent,
  ConfirmDialogDataInModel,
  ConfirmDialogDataOutModel
} from '../../shared-interproject/dialogs/confirm-dialog/confirm-dialog.component';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import { RackMinimal } from '../../models/rack';
import { RackedModule } from '../../models/module';
import { RackDetailDataContext } from './rack-detail-data.service.types';

@Injectable()
export class RackDetailCopyOperationsService {
  removeInformationFromModulesOfCurrentRack(
    context: RackDetailDataContext,
    newlyCreatedRackId: number
  ): RackedModule[][] {
    const rackModules: RackedModule[][] = context.rowedRackedModules$.value;

    rackModules.forEach(row => {
      row.forEach(module => {
        module.rackingData.rackid = newlyCreatedRackId;
        module.rackingData.id = undefined;
      });
    });
    return rackModules;
  }

  createNewRackOnBackendForCurrentUser(context: RackDetailDataContext, _userId: string) {
    return context.backend.add.rack(
      {
        name: this.bumpUpVersionInNameOfOfRack(context),
        hp: context.singleRackData$.value.hp,
        rows: context.singleRackData$.value.rows,
        public: true,
        locked: false
      }
    );
  }

  askForConfirmationWhenDuplicatingRack(context: RackDetailDataContext) {
    const data: ConfirmDialogDataInModel = {
      title: 'Duplicate this rack?',
      description: 'A copy of this rack will be created. You can rename and edit it afterwards.',
      positive: {label: 'Confirm'}
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
        filter((x: ConfirmDialogDataOutModel) => !!x?.answer)
      );
  }

  askForConfirmationWhenCreatingPatchFromRack(context: RackDetailDataContext, rack: RackMinimal) {
    const data: ConfirmDialogDataInModel = {
      title: `Start a patch from "${ rack.name }"?`,
      description: 'We will generate the name automatically, link this rack, and open the patch immediately so you can start working.',
      positive: {label: 'Create patch', theme: 'positive'}
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
          if (!x?.answer) SharedConstants.infoCustom(context.snackBar, 'No patch created.');
        }),
        filter((x: ConfirmDialogDataOutModel) => !!x?.answer),
        map(() => rack)
      );
  }

  bumpUpVersionInNameOfOfRack(context: RackDetailDataContext) {
    const originalName = context.singleRackData$.value.name;
    const versionRegex = /V(\d+)$/;
    const versionMatch = originalName.match(versionRegex);
    if (versionMatch) {
      const versionNumber = parseInt(versionMatch[1], 10);
      return originalName.replace(versionRegex, `V${ versionNumber + 1 }`);
    } else {
      return `${ originalName } V2`;
    }
  }
}
