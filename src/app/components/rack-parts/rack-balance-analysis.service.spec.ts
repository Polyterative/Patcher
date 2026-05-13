import { TestBed } from '@angular/core/testing';
import { RackedModule } from 'src/app/models/module';
import { TagType } from 'src/app/models/tag';
import { RackBalanceAnalysisService } from './rack-balance-analysis.service';

const BLANK_3U_MODULE_ID = 4647;

function makeRackedModule(id: number, tagData: Array<{name: string; type: unknown}> = [], hp = 8): RackedModule {
  return {
    rackingData: {
      id,
      row: 0,
      column: id - 1,
      moduleid: id,
      rackid: 1
    },
    module: {
      id,
      name: `Module ${ id }`,
      hp,
      description: '',
      public: true,
      manufacturer: {id: 1, name: 'Maker'},
      manufacturerId: 1,
      standard: {id: 0, name: '3U Eurorack'},
      tags: tagData.map((tag, index) => ({
        id: id * 100 + index,
        tag: {
          id: id * 100 + index,
          name: tag.name,
          type: tag.type
        },
        voteCount: [{moduletagid: id * 100 + index}]
      })),
      panels: [],
      ins: [],
      outs: [],
      switches: [],
      manualURL: '',
      store_url: null,
      additional: null,
      isComplete: true,
      isApproved: true,
      isDIY: false,
      powerPos12: 0,
      powerNeg12: 0,
      powerPos5: 0,
      depth: 0,
      weight: 0,
      created: '',
      updated: ''
    }
  } as RackedModule;
}

