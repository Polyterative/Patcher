import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ElementRef } from '@angular/core';
import { RackedModule } from '../../models/module';
import { RackDetailLayoutOperationsService } from './rack-detail-layout-operations.service';

function rm(id: number | undefined, moduleId: number, row: number, column: number): RackedModule {
  return {
    module: {id: moduleId, name: `m${moduleId}`, hp: 4},
    rackingData: {id, row, column}
  } as unknown as RackedModule;
}

function drop(previousIndex: number, currentIndex: number): CdkDragDrop<ElementRef> {
  return {previousIndex, currentIndex} as CdkDragDrop<ElementRef>;
}

/** Every module's stored coordinates must match its actual position, and none may be lost. */
function expectConsistent(rows: RackedModule[][], label: string): void {
  rows.forEach((row, rowIndex) => row.forEach((module, columnIndex) => {
    expect(module.rackingData.row).withContext(`${label} row of #${module.rackingData.id}`).toBe(rowIndex);
    expect(module.rackingData.column).withContext(`${label} column of #${module.rackingData.id}`).toBe(columnIndex);
  }));
}

function ids(rows: RackedModule[][]): (number | undefined)[][] {
  return rows.map(row => row.map(module => module.rackingData.id));
}

describe('RackDetailLayoutOperationsService — row mutation invariants', () => {
  let service: RackDetailLayoutOperationsService;
  let rows: RackedModule[][];

  beforeEach(() => {
    service = new RackDetailLayoutOperationsService();
    rows = [
      [rm(1, 11, 0, 0), rm(2, 12, 0, 1), rm(3, 13, 0, 2)],
      [rm(4, 14, 1, 0), rm(5, 15, 1, 1)],
      []
    ];
  });

  describe('updateModulesColumnIds', () => {
    it('renumbers rows and columns of a single row only', () => {
      rows[0][0].rackingData.column = 9;
      rows[1][0].rackingData.column = 9;
      service.updateModulesColumnIds(rows, 0);
      expect(rows[0][0].rackingData.column).toBe(0);
      expect(rows[1][0].rackingData.column).toBe(9);
    });

    it('ignores undefined and out-of-range rows without throwing', () => {
      expect(() => service.updateModulesColumnIds(rows, undefined)).not.toThrow();
      expect(() => service.updateModulesColumnIds(rows, 99)).not.toThrow();
      expect(() => service.updateModulesColumnIds(rows, -1)).not.toThrow();
    });

    it('updateRackRowCoordinates renumbers every row up to the row count', () => {
      rows[0].reverse();
      rows[1].reverse();
      service.updateRackRowCoordinates(rows, 3);
      expectConsistent(rows, 'all rows');
    });

    it('updateRackRowCoordinates tolerates a row count larger than the data', () => {
      expect(() => service.updateRackRowCoordinates(rows, 10)).not.toThrow();
    });
  });

  describe('transferInRow', () => {
    it('moves forward and backward, keeping every id exactly once', () => {
      service.transferInRow(rows, 0, drop(0, 2));
      expect(ids(rows)[0]).toEqual([2, 3, 1]);
      service.transferInRow(rows, 0, drop(2, 0));
      expect(ids(rows)[0]).toEqual([1, 2, 3]);
      expectConsistent(rows, 'after round trip');
    });

    it('a no-op drop leaves order and coordinates unchanged', () => {
      service.transferInRow(rows, 0, drop(1, 1));
      expect(ids(rows)[0]).toEqual([1, 2, 3]);
      expectConsistent(rows, 'no-op');
    });

    it('heals stale coordinates before and after the move', () => {
      rows[0][1].rackingData.column = 42;
      service.transferInRow(rows, 0, drop(0, 1));
      expectConsistent(rows, 'stale heal');
    });
  });

  describe('transferBetweenRows', () => {
    it('moves a module to another row at the dropped index and fixes both coordinates', () => {
      const moved = rows[0][1];
      service.transferBetweenRows(rows, moved, drop(1, 1), 1);
      expect(ids(rows)).toEqual([[1, 3], [4, 2, 5], []]);
      expect(moved.rackingData.row).toBe(1);
      expectConsistent(rows, 'between rows');
    });

    it('can drop into an empty row', () => {
      service.transferBetweenRows(rows, rows[1][0], drop(0, 0), 2);
      expect(ids(rows)).toEqual([[1, 2, 3], [5], [4]]);
      expectConsistent(rows, 'into empty');
    });

    it('can drop at the end of a row', () => {
      service.transferBetweenRows(rows, rows[0][0], drop(0, 2), 1);
      expect(ids(rows)).toEqual([[2, 3], [4, 5, 1], []]);
      expectConsistent(rows, 'at end');
    });

    it('never loses or duplicates modules across a sequence of moves', () => {
      service.transferBetweenRows(rows, rows[0][0], drop(0, 0), 2);
      service.transferBetweenRows(rows, rows[1][1], drop(0, 0), 0);
      service.transferBetweenRows(rows, rows[2][0], drop(0, 1), 1);
      expect(ids(rows).flat().sort()).toEqual([1, 2, 3, 4, 5]);
      expectConsistent(rows, 'sequence');
    });
  });

  describe('removeRackedModuleFromRack', () => {
    it('removes the module and renumbers the remaining columns', () => {
      service.removeRackedModuleFromRack(rows, rows[0][1]);
      expect(ids(rows)[0]).toEqual([1, 3]);
      expectConsistent(rows, 'remove middle');
    });

    it('removes first and last positions', () => {
      service.removeRackedModuleFromRack(rows, rows[0][0]);
      service.removeRackedModuleFromRack(rows, rows[0][1]);
      expect(ids(rows)[0]).toEqual([2]);
      expectConsistent(rows, 'remove ends');
    });

    it('removing the only module leaves an empty row in place', () => {
      service.removeRackedModuleFromRack(rows, rows[1][0]);
      service.removeRackedModuleFromRack(rows, rows[1][0]);
      expect(rows[1]).toEqual([]);
      expect(rows.length).toBe(3);
    });

    it('trusts the live position over a stale stored column', () => {
      const target = rows[0][2];
      rows[0][0].rackingData.column = 2;
      rows[0][2].rackingData.column = 0;
      service.removeRackedModuleFromRack(rows, target);
      expect(ids(rows)[0]).toEqual([1, 2]);
    });

    it('removes an unracked module (row beyond the grid) from the last row and drops the emptied row', () => {
      const unracked = rm(99, 19, 7, 0);
      rows.push([unracked]);
      service.removeRackedModuleFromRack(rows, unracked);
      expect(rows.length).toBe(3);
      expect(ids(rows).flat().includes(99)).toBeFalse();
    });

    it('removing an unracked module keeps the last row when it still has other modules', () => {
      const unrackedA = rm(98, 18, 7, 0);
      const unrackedB = rm(99, 19, 7, 1);
      rows.push([unrackedA, unrackedB]);
      service.removeRackedModuleFromRack(rows, unrackedA);
      expect(rows.length).toBe(4);
      expect(ids(rows)[3]).toEqual([99]);
    });
  });

  describe('duplicateModule', () => {
    it('inserts a copy right after the source with a cleared id and consistent coordinates', () => {
      service.duplicateModule(rows, rows[0][1]);
      expect(ids(rows)[0]).toEqual([1, 2, undefined, 3]);
      expect(rows[0][2].module.id).toBe(12);
      expectConsistent(rows, 'duplicate');
    });

    it('deep-copies: mutating the copy does not touch the original', () => {
      const original = rows[0][0];
      service.duplicateModule(rows, original);
      const copy = rows[0][1];
      expect(copy).not.toBe(original);
      expect(copy.rackingData).not.toBe(original.rackingData);
      expect(copy.module).not.toBe(original.module);
      copy.module.name = 'changed';
      expect(original.module.name).toBe('m11');
      expect(original.rackingData.id).toBe(1);
    });

    it('duplicates the last module of a row at the end', () => {
      service.duplicateModule(rows, rows[1][1]);
      expect(ids(rows)[1]).toEqual([4, 5, undefined]);
      expectConsistent(rows, 'duplicate last');
    });

    it('uses the live index when the stored column is stale', () => {
      rows[0][0].rackingData.column = 2;
      service.duplicateModule(rows, rows[0][0]);
      expect(ids(rows)[0]).toEqual([1, undefined, 2, 3]);
    });

    it('duplicating an unracked module appends it to the last row', () => {
      const unracked = rm(99, 19, 7, 0);
      rows.push([unracked]);
      service.duplicateModule(rows, unracked);
      expect(rows[3].length).toBe(2);
      expect(rows[3][1].rackingData.id).toBeUndefined();
    });

    it('can be applied repeatedly without id collisions among saved modules', () => {
      service.duplicateModule(rows, rows[0][0]);
      service.duplicateModule(rows, rows[0][0]);
      const savedIds = ids(rows).flat().filter(id => id !== undefined);
      expect(new Set(savedIds).size).toBe(savedIds.length);
      expectConsistent(rows, 'repeat');
    });
  });
});
