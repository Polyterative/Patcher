import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ElementRef, Injectable } from '@angular/core';
import {
  EMPTY,
  Observable
} from 'rxjs';
import {
  catchError,
  tap
} from 'rxjs/operators';
import { RackedModule } from '../../models/module';
import { Rack } from '../../models/rack';
import { SharedConstants } from '../../shared-interproject/SharedConstants';
import { isBlankModule } from './rack-blank-module.constants';
import { RackDetailDataContext } from './rack-detail-data.service.types';
import { cloneRackData } from './rack-detail-data.utils';
import {
  computeLayoutAnalysis,
  RackLayoutScope
} from './rack-layout-analysis.utils';

@Injectable()
export class RackDetailLayoutOperationsService {
  private layoutRemixVariant = 0;

  applyLayoutVariantAction(
    context: RackDetailDataContext,
    rackModules: RackedModule[][] | null,
    rack: Rack | undefined,
    layoutScope: RackLayoutScope,
    action: 'remix' | 'shuffle'
  ): Observable<unknown> {
    if (!rack || !rackModules) {
      SharedConstants.errorCustom(context.snackBar, `Rack data is still loading. Try ${ action === 'shuffle' ? 'shuffling' : 'remixing' } again in a moment.`);
      return EMPTY;
    }

    const startVariant = action === 'shuffle'
      ? this.randomLayoutVariant(rackModules)
      : this.layoutRemixVariant;
    const analysis = computeLayoutAnalysis(rackModules, rack.hp, layoutScope, {
      variant: startVariant
    });
    if (analysis.mixedRowIssues.length > 0) {
      SharedConstants.errorCustom(context.snackBar, 'Fix mixed-format rows before remixing.');
      return EMPTY;
    }

    const candidate = this.findLayoutRemixCandidate(rackModules, rack.hp, rack.rows, layoutScope, startVariant);
    if (!candidate && !analysis.autoArrangeMoves.some(move => move.toRow < 0 || move.toRow >= rack.rows)) {
      SharedConstants.infoCustom(context.snackBar, action === 'shuffle'
        ? 'No shuffled alternative is available for this scope.'
        : 'This rack is already arranged as tightly as Remix can make it.');
      return EMPTY;
    }

    if (!candidate) {
      SharedConstants.infoCustom(context.snackBar, 'Remix needs another row for these modules. Add a row, then try again.');
      return EMPTY;
    }

    const snapshot: RackedModule[][] = cloneRackData(rackModules);
    const nextRackModules = this.buildRemixedRackRows(rackModules, candidate.analysis.autoArrangeMoves, rack.rows);
    this.updateRackRowCoordinates(nextRackModules, rack.rows);
    context.rowedRackedModules$.next(nextRackModules);

    return context.callBackendToUpdateModulesOfRack(nextRackModules, rack).pipe(
      tap(() => {
        this.layoutRemixVariant = candidate.nextVariant;
        context.analytics.capture(action === 'shuffle' ? 'rack.layout_shuffled' : 'rack.layout_remixed', {
          rack_id: rack.id,
          moved_count: candidate.changedMoves.length
        });
        context.showUndoSnackBar(
          `${ action === 'shuffle' ? 'Shuffled' : 'Remixed' } ${ candidate.changedMoves.length } module${ candidate.changedMoves.length === 1 ? '' : 's' }.`,
          () => context.restoreRackLayout$(snapshot),
          'Previous layout restored.',
          10000
        );
      }),
      catchError((err) => {
        console.error(`Error ${ action === 'shuffle' ? 'shuffling' : 'remixing' } rack layout: ${ err }`);
        context.rowedRackedModules$.next(context.withCurrentRackModuleOrientations(snapshot));
        SharedConstants.errorCustom(context.snackBar, `Failed to ${ action } layout — changes reverted. Check your connection and try again.`);
        return EMPTY;
      })
    );
  }

  transferInRow(rackedModules: RackedModule[][], row: number, event: CdkDragDrop<ElementRef>): void {
    this.updateModulesColumnIds(rackedModules, row);
    moveItemInArray(rackedModules[row], event.previousIndex, event.currentIndex);
    this.updateModulesColumnIds(rackedModules, row);
  }

  updateModulesColumnIds(rackModules: RackedModule[][], row: number | undefined): void {
    if (row === undefined) {
      return undefined;
    }

    const modulesInRow: RackedModule[] | undefined = rackModules[row];

    if (modulesInRow) {
      modulesInRow.forEach((module, index) => {
        module.rackingData.column = index;
        module.rackingData.row = row;
      });
    }
  }

  updateRackRowCoordinates(rackModules: RackedModule[][], rowCount: number): void {
    for (let row = 0; row < rowCount; row++) {
      this.updateModulesColumnIds(rackModules, row);
    }
  }

  transferBetweenRows(
    rackedModules: RackedModule[][],
    rackedModule: RackedModule,
    event: CdkDragDrop<ElementRef>,
    newRow: number
  ): void {
    this.removeRackedModuleFromRack(rackedModules, rackedModule);
    rackedModules[newRow].splice(event.currentIndex, 0, rackedModule);
    this.updateModulesColumnIds(rackedModules, newRow);
  }