describe('RackBalanceAnalysisService', () => {
  let service: RackBalanceAnalysisService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RackBalanceAnalysisService]
    });
    service = TestBed.inject(RackBalanceAnalysisService);
  });

  it('returns an empty advisory state when the rack has no modules', () => {
    const result = service.analyze([]);

    expect(result.isEmpty).toBeTrue();
    expect(result.totalModules).toBe(0);
    expect(result.summary).toContain('Balance analysis appears once');
    expect(result.axes.every(axis => axis.share === 0)).toBeTrue();
  });

  it('scores recognized axes from purpose and nature tags', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'VCO', type: TagType.Purpose}]),
      makeRackedModule(2, [{name: 'Utility', type: TagType.Nature}]),
      makeRackedModule(3, [{name: 'Envelope', type: TagType.Purpose}]),
    ]];

    const result = service.analyze(rack);
    const voices = result.axes.find(axis => axis.id === 'voices');
    const utilities = result.axes.find(axis => axis.id === 'utilities');
    const modulation = result.axes.find(axis => axis.id === 'modulation');

    expect(result.isEmpty).toBeFalse();
    expect(result.recognizedModuleCount).toBe(3);
    expect(voices?.matchedModules).toBe(1);
    expect(utilities?.matchedModules).toBe(1);
    expect(modulation?.matchedModules).toBe(1);
  });

  it('recognizes legacy string tag types from live backend payloads', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'VCO', type: 'module_type' as any}]),
      makeRackedModule(2, [{name: 'Envelope', type: 'function' as any}]),
      makeRackedModule(3, [{name: 'Utility', type: 'module_type' as any}]),
      makeRackedModule(4, [{name: 'Filter', type: 'function' as any}]),
    ]];

    const result = service.analyze(rack);

    expect(result.recognizedModuleCount).toBe(4);
    expect(result.axes.find(axis => axis.id === 'voices')?.matchedModules).toBe(1);
    expect(result.axes.find(axis => axis.id === 'modulation')?.matchedModules).toBe(1);
    expect(result.axes.find(axis => axis.id === 'utilities')?.matchedModules).toBe(1);
    expect(result.axes.find(axis => axis.id === 'tone')?.matchedModules).toBe(1);
  });

  it('matches the stored DB tag labels, including punctuation-heavy purpose tags', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'Envelope Gen.', type: TagType.Purpose}]),
      makeRackedModule(2, [{name: 'Clock Gen', type: TagType.Purpose}]),
      makeRackedModule(3, [{name: 'Env. Follow', type: TagType.Purpose}]),
      makeRackedModule(4, [{name: 'Waveshape', type: TagType.Purpose}]),
      makeRackedModule(5, [{name: 'VCA', type: TagType.Purpose}]),
      makeRackedModule(6, [{name: 'Full Voice', type: TagType.Purpose}])
    ]];

    const result = service.analyze(rack);

    expect(result.recognizedModuleCount).toBe(6);
    expect(result.axes.find(axis => axis.id === 'modulation')?.matchedModules).toBe(2);
    expect(result.axes.find(axis => axis.id === 'timing')?.matchedModules).toBe(1);
    expect(result.axes.find(axis => axis.id === 'tone')?.matchedModules).toBe(1);
    expect(result.axes.find(axis => axis.id === 'utilities')?.matchedModules).toBe(1);
    expect(result.axes.find(axis => axis.id === 'voices')?.matchedModules).toBe(1);
  });

  it('ignores non-role database tag categories even when their label matches a balance axis', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'Clock', type: 'technology' as any}]),
      makeRackedModule(2, [{name: 'Utility', type: 'character' as any}]),
      makeRackedModule(3, [{name: 'Filter', type: TagType.Character}])
    ]];

    const result = service.analyze(rack);

    expect(result.recognizedModuleCount).toBe(0);
    expect(result.axes.every(axis => axis.matchedModules === 0)).toBeTrue();
  });

  it('reports partial confidence when many modules have no recognized tags', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'VCO', type: TagType.Purpose}]),
      makeRackedModule(2),
      makeRackedModule(3),
      makeRackedModule(4)
    ]];

    const result = service.analyze(rack);

    expect(result.confidence).toBe(0.25);
    expect(result.warningMessage).toContain('Guidance is partial');
    expect(result.summary).toContain('Early signal only');
  });

  it('excludes blank spacer modules from coverage totals', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'VCO', type: TagType.Purpose}]),
      makeRackedModule(BLANK_3U_MODULE_ID),
      makeRackedModule(3)
    ]];

    const result = service.analyze(rack);

    expect(result.totalModules).toBe(2);
    expect(result.confidence).toBe(0.5);
    expect(result.warningMessage).toBeNull();
  });

  it('excludes blank spacer modules from low-coverage warning copy', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'VCO', type: TagType.Purpose}]),
      makeRackedModule(BLANK_3U_MODULE_ID),
      makeRackedModule(3),
      makeRackedModule(4)
    ]];

    const result = service.analyze(rack);

    expect(result.totalModules).toBe(3);
    expect(result.confidence).toBeCloseTo(1 / 3, 5);
    expect(result.warningMessage).toContain('1 of 3 modules');
  });

  it('treats a blank-only rack like an empty rack', () => {
    const rack = [[
      makeRackedModule(BLANK_3U_MODULE_ID),
      makeRackedModule(4648)
    ]];

    const result = service.analyze(rack);

    expect(result.isEmpty).toBeTrue();
    expect(result.totalModules).toBe(0);
    expect(result.warningMessage).toBeNull();
    expect(result.summary).toContain('Balance analysis appears once');
  });

  it('weights HP more strongly than raw module count when scoring axes', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'Filter', type: TagType.Purpose}], 24),
      makeRackedModule(2, [{name: 'VCO', type: TagType.Purpose}], 4),
      makeRackedModule(3, [{name: 'VCO', type: TagType.Purpose}], 4),
      makeRackedModule(4, [{name: 'VCO', type: TagType.Purpose}], 4),
    ]];

    const result = service.analyze(rack);
    const tone = result.axes.find(axis => axis.id === 'tone');
    const voices = result.axes.find(axis => axis.id === 'voices');

    expect(tone?.matchedModules).toBe(1);
    expect(voices?.matchedModules).toBe(3);
    expect(tone?.share).toBeGreaterThan(voices?.share ?? 0);
  });

  it('surfaces balanced guidance when coverage is broad across axes', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'VCO', type: TagType.Purpose}]),
      makeRackedModule(2, [{name: 'Envelope', type: TagType.Purpose}]),
      makeRackedModule(3, [{name: 'Utility', type: TagType.Nature}]),
      makeRackedModule(4, [{name: 'Clock', type: TagType.Purpose}]),
      makeRackedModule(5, [{name: 'Filter', type: TagType.Purpose}])
    ]];

    const result = service.analyze(rack);

    expect(result.warningMessage).toBeNull();
    expect(result.summary).toContain('fairly evenly spread');
    expect(result.axes.every(axis => axis.share >= 20)).toBeTrue();
  });

  it('keeps guidance neutral when tags are present but do not match tracked axes', () => {
    const rack = [[
      makeRackedModule(1, [{name: 'Experimental', type: TagType.Character}]),
      makeRackedModule(2, [{name: 'Chaotic', type: TagType.Character}])
    ]];

    const result = service.analyze(rack);

    expect(result.recognizedModuleCount).toBe(0);
    expect(result.warningMessage).toContain('0 of 2 modules');
    expect(result.summary).toContain('No recognized balance tags');
  });
});
