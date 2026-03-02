import { MinimalModule } from 'src/app/models/module';
import {
  compareModulesByHpAsc,
  compareModulesByHpDesc,
  compareModulesByInsMost,
  compareModulesByManufacturerAsc,
  compareModulesByManufacturerDesc,
  compareModulesByNameAsc,
  compareModulesByNameDesc,
  compareModulesByOutsMost,
  compareModulesByUpdatedAsc,
  compareModulesByUpdatedDesc,
  getModuleGroupKey,
  getModuleNormalizedManufacturer,
  getModuleNormalizedName,
  sortAndGroupMinimalModules
} from './module-sort-utils';


function mkModule(overrides: Partial<MinimalModule> = {}): MinimalModule {
  return {
    id: 1,
    name: 'Default',
    description: '',
    hp: 4,
    public: true,
    manufacturer: {id: 1, name: 'Maker'},
    manufacturerId: 1,
    standard: {id: 0, name: '3U'},
    tags: [],
    panels: [],
    created: '2024-01-01T00:00:00.000Z',
    updated: '2024-01-01T00:00:00.000Z',
    ...overrides
  } as MinimalModule;
}


describe('getModuleNormalizedName', () => {
  it('lowercases and removes accents', () => {
    expect(getModuleNormalizedName(mkModule({name: 'Instruō'}))).toBe('instruo');
  });
  
  it('handles missing name gracefully', () => {
    const m = mkModule() as any;
    m.name = undefined;
    expect(getModuleNormalizedName(m)).toBe('');
  });
});


describe('getModuleNormalizedManufacturer', () => {
  it('normalizes manufacturer name', () => {
    expect(getModuleNormalizedManufacturer(mkModule({manufacturer: {id: 1, name: 'Mutable Instruments'}}))).toBe('mutable instruments');
  });
  
  it('handles null manufacturer', () => {
    const m = mkModule() as any;
    m.manufacturer = null;
    expect(getModuleNormalizedManufacturer(m)).toBe('');
  });
});


describe('compareModulesByNameAsc', () => {
  it('sorts A before Z', () => {
    const a = mkModule({name: 'Arp'});
    const b = mkModule({name: 'Zebra'});
    expect(compareModulesByNameAsc(a, b)).toBeLessThan(0);
    expect(compareModulesByNameAsc(b, a)).toBeGreaterThan(0);
  });
  
  it('returns 0 for identical names and manufacturers', () => {
    const a = mkModule({name: 'Rings'});
    const b = mkModule({name: 'Rings'});
    expect(compareModulesByNameAsc(a, b)).toBe(0);
  });
  
  it('uses manufacturer as tiebreaker when names are equal', () => {
    const a = mkModule({name: 'Filter', manufacturer: {id: 1, name: 'Alpha'}});
    const b = mkModule({name: 'Filter', manufacturer: {id: 2, name: 'Zeta'}});
    expect(compareModulesByNameAsc(a, b)).toBeLessThan(0);
  });
});


describe('compareModulesByNameDesc', () => {
  it('is the inverse of nameAsc', () => {
    const a = mkModule({name: 'Alpha'});
    const b = mkModule({name: 'Zeta'});
    const ascResult = compareModulesByNameAsc(a, b);
    const descResult = compareModulesByNameDesc(a, b);
    expect(Math.sign(ascResult)).toBe(-Math.sign(descResult));
  });
});


describe('compareModulesByHpAsc', () => {
  it('places lower HP first', () => {
    const small = mkModule({hp: 2});
    const large = mkModule({hp: 20});
    expect(compareModulesByHpAsc(small, large)).toBeLessThan(0);
  });
  
  it('uses name as tiebreaker when HP is equal', () => {
    const a = mkModule({hp: 8, name: 'Alpha'});
    const b = mkModule({hp: 8, name: 'Zeta'});
    expect(compareModulesByHpAsc(a, b)).toBeLessThan(0);
  });
  
  it('treats missing hp as 0', () => {
    const a = mkModule() as any;
    a.hp = undefined;
    const b = mkModule({hp: 4});
    expect(compareModulesByHpAsc(a, b)).toBeLessThanOrEqual(0);
  });
});


describe('compareModulesByHpDesc', () => {
  it('places higher HP first', () => {
    const small = mkModule({hp: 2});
    const large = mkModule({hp: 20});
    expect(compareModulesByHpDesc(large, small)).toBeLessThan(0);
  });
});


