import { MinimalModule } from 'src/app/models/module';
import {
  buildModularGridCandidateSearchTerms,
  buildModularGridMatchPreview,
  isModularGridBlankOrSpacer,
  normalizeModularGridModuleName,
  resolveModularGridPlacements,
  toPatcherRackModulePlacement
} from './modulargrid-matcher';
import {
  parseModularGridExport,
  parseRows1u
} from './modulargrid-parser';

function moduleFixture(id: number, name: string, hp: number, manufacturerName = ''): MinimalModule {
  return {
    id,
    name,
    hp,
    description: '',
    public: true,
    manufacturer: {name: manufacturerName}
  } as MinimalModule;
}

describe('ModularGrid import parser', () => {
  it('distinguishes invalid JSON from a wrong export shape', () => {
    expect(parseModularGridExport('{ nope').status).toBe('invalid-json');
    expect(parseModularGridExport(JSON.stringify({Rack: {}, Module: []})).status).toBe('wrong-shape');
  });

  it('extracts rack fields, rows1u, source modules, and inferred HP', () => {
    const result = parseModularGridExport(JSON.stringify({
      Rack: {
        name: 'Karma Coma',
        rows: '2',
        te: '84',
        format: 'eurorack',
        rows1u: 'a:1:{i:0;i:1;}'
      },
      User: {name: 'user'},
      Module: [
        {id: 'mg-10', name: "Pamela's NEW Workout", ModulesRack: {row: '1', col: '1'}},
        {id: 'mg-11', name: 'Optomix rev2 2016', ModulesRack: {row: '1', col: '9'}},
        {id: 'mg-12', name: '4HP Blank Panel', ModulesRack: {row: '2', col: '81'}}
      ]
    }));

    expect(result.status).toBe('valid');
    expect(result.rack).toEqual(jasmine.objectContaining({
      name: 'Karma Coma',
      rows: 2,
      hp: 84,
      format: 'eurorack',
      rows1u: [1]
    }));
    expect(result.modules.map(module => module.inferredHp)).toEqual([8, 76, 4]);
    expect(result.warnings).toEqual([]);
  });

  it('parses rows1u defensively without unserializing PHP payloads', () => {
    expect(parseRows1u('a:2:{i:0;i:1;i:1;s:1:"3";}', 4)).toEqual([1, 3]);
    expect(parseRows1u('a:2:{i:0;s:2:"11";i:1;s:2:"12";}', 16)).toEqual([11, 12]);
    expect(parseRows1u('', 4)).toEqual([]);
  });

  it('warns but accepts a malformed non-empty rows1u export', () => {
    const result = parseModularGridExport(JSON.stringify({
      Rack: {
        name: 'Malformed 1U Rack',
        rows: '2',
        te: '84',
        rows1u: 'not serialized row data'
      },
      User: {name: 'user'},
      Module: [{
        id: 'mg-10',
        name: "Pamela's NEW Workout",
        ModulesRack: {row: '1', col: '1'}
      }]
    }));

    expect(result.status).toBe('valid');
    expect(result.rack?.rows1u).toEqual([]);
    expect(result.warnings).toEqual([
      'Could not detect 1U rows from rows1u; treating all rows as standard height.'
    ]);
  });
});

