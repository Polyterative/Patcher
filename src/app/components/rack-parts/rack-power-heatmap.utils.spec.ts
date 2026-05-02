import {
  buildRackPowerHeatmapVisuals,
  rackPowerHeatmapKey
} from './rack-power-heatmap.utils';

describe('rackPowerHeatmapUtils', () => {
  function makeRackedModule(
    moduleId: number,
    row: number,
    column: number,
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
        id: row * 10 + column + 1,
        row,
        column
      }
    };
  }

  it('marks the hottest complete module with the peak heatmap class', () => {
    const coolest = makeRackedModule(101, 0, 0, 20, -5, 0);
    const hottest = makeRackedModule(202, 0, 1, 120, -80, 30);
    const visuals = buildRackPowerHeatmapVisuals([[coolest, hottest]]);

    expect(visuals.get(rackPowerHeatmapKey(hottest))?.className).toBe('powerAnalysisModule--peak');
    expect(visuals.get(rackPowerHeatmapKey(coolest))?.className).not.toBe('powerAnalysisModule--peak');
  });

  it('rescales hovered rows against their own hottest module while muting other rows', () => {
    const row0Cool = makeRackedModule(101, 0, 0, 20, -5, 0);
    const row0Hot = makeRackedModule(202, 0, 1, 120, -80, 30);
    const row1Cool = makeRackedModule(303, 1, 0, 18, -6, 0);
    const row1Warm = makeRackedModule(404, 1, 1, 45, -15, 0);
    const visuals = buildRackPowerHeatmapVisuals([
      [row0Cool, row0Hot],
      [row1Cool, row1Warm]
    ], {
      hoveredRowId: 1
    });

    expect(visuals.get(rackPowerHeatmapKey(row1Warm))?.className).toBe('powerAnalysisModule--peak');
    expect(visuals.get(rackPowerHeatmapKey(row1Cool))?.className).toBe('powerAnalysisModule--smoke');
    expect(visuals.get(rackPowerHeatmapKey(row0Hot))?.className).toBe('powerAnalysisModule--inactive');
    expect(visuals.get(rackPowerHeatmapKey(row0Cool))?.className).toBe('powerAnalysisModule--inactive');
  });

  it('marks modules with incomplete power data as missing', () => {
    const missing = makeRackedModule(303, 0, 0, 40, null, 0);
    const visuals = buildRackPowerHeatmapVisuals([[missing]]);

    expect(visuals.get(rackPowerHeatmapKey(missing))).toEqual(jasmine.objectContaining({
      className: 'powerAnalysisModule--missing',
      totalLabel: 'n/a'
    }));
  });

  it('treats blank modules as spacers rather than powered modules', () => {
    const blank = makeRackedModule(4647, 0, 0, 999, -999, 999);
    const visuals = buildRackPowerHeatmapVisuals([[blank]]);

    expect(visuals.get(rackPowerHeatmapKey(blank))).toEqual(jasmine.objectContaining({
      className: 'powerAnalysisModule--blank',
      railsLabel: 'Spacer'
    }));
  });
});
