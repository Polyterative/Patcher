import { RackedModule } from 'src/app/models/module';
import { computeLayoutAnalysis } from './rack-layout-analysis.utils';


describe('computeLayoutAnalysis', () => {
  function rackModule(id: number, hp: number, row: number, standard = 0): RackedModule {
    return {
      module: {
        id,
        name: `Module ${ id }`,
        hp,
        standard: {id: standard}
      },
      rackingData: {
        id,
        rackid: 1,
        moduleid: id,
        row,
        column: 0
      }
    } as RackedModule;
  }

  it('reports row overflow and wasted hp', () => {
    const result = computeLayoutAnalysis([
      [rackModule(1, 60, 0), rackModule(2, 30, 0)],
      [rackModule(3, 20, 1)]
    ], 84);

    expect(result.isValid).toBeFalse();
    expect(result.overflowHp).toEqual([6, 0]);
    expect(result.wastedHp).toEqual([0, 64]);
  });

  it('blocks remix when a row mixes module standards', () => {
    const result = computeLayoutAnalysis([
      [rackModule(1, 8, 0, 0), rackModule(2, 8, 0, 1)]
    ], 84);

    expect(result.isValid).toBeFalse();
    expect(result.mixedRowIssues).toEqual([{rowIndex: 0, standards: [0, 1]}]);
    expect(result.autoArrangeMoves).toEqual([]);
  });

  it('excludes blank panels from auto arrangement', () => {
    const result = computeLayoutAnalysis([
      [rackModule(4666, 1, 0), rackModule(10, 10, 0)]
    ], 84);

    expect(result.autoArrangeMoves.map(move => move.moduleId)).toEqual([10]);
  });

  it('uses first-fit decreasing for auto arrangement moves', () => {
    const result = computeLayoutAnalysis([
      [rackModule(1, 10, 0), rackModule(2, 20, 0), rackModule(3, 30, 0), rackModule(4, 40, 0)]
    ], 84);

    expect(result.autoArrangeMoves.map(move => [move.moduleId, move.toRow])).toEqual([
      [4, 0],
      [3, 0],
      [2, 1],
      [1, 0]
    ]);
  });

  it('counts exact valid arrangements across the available rows for small racks', () => {
    const result = computeLayoutAnalysis([
      [rackModule(1, 10, 0), rackModule(2, 20, 0)],
      [rackModule(3, 30, 1), rackModule(4, 40, 1)]
    ], 84);

    expect(result.validArrangementCount).toBe(12);
  });

  it('returns zero valid arrangements when scoped modules cannot fit available rows', () => {
    const result = computeLayoutAnalysis([
      [rackModule(1, 60, 0), rackModule(2, 30, 0)]
    ], 84);

    expect(result.validArrangementCount).toBe(0);
  });

  it('uses an estimate when exact counting would have too many row-state combinations', () => {
    const result = computeLayoutAnalysis(
      Array.from({length: 8}, (_, rowIndex) =>
        Array.from({length: rowIndex < 4 ? 3 : 2}, (_, columnIndex) =>
          rackModule((rowIndex * 3) + columnIndex + 1, 1, rowIndex)
        )
      ),
      84
    );

    expect(result.validArrangementCount).toBe('estimated');
    expect(result.estimate).toBeGreaterThan(0);
  });

  it('honours 1u and 3u scopes', () => {
    const rows = [
      [rackModule(1, 8, 0, 0)],
      [rackModule(2, 8, 1, 1)],
      [rackModule(3, 8, 2, 2)]
    ];

    expect(computeLayoutAnalysis(rows, 84, '3u').autoArrangeMoves.map(move => move.moduleId)).toEqual([1]);
    expect(computeLayoutAnalysis(rows, 84, '1u').autoArrangeMoves.map(move => move.moduleId)).toEqual([2, 3]);
  });

  it('runs all-format auto arrangement independently per physical standard', () => {
    const result = computeLayoutAnalysis([
      [rackModule(1, 80, 0, 0)],
      [rackModule(2, 4, 1, 1)],
      [rackModule(3, 4, 2, 2)]
    ], 84);

    expect(result.autoArrangeMoves.map(move => [move.moduleId, move.toRow])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2]
    ]);
  });

  it('does not merge Intellijel and Pulp Logic rows inside the 1u scope', () => {
    const rows = [
      [rackModule(1, 80, 0, 0)],
      [rackModule(2, 80, 1, 1)],
      [rackModule(3, 4, 2, 2)]
    ];

    expect(computeLayoutAnalysis(rows, 84, '1u').autoArrangeMoves.map(move => [move.moduleId, move.toRow])).toEqual([
      [2, 1],
      [3, 2]
    ]);
  });

  it('keeps single-row scope assignments in the selected row', () => {
    const result = computeLayoutAnalysis([
      [rackModule(1, 80, 0, 0)],
      [rackModule(2, 8, 1, 0), rackModule(3, 8, 1, 0)]
    ], 84, {rowIndex: 1});

    expect(result.autoArrangeMoves.map(move => [move.moduleId, move.toRow])).toEqual([
      [2, 1],
      [3, 1]
    ]);
  });

  it('returns target columns so remix can reorder modules inside a single row', () => {
    const result = computeLayoutAnalysis([
      [rackModule(1, 6, 0, 1), rackModule(2, 10, 0, 1), rackModule(3, 4, 0, 1)]
    ], 84);

    expect(result.autoArrangeMoves.map(move => [move.moduleId, move.toRow, move.toColumn])).toEqual([
      [2, 0, 0],
      [1, 0, 1],
      [3, 0, 2]
    ]);
  });

  it('can produce an alternate valid order for repeated remix attempts', () => {
    const rows = [[rackModule(1, 6, 0, 1), rackModule(2, 10, 0, 1), rackModule(3, 4, 0, 1)]];

    expect(computeLayoutAnalysis(rows, 84, 'all', {variant: 1}).autoArrangeMoves.map(move => [move.moduleId, move.toColumn])).toEqual([
      [3, 0],
      [1, 1],
      [2, 2]
    ]);
  });
});