describe('ModularGrid import matcher', () => {
  it('normalizes common panel, colour, date, and punctuation noise', () => {
    expect(normalizeModularGridModuleName('Varigate 8+ Black & Gold Panel')).toBe('varigate 8');
    expect(normalizeModularGridModuleName('Optomix rev2 2016')).toBe('optomix rev2');
    expect(normalizeModularGridModuleName('dual xfade_black')).toBe('dual xfade');
  });

  it('matches compact and manufacturer-prefixed ModularGrid names against short catalogue names', () => {
    const parseResult = parseModularGridExport(JSON.stringify({
      Rack: {name: 'Import', rows: 1, te: 84},
      User: {},
      Module: [
        {
          id: 1001,
          name: 'Bef Aco STMix',
          ModulesRack: {row: 1, col: 1}
        },
        {
          id: 1002,
          name: 'Mutable Instruments Plaits',
          ModulesRack: {row: 1, col: 5}
        }
      ]
    }));
    const preview = buildModularGridMatchPreview(parseResult, [
      moduleFixture(9001, 'ST MIX', 4, 'Befaco'),
      moduleFixture(9002, 'Plaits', 12, 'Mutable Instruments')
    ]);
    const matchedCandidateNames = [
      ...(preview?.confident ?? []),
      ...(preview?.likely ?? [])
    ].map(match => match.candidates[0].module.name);

    expect(matchedCandidateNames).toContain('ST MIX');
    expect(matchedCandidateNames).toContain('Plaits');
  });

  it('builds focused search terms for compact and split source names', () => {
    const terms = buildModularGridCandidateSearchTerms([{
      key: '1:1:0',
      mgId: 1001,
      name: 'Bef Aco STMix',
      row: 1,
      col: 1,
      inferredHp: 4
    }, {
      key: '1:5:1',
      mgId: 1002,
      name: '4HP Blank Panel',
      row: 1,
      col: 5,
      inferredHp: 4
    }]);

    expect(terms).toContain('stmix');
    expect(terms).toContain('st mix');
    expect(terms).not.toContain('4hp blank');
  });

  it('orders exact, compact, and window terms before individual multi-word name tokens', () => {
    const terms = buildModularGridCandidateSearchTerms([{
      key: '1:1:0',
      mgId: 9869,
      name: 'Mutable Instruments Plaits',
      row: 1,
      col: 1,
      inferredHp: 12
    }, {
      key: '1:13:1',
      mgId: 10662,
      name: 'Matrix Mixer',
      row: 1,
      col: 13,
      inferredHp: 10
    }]);
    const higherSignalTerms = [
      'mutable instruments plaits',
      'mutableinstrumentsplaits',
      'matrix mixer',
      'matrixmixer',
      'mutable instruments',
      'mutableinstruments',
      'instruments plaits',
      'instrumentsplaits'
    ];
    const tokenTerms = ['mutable', 'instruments', 'plaits', 'matrix', 'mixer'];
    const lastHigherSignalIndex = Math.max(...higherSignalTerms.map(term => terms.indexOf(term)));

    expect(terms.slice(0, 4)).toEqual([
      'mutable instruments plaits',
      'mutableinstrumentsplaits',
      'matrix mixer',
      'matrixmixer'
    ]);
    higherSignalTerms.forEach(term => expect(terms).toContain(term));
    tokenTerms.forEach(term => {
      expect(terms).toContain(term);
      expect(terms.indexOf(term)).toBeGreaterThan(lastHigherSignalIndex);
    });
  });

  it('keeps generated terms beyond the backend cap so late single-token aliases can be reserved later', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz';
    const terms = buildModularGridCandidateSearchTerms(
      Array.from({length: 90}, (_value, index) => ({
        key: `1:${ index + 1 }:${ index }`,
        mgId: index + 1,
        name: `alias${ letters[Math.floor(index / letters.length)] }${ letters[index % letters.length] }`,
        row: 1,
        col: index + 1,
        inferredHp: 4
      }))
    );

    expect(terms.length).toBeGreaterThan(80);
    expect(terms[0]).toBe('aliasaa');
    expect(terms).toContain('aliasdl');
  });

  it('keeps four-character module names as candidate search terms', () => {
    const terms = buildModularGridCandidateSearchTerms([{
      key: '1:1:0',
      mgId: 1001,
      name: 'VCFQ',
      row: 1,
      col: 1,
      inferredHp: 8
    }]);

    expect(terms).toContain('vcfq');
  });

  it('detects blanks and spacers without creating fake modules', () => {
    expect(isModularGridBlankOrSpacer('4HP Blank Panel')).toBeTrue();
    expect(isModularGridBlankOrSpacer('Silver Spacer')).toBeTrue();
    expect(isModularGridBlankOrSpacer('Optomix rev2')).toBeFalse();
  });

  it('buckets confident, likely, ambiguous, unmatched, and blank imports', () => {
    const parseResult = parseModularGridExport(JSON.stringify({
      Rack: {name: 'Import', rows: 1, te: 84},
      User: {},
      Module: [
        {id: 1001, name: '6x MIX - black', ModulesRack: {row: 1, col: 1}},
        {id: 1002, name: "Pamela's NEW Workout", ModulesRack: {row: 1, col: 7}},
        {id: 1003, name: 'Microcell - uCell, µCell, Micro Supercell (black panel)', ModulesRack: {row: 1, col: 15}},
        {id: 1004, name: 'Definitely Missing', ModulesRack: {row: 1, col: 29}},
        {id: 1005, name: '4HP Blank Panel', ModulesRack: {row: 1, col: 33}}
      ]
    }));
    const preview = buildModularGridMatchPreview(parseResult, [
      moduleFixture(1, '6x MIX', 6),
      moduleFixture(2, "ALM017 - Pamela's NEW Workout", 8),
      moduleFixture(3, 'Microcell', 14),
      moduleFixture(4, 'Supercell', 14)
    ]);

    expect(preview?.counts).toEqual({
      confident: 1,
      likely: 1,
      ambiguous: 1,
      unmatched: 1,
      blank: 1
    });
  });

  it('never matches by ModularGrid id collisions', () => {
    const parseResult = parseModularGridExport(JSON.stringify({
      Rack: {name: 'Import', rows: 1, te: 84},
      User: {},
      Module: [{
        id: 4647,
        name: 'Definitely Missing',
        ModulesRack: {row: 1, col: 1}
      }]
    }));
    const preview = buildModularGridMatchPreview(parseResult, [
      moduleFixture(4647, '1HP Blank Panel', 1)
    ]);

    expect(preview?.counts.unmatched).toBe(1);
    expect(preview?.counts.confident).toBe(0);
    expect(preview?.counts.likely).toBe(0);
  });

  it('converts ModularGrid 1-based row and column to Patcher 0-based placement', () => {
    const source = {
      key: '2:13:0',
      mgId: 12,
      name: 'Module',
      row: 2,
      col: 13,
      inferredHp: 8
    };

    expect(toPatcherRackModulePlacement(source, 99)).toEqual({
      moduleId: 99,
      row: 1,
      column: 12,
      sourceKey: '2:13:0'
    });
  });

  it('resolves ModularGrid blank panels to Patcher blank module placements', () => {
    const parseResult = parseModularGridExport(JSON.stringify({
      Rack: {
        name: 'Import',
        rows: 12,
        te: 104,
        rows1u: 'a:1:{i:0;s:2:"11";}'
      },
      User: {},
      Module: [
        {id: 1, name: '4HP Blank Panel', ModulesRack: {row: 1, col: 1}},
        {id: 2, name: '10hp 1U vented blank', ModulesRack: {row: 11, col: 48}}
      ]
    }));
    const preview = buildModularGridMatchPreview(parseResult, []);
    const result = resolveModularGridPlacements(preview, {});

    expect(result.skipped).toBe(0);
    expect(result.placements).toEqual([
      jasmine.objectContaining({moduleId: 4648, row: 0, column: 0}),
      jasmine.objectContaining({moduleId: 4720, row: 10, column: 47})
    ]);
  });

  it('skips ambiguous rows by default while allowing explicit selection', () => {
    const parseResult = parseModularGridExport(JSON.stringify({
      Rack: {name: 'Import', rows: 1, te: 84},
      User: {},
      Module: [{id: 1, name: 'Microcell', ModulesRack: {row: 1, col: 1}}]
    }));
    const preview = buildModularGridMatchPreview(parseResult, [
      moduleFixture(3, 'Microcell', 14),
      moduleFixture(4, 'Microcell Black', 14)
    ]);
    const sourceKey = preview?.ambiguous[0].source.key ?? '';

    expect(resolveModularGridPlacements(preview, {})).toEqual(jasmine.objectContaining({
      placements: [],
      skipped: 1,
      allAmbiguousResolved: true
    }));
    expect(resolveModularGridPlacements(preview, {[sourceKey]: 3}).placements[0]).toEqual(jasmine.objectContaining({
      moduleId: 3,
      row: 0,
      column: 0
    }));
  });

  it('allows duplicate Patcher module placements for duplicate physical modules', () => {
    const parseResult = parseModularGridExport(JSON.stringify({
      Rack: {name: 'Import', rows: 1, te: 84},
      User: {},
      Module: [
        {id: 1, name: 'VOLTERA', ModulesRack: {row: 1, col: 1}},
        {id: 2, name: 'VOLTERA', ModulesRack: {row: 1, col: 5}}
      ]
    }));
    const preview = buildModularGridMatchPreview(parseResult, [
      moduleFixture(2029, 'VOLTERA', 4)
    ]);
    const result = resolveModularGridPlacements(preview, {});

    expect(result.placements.map(placement => placement.moduleId)).toEqual([2029, 2029]);
  });
});
