import { TagType } from 'src/app/models/tag';
import {
  buildFunctionAnalysisCoverageSummary,
  buildFunctionAnalysisLegendItems,
  buildFunctionAnalysisResidualLabel,
  buildRackFunctionVisual,
  buildRowFunctionBreakdowns,
  buildRowFunctionResidualLabel,
  isTrackedFunctionRole
} from './rack-function-visuals.utils';

describe('rackFunctionVisualsUtils', () => {
  function makeRackedModule(
    moduleId: number,
    tags: Array<{name: string; type: TagType | string | number; votes?: number}> = [],
    hp = 8
  ): any {
    return {
      module: {
        id: moduleId,
        hp,
        tags: tags.map((tag, index) => ({
          id: index + 1,
          tag: {
            id: index + 1,
            name: tag.name,
            type: tag.type
          },
          voteCount: Array.from({length: tag.votes ?? 0}, () => ({moduletagid: index + 1}))
        }))
      },
      rackingData: {
        id: moduleId,
        row: 0,
        column: 0
      }
    };
  }

  it('maps direct voice tags to the voices function color', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(101, [
      {name: 'VCO', type: TagType.Source}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--voices',
      roleLabel: 'Voices',
      tagLabel: 'Primary tag: VCO'
    }));
  });

  it('falls back to axis-matched tag when no votes exist, preferring functional over nature pattern match', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(102, [
      {name: 'Processor', type: TagType.Nature},
      {name: 'Envelope Gen.', type: TagType.Source}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--modulation',
      roleLabel: 'Modulation',
      tagLabel: 'Primary tag: Envelope Gen.'
    }));
  });

  it('uses the highest-voted matching tag even when it is not first in the tag list', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(104, [
      {name: 'Mixer', type: TagType.Source, votes: 1},
      {name: 'VCO', type: TagType.Source, votes: 6}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--voices',
      roleLabel: 'Voices',
      tagLabel: 'Primary tag: VCO'
    }));
  });

  it('shows most-voted tag as primary even when it is a Nature tag that does not drive the axis', () => {
    // Simulates a module like S9: External (Nature, 2 votes) + Modulate (Functional, 1 vote).
    // The axis classification is still driven by Modulate, but the tooltip should reflect community consensus.
    const visual = buildRackFunctionVisual(makeRackedModule(105, [
      {name: 'External', type: TagType.Nature, votes: 2},
      {name: 'Modulate', type: TagType.Modulation, votes: 1}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--modulation',
      roleLabel: 'Modulation',
      tagLabel: 'Primary tag: External'
    }));
  });

  it('falls back to axis-matched tag as primary when no tag has received votes', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(106, [
      {name: 'Processor', type: TagType.Nature},
      {name: 'Envelope Gen.', type: TagType.Modulation}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--modulation',
      roleLabel: 'Modulation',
      tagLabel: 'Primary tag: Envelope Gen.'
    }));
  });

  it('returns a neutral unclassified visual when no recognized role tags are present', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(103, [
      {name: 'Experimental', type: TagType.Character}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--unclassified',
      roleLabel: 'Unclassified'
    }));
  });

  it('keeps nature and character tags neutral even when their labels match functional tags', () => {
    expect(buildRackFunctionVisual(makeRackedModule(107, [
      {name: 'VCO', type: TagType.Character}
    ]))).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--unclassified',
      roleLabel: 'Unclassified'
    }));

    expect(buildRackFunctionVisual(makeRackedModule(108, [
      {name: 'Blank', type: TagType.Nature}
    ]))).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--unclassified',
      roleLabel: 'Unclassified'
    }));
  });

  it('maps aligned timing, utility, and voice instrument tags to function colors', () => {
    expect(buildRackFunctionVisual(makeRackedModule(109, [
      {name: 'Clock IN', type: TagType.Sequencing}
    ])).className).toBe('functionAnalysisModule--timing');
    expect(buildRackFunctionVisual(makeRackedModule(110, [
      {name: 'Sequencial Switch', type: TagType.Utility}
    ])).className).toBe('functionAnalysisModule--utilities');
    expect(buildRackFunctionVisual(makeRackedModule(111, [
      {name: 'KICK', type: TagType.Voice}
    ])).className).toBe('functionAnalysisModule--voices');
  });

  it('treats blank modules as spacers in function analysis mode', () => {
    const visual = buildRackFunctionVisual(makeRackedModule(4647, [
      {name: 'VCO', type: TagType.Source}
    ]));

    expect(visual).toEqual(jasmine.objectContaining({
      className: 'functionAnalysisModule--blank',
      roleLabel: 'Blank',
      tagLabel: 'Spacer'
    }));
  });

  it('builds function analysis legend totals from module counts and hp', () => {
    const items = buildFunctionAnalysisLegendItems([[
      makeRackedModule(201, [{name: 'VCO', type: TagType.Source}], 10),
      makeRackedModule(202, [{name: 'Envelope Gen.', type: TagType.Source}], 12),
      makeRackedModule(4647, [], 4)
    ]]);

    expect(items.find(item => item.label === 'Voices')).toEqual(jasmine.objectContaining({
      count: 1,
      hp: 10
    }));
    expect(items.find(item => item.label === 'Modulation')).toEqual(jasmine.objectContaining({
      count: 1,
      hp: 12
    }));
    expect(items.find(item => item.label === 'Utilities')).toEqual(jasmine.objectContaining({
      count: 0,
      hp: 0
    }));
  });

  it('reports residual function analysis modules and tracked coverage', () => {
    const rowedRackedModules = [[
      makeRackedModule(301, [{name: 'VCO', type: TagType.Source}], 10),
      makeRackedModule(4647, [], 4),
      makeRackedModule(302, [{name: 'Experimental', type: TagType.Character}], 8)
    ]];

    expect(buildFunctionAnalysisResidualLabel(rowedRackedModules)).toBe('2 blank or unclassified (12HP)');
    expect(buildFunctionAnalysisCoverageSummary(rowedRackedModules)).toBe('Tracked 1/3 modules · 10/22HP');
  });

  it('omits the residual label when every module maps to a tracked function role', () => {
    const rowedRackedModules = [[
      makeRackedModule(311, [{name: 'VCO', type: TagType.Source}], 10),
      makeRackedModule(312, [{name: 'Envelope Gen.', type: TagType.Source}], 12)
    ]];

    expect(buildFunctionAnalysisResidualLabel(rowedRackedModules)).toBeNull();
  });

  it('builds per-row function breakdowns and residual labels', () => {
    const breakdowns = buildRowFunctionBreakdowns([
      [
        makeRackedModule(401, [{name: 'VCO', type: TagType.Source}], 10),
        makeRackedModule(402, [{name: 'Envelope Gen.', type: TagType.Source}], 12),
        makeRackedModule(4647, [], 4)
      ],
      [
        makeRackedModule(403, [{name: 'Experimental', type: TagType.Character}], 6)
      ]
    ]);

    expect(breakdowns.get(0)).toEqual(jasmine.objectContaining({
      moduleCount: 3,
      residualCount: 1,
      residualHp: 4
    }));
    expect(breakdowns.get(0)?.roles.map(role => role.label)).toEqual(['Modulation', 'Voices']);
    expect(buildRowFunctionResidualLabel(breakdowns.get(0) ?? null)).toBe('1 module blank or unclassified (4HP)');
    expect(buildRowFunctionResidualLabel(breakdowns.get(1) ?? null)).toBe('1 module blank or unclassified in this row');
  });

  it('reports when an entire row maps cleanly to tracked function roles', () => {
    const breakdowns = buildRowFunctionBreakdowns([[
      makeRackedModule(411, [{name: 'VCO', type: TagType.Source}], 10),
      makeRackedModule(412, [{name: 'Envelope Gen.', type: TagType.Source}], 12)
    ]]);

    expect(buildRowFunctionResidualLabel(breakdowns.get(0) ?? null)).toBe('All modules in this row map to tracked function roles.');
  });

  it('detects tracked function role class names', () => {
    expect(isTrackedFunctionRole('functionAnalysisModule--voices')).toBeTrue();
    expect(isTrackedFunctionRole('functionAnalysisModule--blank')).toBeFalse();
  });

  it('returns no-modules copy from coverage summary when rack is empty', () => {
    expect(buildFunctionAnalysisCoverageSummary(null)).toBe('No modules to classify yet.');
    expect(buildFunctionAnalysisCoverageSummary([[]])).toBe('No modules to classify yet.');
  });

  it('returns full-coverage copy when all modules map to tracked roles', () => {
    const summary = buildFunctionAnalysisCoverageSummary([[
      makeRackedModule(501, [{name: 'VCO', type: TagType.Source}], 4),
      makeRackedModule(502, [{name: 'Envelope Gen.', type: TagType.Source}], 6)
    ]]);
    expect(summary).toBe('Tracked 2/2 modules · 10/10HP');
  });

  it('returns null for residual label when all modules map to tracked roles', () => {
    const residual = buildFunctionAnalysisResidualLabel([[
      makeRackedModule(601, [{name: 'VCO', type: TagType.Source}], 8)
    ]]);
    expect(residual).toBeNull();
  });
});
