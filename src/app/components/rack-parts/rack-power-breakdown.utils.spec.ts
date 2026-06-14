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
    expect(breakdown.powerHeaderCount).toBe(2);
    expect(breakdown.passiveModuleCount).toBe(0);
    expect(breakdown.unknownPowerModuleCount).toBe(0);
    expect(breakdown.rows).toEqual([
      jasmine.objectContaining({rowIndex: 0, moduleCount: 1, rowPowerHeaderCount: 1, powerPos12: 50, powerNeg12: -20, powerPos5: 5}),
      jasmine.objectContaining({rowIndex: 1, moduleCount: 1, rowPowerHeaderCount: 1, powerPos12: 70, powerNeg12: -15, powerPos5: 0}),
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
      rowPowerHeaderCount: 2,
      passiveModuleCount: 0,
      unknownPowerModuleCount: 0,
      powerPos12: 90,
      powerNeg12: -35,
      powerPos5: 5
    })).toBe('+12 90 mA · -12 35 mA · +5 5 mA');
  });

  it('returns empty rows array for empty rack', () => {
    const breakdown = buildRackPowerBreakdown([]);
    expect(breakdown.rows).toEqual([]);
    expect(breakdown.powerPos12).toBe(0);
    expect(breakdown.powerNeg12).toBe(0);
    expect(breakdown.powerPos5).toBe(0);
    expect(breakdown.missingPowerDataCount).toBe(0);
    expect(breakdown.powerHeaderCount).toBe(0);
    expect(breakdown.passiveModuleCount).toBe(0);
    expect(breakdown.unknownPowerModuleCount).toBe(0);
  });

  it('single-row rack preserves moduleCount correctly', () => {
    const breakdown = buildRackPowerBreakdown([
      [makeRackedModule(1, 10, -5, 0), makeRackedModule(2, 20, -10, 0)]
    ]);
    expect(breakdown.rows[0].moduleCount).toBe(2);
    expect(breakdown.rows[0].powerPos12).toBe(30);
  });

  it('counts active, passive, mixed, and all-null modules using the conservative header rule', () => {
    const breakdown = buildRackPowerBreakdown([
      [
        makeRackedModule(1, 10, 0, 0),
        makeRackedModule(2, 0, 0, 0),
        makeRackedModule(3, null, null, null),
        makeRackedModule(4, null, -5, 0),
        makeRackedModule(4647, null, null, null)
      ],
      [
        makeRackedModule(5, 0, 0, 5),
        makeRackedModule(6, 0, 0, 0)
      ]
    ]);

    expect(breakdown.powerHeaderCount).toBe(4);
    expect(breakdown.passiveModuleCount).toBe(2);
    expect(breakdown.unknownPowerModuleCount).toBe(1);
    expect(breakdown.rows[0].rowPowerHeaderCount).toBe(3);
    expect(breakdown.rows[0].passiveModuleCount).toBe(1);
    expect(breakdown.rows[0].unknownPowerModuleCount).toBe(1);
    expect(breakdown.rows[1].rowPowerHeaderCount).toBe(1);
    expect(breakdown.rows[1].passiveModuleCount).toBe(1);
    expect(breakdown.rows[1].unknownPowerModuleCount).toBe(0);
  });

  it('formatPowerRailValue formats zero as "0 mA"', () => {
    expect(formatPowerRailValue(0)).toBe('0 mA');
  });
});
