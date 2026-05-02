import {
  buildRackPowerBreakdown,
  formatPowerRailValue,
  formatRowPowerBreakdownValue
} from './rack-power-breakdown.utils';

describe('rackPowerBreakdownUtils', () => {
  function makeRackedModule(
    moduleId: number,
    powerPos12: number | null,
    powerNeg12: number | null,
    powerPos5: number | null
  ): any {
    return {
      module: {
        id: moduleId,
        hp: 8,
        powerPos12,
        powerNeg12,
        powerPos5
      },
      rackingData: {
        row: 0,
        column: 0
      }
    };
  }

  it('aggregates row and rack power while ignoring blank modules', () => {
    const breakdown = buildRackPowerBreakdown([
      [
        makeRackedModule(101, 50, -20, 5),
        makeRackedModule(4647, 999, -999, 999)
      ],
      [
        makeRackedModule(202, 70, -15, 0)
      ]
    ]);

    expect(breakdown.powerPos12).toBe(120);
    expect(breakdown.powerNeg12).toBe(-35);
    expect(breakdown.powerPos5).toBe(5);
    expect(breakdown.missingPowerDataCount).toBe(0);
    expect(breakdown.rows).toEqual([
      jasmine.objectContaining({rowIndex: 0, moduleCount: 1, powerPos12: 50, powerNeg12: -20, powerPos5: 5}),
      jasmine.objectContaining({rowIndex: 1, moduleCount: 1, powerPos12: 70, powerNeg12: -15, powerPos5: 0}),
    ]);
  });

  it('tracks missing power data by unique module id per row and across the rack', () => {
    const breakdown = buildRackPowerBreakdown([
      [
        makeRackedModule(301, 40, null, 0),
        makeRackedModule(301, 40, null, 0)
      ],
      [
        makeRackedModule(301, 40, null, 0),
        makeRackedModule(404, 10, -5, 0)
      ]
    ]);

    expect(breakdown.missingPowerDataCount).toBe(1);
    expect(breakdown.rows[0].missingPowerDataCount).toBe(1);
    expect(breakdown.rows[1].missingPowerDataCount).toBe(1);
  });

  it('formats power values for display using absolute rail magnitudes', () => {
    expect(formatPowerRailValue(-55)).toBe('55 mA');
    expect(formatRowPowerBreakdownValue({
      rowIndex: 0,
      moduleCount: 2,
      missingPowerDataCount: 0,
      powerPos12: 90,
      powerNeg12: -35,
      powerPos5: 5
    })).toBe('+12 90 mA · -12 35 mA · +5 5 mA');
  });
});
