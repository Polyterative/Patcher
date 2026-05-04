import { TagType } from 'src/app/models/tag';
import {
  buildSignalDestinationGroups,
  buildSignalModuleAnalysis,
  suggestSignalFocusArea,
} from './rack-signal-analysis.utils';

describe('rackSignalAnalysisUtils', () => {
  function makeRackedModule(
    moduleId: number,
    config: {
      ins?: Array<Record<string, unknown> & {name: string}>;
      outs?: Array<Record<string, unknown> & {name: string}>;
      tags?: Array<{name: string; type?: TagType; votes?: number}>;
      name?: string;
    } = {}
  ): any {
    return {
      module: {
        id: moduleId,
        name: config.name ?? `Module ${ moduleId }`,
        ins: (config.ins ?? []).map((cv, index) => ({id: index + 1, ...cv})),
        outs: (config.outs ?? []).map((cv, index) => ({id: index + 101, ...cv})),
        tags: (config.tags ?? []).map((tag, index) => ({
          id: index + 1,
          tag: {
            id: index + 1,
            name: tag.name,
            type: tag.type ?? TagType.Purpose
          },
          voteCount: Array.from({length: tag.votes ?? 0}, () => ({moduletagid: index + 1}))
        })),
      },
      rackingData: {
        id: moduleId,
        row: 0,
        column: 0
      }
    };
  }

  it('groups plausible destinations by signal family', () => {
    const source = makeRackedModule(1, {
      name: 'Voice',
      outs: [
        {name: 'Audio Out', isAudio: true},
        {name: '1V/Oct', isVOCT: true},
        {name: 'Clock Out', isDCC: true}
      ],
      tags: [{name: 'VCO', votes: 4}]
    });
    const filter = makeRackedModule(2, {
      name: 'Filter',
      ins: [{name: 'Audio In', isAudio: true}],
      tags: [{name: 'Filter', votes: 3}]
    });
    const quantizer = makeRackedModule(3, {
      name: 'Quantizer',
      ins: [{name: 'V/Oct In', isVOCT: true}],
      tags: [{name: 'Quantizer', votes: 2}]
    });
    const sequencer = makeRackedModule(4, {
      name: 'Sequencer',
      ins: [{name: 'Clock In', isDCC: true}],
      tags: [{name: 'Clock', votes: 3}]
    });

    const groups = buildSignalDestinationGroups(source, [[source, filter, quantizer, sequencer]]);

    expect(groups.map(group => group.label)).toEqual(['Audio', 'Pitch / V-Oct', 'Clock / Gate']);
    expect(groups[0].matches[0].destination.module.name).toBe('Filter');
    expect(groups[1].matches[0].destination.module.name).toBe('Quantizer');
    expect(groups[2].matches[0].destination.module.name).toBe('Sequencer');
    expect(groups[0].matches[0].reasonLabel).toBe('tone shaping');
  });

  it('keeps tag names sorted by vote strength in the signal analysis card model', () => {
    const source = makeRackedModule(1, {
      outs: [{name: 'Audio Out', isAudio: true}],
      tags: [
        {name: 'Utility', votes: 1},
        {name: 'Mixer', votes: 4},
        {name: 'Audio', votes: 2}
      ]
    });

    const analysis = buildSignalModuleAnalysis(source, [[source]]);

    expect(analysis.tagNames).toEqual(['Mixer', 'Audio', 'Utility']);
  });

  it('filters generic output-to-input destinations when there is no contextual evidence', () => {
    const source = makeRackedModule(1, {
      outs: [{name: 'Mystery Out'}]
    });
    const unrelated = makeRackedModule(2, {
      ins: [{name: 'Something Else'}]
    });

    const groups = buildSignalDestinationGroups(source, [[source, unrelated]]);

    expect(groups).toEqual([]);
  });

  it('keeps sparse destinations visible when module context implies a useful modulation path', () => {
    const source = makeRackedModule(1, {
      name: 'LFO',
      outs: [{name: 'Out'}],
      tags: [{name: 'LFO', votes: 2}]
    });
    const filter = makeRackedModule(2, {
      name: 'Filter',
      ins: [{name: 'CV In'}],
      tags: [{name: 'Filter', votes: 3}]
    });

    const groups = buildSignalDestinationGroups(source, [[source, filter]]);

    expect(groups.length).toBe(1);
    expect(groups[0].label).toBe('Modulation');
    expect(groups[0].matches[0].destination.module.name).toBe('Filter');
    expect(groups[0].matches[0].reasonLabel).toBe('tone shaping');
  });

  it('surfaces destination tier groups so stronger fits appear before exploratory routes', () => {
    const source = makeRackedModule(1, {
      name: 'Voice',
      outs: [{name: 'Audio Out', isAudio: true}],
      tags: [{name: 'VCO', votes: 3}]
    });
    const mixer = makeRackedModule(2, {
      name: 'Mixer',
      ins: [{name: 'Audio In', isAudio: true}],
      tags: [{name: 'Mixer', votes: 3}]
    });
    const utility = makeRackedModule(3, {
      name: 'Utility',
      ins: [{name: 'Audio In', isAudio: true}],
      tags: [{name: 'Utility', votes: 1}]
    });

    const analysis = buildSignalModuleAnalysis(source, [[source, mixer, utility]]);

    expect(analysis.destinationTierGroups[0].label).toBe('Best matches');
    expect(analysis.destinationTierGroups[0].groups[0].matches[0].destination.module.name).toBe('Mixer');
  });

  it('filters destinations by the requested signal focus area', () => {
    const source = makeRackedModule(1, {
      name: 'Voice',
      outs: [
        {name: 'Audio Out', isAudio: true},
        {name: 'Clock Out', isDCC: true}
      ],
      tags: [{name: 'VCO', votes: 3}]
    });
    const mixer = makeRackedModule(2, {
      name: 'Mixer',
      ins: [{name: 'Audio In', isAudio: true}],
      tags: [{name: 'Mixer', votes: 3}]
    });
    const sequencer = makeRackedModule(3, {
      name: 'Sequencer',
      ins: [{name: 'Clock In', isDCC: true}],
      tags: [{name: 'Clock', votes: 3}]
    });

    const groups = buildSignalDestinationGroups(source, [[source, mixer, sequencer]], {focusArea: 'clock'});

    expect(groups.length).toBe(1);
    expect(groups[0].label).toBe('Clock / Gate');
    expect(groups[0].matches[0].destination.module.name).toBe('Sequencer');
  });

  it('caps visible destinations while keeping track of hidden ones', () => {
    const source = makeRackedModule(1, {
      name: 'Voice',
      outs: Array.from({length: 10}, (_, index) => ({name: `Audio Out ${ index + 1 }`, isAudio: true})),
      tags: [{name: 'VCO', votes: 3}]
    });
    const destinations = Array.from({length: 10}, (_, index) => makeRackedModule(index + 2, {
      name: `Mixer ${ index + 1 }`,
      ins: [{name: `Audio In ${ index + 1 }`, isAudio: true}],
      tags: [{name: 'Mixer', votes: 3}]
    }));

    const analysis = buildSignalModuleAnalysis(source, [[source, ...destinations]], {maxMatches: 4});

    expect(analysis.totalDestinations).toBe(4);
    expect(analysis.hiddenDestinationCount).toBeGreaterThan(0);
  });

  it('blocks blatantly pointless audio-to-timing proposals', () => {
    const source = makeRackedModule(1, {
      name: 'Voice',
      outs: [{name: 'Audio Out', isAudio: true}],
      tags: [{name: 'VCO', votes: 3}]
    });
    const sequencer = makeRackedModule(2, {
      name: 'Sequencer',
      ins: [{name: 'Audio In', isAudio: true}],
      tags: [{name: 'Clock', votes: 3}]
    });

    const groups = buildSignalDestinationGroups(source, [[source, sequencer]], {focusArea: 'tone'});

    expect(groups).toEqual([]);
  });

  it('keeps useful audio-to-tone-shaping proposals visible', () => {
    const source = makeRackedModule(1, {
      name: 'Voice',
      outs: [{name: 'Audio Out', isAudio: true}],
      tags: [{name: 'VCO', votes: 3}]
    });
    const filter = makeRackedModule(2, {
      name: 'Filter',
      ins: [{name: 'Audio In', isAudio: true}],
      tags: [{name: 'Filter', votes: 3}]
    });

    const groups = buildSignalDestinationGroups(source, [[source, filter]], {focusArea: 'tone'});

    expect(groups.length).toBe(1);
    expect(groups[0].matches[0].destination.module.name).toBe('Filter');
  });

  it('suggests a tighter default focus from the hovered module role', () => {
    const voice = makeRackedModule(1, {
      name: 'Voice',
      outs: [{name: 'Audio Out', isAudio: true}],
      tags: [{name: 'VCO', votes: 3}]
    });
    const lfo = makeRackedModule(2, {
      name: 'LFO',
      outs: [{name: 'CV Out'}],
      tags: [{name: 'LFO', votes: 3}]
    });

    expect(suggestSignalFocusArea(voice)).toBe('tone');
    expect(suggestSignalFocusArea(lfo)).toBe('modulation');
  });
});