describe('compareModulesByInsMost', () => {
  it('places module with more inputs first', () => {
    const many = mkModule({ins: [{id: 1, name: 'in1'}, {id: 2, name: 'in2'}]} as any);
    const few = mkModule({ins: [{id: 3, name: 'in3'}]} as any);
    expect(compareModulesByInsMost(many, few)).toBeLessThan(0);
  });
  
  it('treats missing ins as 0', () => {
    const a = mkModule();
    const b = mkModule({ins: [{id: 1, name: 'in1'}]} as any);
    expect(compareModulesByInsMost(a, b)).toBeGreaterThan(0);
  });
});


describe('compareModulesByOutsMost', () => {
  it('places module with more outputs first', () => {
    const many = mkModule({outs: [{id: 1, name: 'o1'}, {id: 2, name: 'o2'}, {id: 3, name: 'o3'}]} as any);
    const few = mkModule({outs: [{id: 4, name: 'o4'}]} as any);
    expect(compareModulesByOutsMost(many, few)).toBeLessThan(0);
  });
});


describe('compareModulesByManufacturerAsc', () => {
  it('sorts by manufacturer name A→Z', () => {
    const a = mkModule({manufacturer: {id: 1, name: 'Alpha Mfg'}});
    const b = mkModule({manufacturer: {id: 2, name: 'Zeta Corp'}});
    expect(compareModulesByManufacturerAsc(a, b)).toBeLessThan(0);
  });
  
  it('uses module name as tiebreaker when manufacturers are equal', () => {
    const a = mkModule({name: 'AA', manufacturer: {id: 1, name: 'SameMaker'}});
    const b = mkModule({name: 'ZZ', manufacturer: {id: 1, name: 'SameMaker'}});
    expect(compareModulesByManufacturerAsc(a, b)).toBeLessThan(0);
  });
});


describe('compareModulesByManufacturerDesc', () => {
  it('is the inverse of manufacturerAsc', () => {
    const a = mkModule({manufacturer: {id: 1, name: 'Alpha'}});
    const b = mkModule({manufacturer: {id: 2, name: 'Zeta'}});
    expect(Math.sign(compareModulesByManufacturerDesc(a, b))).toBe(-Math.sign(compareModulesByManufacturerAsc(a, b)));
  });
});


describe('compareModulesByUpdatedAsc', () => {
  it('sorts older timestamps first', () => {
    const old = mkModule({updated: '2020-01-01T00:00:00.000Z'});
    const newer = mkModule({updated: '2024-01-01T00:00:00.000Z'});
    expect(compareModulesByUpdatedAsc(old, newer)).toBeLessThan(0);
  });
  
  it('treats invalid date strings as 0', () => {
    const invalid = mkModule({updated: 'not-a-date'});
    const valid = mkModule({updated: '2024-01-01T00:00:00.000Z'});
    expect(compareModulesByUpdatedAsc(invalid, valid)).toBeLessThan(0);
  });
});


describe('compareModulesByUpdatedDesc', () => {
  it('sorts newer timestamps first', () => {
    const old = mkModule({updated: '2020-01-01T00:00:00.000Z'});
    const newer = mkModule({updated: '2024-01-01T00:00:00.000Z'});
    expect(compareModulesByUpdatedDesc(newer, old)).toBeLessThan(0);
  });
});