  removeRackedModuleFromRack(rackedModules: RackedModule[][], toRemove: RackedModule): void {
    this.updateModulesColumnIds(rackedModules, toRemove.rackingData.row);

    const modulesOfRow: RackedModule[] | undefined = rackedModules[toRemove.rackingData.row];
    if (modulesOfRow) {
      modulesOfRow.splice(toRemove.rackingData.column, 1);
    } else {
      const lastRow: RackedModule[] = rackedModules[rackedModules.length - 1];
      const unrackedModuleRowIndex: number = lastRow.findIndex(module => module.rackingData.id === toRemove.rackingData.id);
      lastRow.splice(unrackedModuleRowIndex, 1);

      if (lastRow.length === 0) {
        rackedModules.splice(rackedModules.length - 1, 1);
      }
    }

    this.updateModulesColumnIds(rackedModules, toRemove.rackingData.row);
  }

  duplicateModule(rackedModules: RackedModule[][], rackedModule: RackedModule): void {
    const deepCopiedRackedModule: RackedModule = cloneRackData(rackedModule);

    deepCopiedRackedModule.rackingData.id = undefined;

    const moduleRow: RackedModule[] = rackedModules[deepCopiedRackedModule.rackingData.row];

    if (moduleRow) {
      const sourceIndex = moduleRow.findIndex(module => module.rackingData.id === rackedModule.rackingData.id);
      const columnCoordinate: number = (sourceIndex >= 0 ? sourceIndex : deepCopiedRackedModule.rackingData.column) + 1;
      moduleRow.splice(
        columnCoordinate, 0, deepCopiedRackedModule
      );
    } else {
      rackedModules[rackedModules.length - 1].push(deepCopiedRackedModule);
    }
    this.updateModulesColumnIds(rackedModules, deepCopiedRackedModule.rackingData.row);
  }

  private buildRemixedRackRows(
    rackModules: RackedModule[][],
    moves: ReturnType<typeof computeLayoutAnalysis>['autoArrangeMoves'],
    rowCount: number
  ): RackedModule[][] {
    const moveByRackedId = new Map(
      moves
        .filter(move => move.rackedModuleId != null)
        .map(move => [move.rackedModuleId, move])
    );
    const moveByModuleId = new Map(moves.map(move => [move.moduleId, move]));
    const nextRows: RackedModule[][] = Array.from({length: rowCount}, () => []);

    rackModules.flat().forEach(module => {
      if (isBlankModule(module.module.id)) {
        const row = module.rackingData.row;
        if (row != null && row >= 0 && row < rowCount) {
          nextRows[row].push(module);
        }
        return;
      }

      const move = module.rackingData.id != null
        ? moveByRackedId.get(module.rackingData.id)
        : moveByModuleId.get(module.module.id);
      const targetRow = move?.toRow ?? module.rackingData.row;
      if (targetRow == null || targetRow < 0 || targetRow >= rowCount) {
        return;
      }

      nextRows[targetRow].push(module);
    });

    nextRows.forEach(row => row.sort((left, right) => {
      const leftOrder = (left.rackingData.id != null
        ? moveByRackedId.get(left.rackingData.id)?.toColumn
        : moveByModuleId.get(left.module.id)?.toColumn) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = (right.rackingData.id != null
        ? moveByRackedId.get(right.rackingData.id)?.toColumn
        : moveByModuleId.get(right.module.id)?.toColumn) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    }));

    return nextRows;
  }

  private findLayoutRemixCandidate(
    rackModules: RackedModule[][],
    rackHp: number,
    rackRows: number,
    layoutScope: RackLayoutScope,
    startVariant = this.layoutRemixVariant
  ): {analysis: ReturnType<typeof computeLayoutAnalysis>; changedMoves: ReturnType<typeof computeLayoutAnalysis>['autoArrangeMoves']; nextVariant: number} | null {
    const moduleCount = rackModules.flat().filter(module => !isBlankModule(module.module.id)).length;
    const candidateCount = Math.max(moduleCount + 3, 6);

    for (let offset = 0; offset < candidateCount; offset += 1) {
      const variant = startVariant + offset;
      const analysis = computeLayoutAnalysis(rackModules, rackHp, layoutScope, {variant});
      const changedMoves = analysis.autoArrangeMoves.filter(move =>
        move.fromRow !== move.toRow || move.fromColumn !== move.toColumn
      );
      const requiresUnavailableRow = analysis.autoArrangeMoves.some(move => move.toRow < 0 || move.toRow >= rackRows);

      if (changedMoves.length > 0 && !requiresUnavailableRow) {
        return {
          analysis,
          changedMoves,
          nextVariant: variant + 1
        };
      }
    }

    return null;
  }

  private randomLayoutVariant(rackModules: RackedModule[][]): number {
    const moduleCount = rackModules.flat().filter(module => !isBlankModule(module.module.id)).length;
    const variantWindow = Math.max(moduleCount * 12, 12);
    return this.layoutRemixVariant + 1 + Math.floor(Math.random() * variantWindow);
  }
}