describe('getModuleGroupKey', () => {
  it('returns 3U for standard id 0', () => {
    expect(getModuleGroupKey(mkModule({standard: {id: 0, name: '3U'}}), 'standard')).toBe('3U');
  });
  
  it('returns Intellijel 1U for standard id 1', () => {
    expect(getModuleGroupKey(mkModule({standard: {id: 1, name: '1U'}}), 'standard')).toBe('Intellijel 1U');
  });
  
  it('returns PulpLogic 1U for standard id 2', () => {
    expect(getModuleGroupKey(mkModule({standard: {id: 2, name: '1U'}}), 'standard')).toBe('PulpLogic 1U');
  });
  
  it('returns correct HP range labels', () => {
    expect(getModuleGroupKey(mkModule({hp: 2}), 'hpRange')).toBe('1–4 HP');
    expect(getModuleGroupKey(mkModule({hp: 4}), 'hpRange')).toBe('1–4 HP');
    expect(getModuleGroupKey(mkModule({hp: 5}), 'hpRange')).toBe('5–8 HP');
    expect(getModuleGroupKey(mkModule({hp: 8}), 'hpRange')).toBe('5–8 HP');
    expect(getModuleGroupKey(mkModule({hp: 9}), 'hpRange')).toBe('9–14 HP');
    expect(getModuleGroupKey(mkModule({hp: 14}), 'hpRange')).toBe('9–14 HP');
    expect(getModuleGroupKey(mkModule({hp: 15}), 'hpRange')).toBe('15–20 HP');
    expect(getModuleGroupKey(mkModule({hp: 20}), 'hpRange')).toBe('15–20 HP');
    expect(getModuleGroupKey(mkModule({hp: 21}), 'hpRange')).toBe('21+ HP');
    expect(getModuleGroupKey(mkModule({hp: 100}), 'hpRange')).toBe('21+ HP');
  });
  
  it('returns empty string for groupId none', () => {
    expect(getModuleGroupKey(mkModule(), 'none')).toBe('');
  });
  
  it('treats missing hp as 0 for hpRange', () => {
    const m = mkModule() as any;
    m.hp = undefined;
    expect(getModuleGroupKey(m, 'hpRange')).toBe('1–4 HP');
  });
});


describe('sortAndGroupMinimalModules', () => {
  it('sorts by nameAsc', () => {
    const data = [mkModule({id: 1, name: 'Zeta'}), mkModule({id: 2, name: 'Alpha'})];
    const result = sortAndGroupMinimalModules(data, 'nameAsc', 'none');
    expect(result.map(m => m.name)).toEqual(['Alpha', 'Zeta']);
  });
  
  it('sorts by nameDesc', () => {
    const data = [mkModule({id: 1, name: 'Alpha'}), mkModule({id: 2, name: 'Zeta'})];
    const result = sortAndGroupMinimalModules(data, 'nameDesc', 'none');
    expect(result.map(m => m.name)).toEqual(['Zeta', 'Alpha']);
  });
  
  it('sorts by hpAsc', () => {
    const data = [mkModule({id: 1, hp: 14}), mkModule({id: 2, hp: 2}), mkModule({id: 3, hp: 8})];
    const result = sortAndGroupMinimalModules(data, 'hpAsc', 'none');
    expect(result.map(m => m.hp)).toEqual([2, 8, 14]);
  });
  
  it('sorts by hpDesc', () => {
    const data = [mkModule({id: 1, hp: 2}), mkModule({id: 2, hp: 14}), mkModule({id: 3, hp: 8})];
    const result = sortAndGroupMinimalModules(data, 'hpDesc', 'none');
    expect(result.map(m => m.hp)).toEqual([14, 8, 2]);
  });
  
  it('groups by hpRange and sorts groups alphabetically', () => {
    const data = [
      mkModule({id: 1, name: 'Big', hp: 21}),
      mkModule({id: 2, name: 'Tiny', hp: 2}),
      mkModule({id: 3, name: 'Medium', hp: 8})
    ];
    const result = sortAndGroupMinimalModules(data, 'nameAsc', 'hpRange');
    const firstModule = result[0];
    // Groups are sorted alphabetically: '1–4 HP' < '21+ HP' < '5–8 HP'
    expect(firstModule.hp).toBe(2);
  });
  
  it('groups by standard', () => {
    const data = [
      mkModule({id: 1, name: 'A', standard: {id: 1, name: '1U'}}),
      mkModule({id: 2, name: 'B', standard: {id: 0, name: '3U'}}),
      mkModule({id: 3, name: 'C', standard: {id: 2, name: '1U'}})
    ];
    const result = sortAndGroupMinimalModules(data, 'nameAsc', 'standard');
    // Groups: '3U', 'Intellijel 1U', 'PulpLogic 1U' — sorted alphabetically
    expect(result[0].standard.id).toBe(0); // 3U
  });
  
  it('does not mutate the input array', () => {
    const data = [mkModule({id: 1, name: 'B'}), mkModule({id: 2, name: 'A'})];
    const copy = [...data];
    sortAndGroupMinimalModules(data, 'nameAsc', 'none');
    expect(data.map(m => m.name)).toEqual(copy.map(m => m.name));
  });
});