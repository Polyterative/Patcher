import { MinimalModule } from 'src/app/models/module';
import {
  compareModulesByHpAsc,
  compareModulesByHpDesc,
  compareModulesByNameAsc,
  compareModulesByNameDesc,
  getModuleGroupKey,
  getModuleNormalizedManufacturer,
  getModuleNormalizedName,
  sortAndGroupMinimalModules
} from './module-sort-utils';


function createModule(overrides: Partial<MinimalModule> & {id: number; name: string}): MinimalModule {
  return {
    description: '',
    hp: 8,
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

describe('module-sort-utils', () => {
  it('preserves backend order when sort mode is backend', () => {
    const original = [
      createModule({id: 12, name: 'B', updated: '2026-02-01T10:00:00.000Z'}),
      createModule({id: 7, name: 'A', updated: '2026-03-01T10:00:00.000Z'}),
      createModule({id: 21, name: 'C', updated: '2025-12-01T10:00:00.000Z'})
    ];
    
    const sorted = sortAndGroupMinimalModules(original, 'backend', 'none');
    
    expect(sorted.map(m => m.id)).toEqual([12, 7, 21]);
  });
  
  it('sorts by updated descending with newest modules first', () => {
    const data = [
      createModule({id: 1, name: 'Old', updated: '2024-01-01T00:00:00.000Z'}),
      createModule({id: 2, name: 'Newest', updated: '2026-01-01T00:00:00.000Z'}),
      createModule({id: 3, name: 'Middle', updated: '2025-01-01T00:00:00.000Z'})
    ];
    
    const sorted = sortAndGroupMinimalModules(data, 'updatedDesc', 'none');
    
    expect(sorted.map(m => m.id)).toEqual([2, 3, 1]);
  });
  
  it('sorts by updated ascending with oldest modules first', () => {
    const data = [
      createModule({id: 1, name: 'Old', updated: '2024-01-01T00:00:00.000Z'}),
      createModule({id: 2, name: 'Newest', updated: '2026-01-01T00:00:00.000Z'}),
      createModule({id: 3, name: 'Middle', updated: '2025-01-01T00:00:00.000Z'})
    ];
    
    const sorted = sortAndGroupMinimalModules(data, 'updatedAsc', 'none');
    
    expect(sorted.map(m => m.id)).toEqual([1, 3, 2]);
  });

  it('getModuleNormalizedName lowercases module name', () => {
    const m = createModule({id: 1, name: 'Maths'});
    expect(getModuleNormalizedName(m)).toBe('maths');
  });

  it('getModuleNormalizedManufacturer lowercases manufacturer name', () => {
    const m = createModule({id: 1, name: 'Rings', manufacturer: {id: 1, name: 'Mutable Instruments'}} as any);
    expect(getModuleNormalizedManufacturer(m)).toBe('mutable instruments');
  });

  it('compareModulesByNameAsc orders alphabetically', () => {
    const a = createModule({id: 1, name: 'Rings'});
    const b = createModule({id: 2, name: 'Clouds'});
    expect(compareModulesByNameAsc(a, b)).toBeGreaterThan(0);
    expect(compareModulesByNameAsc(b, a)).toBeLessThan(0);
  });

  it('compareModulesByNameDesc is the reverse of nameAsc', () => {
    const a = createModule({id: 1, name: 'A'});
    const b = createModule({id: 2, name: 'B'});
    expect(compareModulesByNameDesc(a, b)).toBeGreaterThan(0);
  });

  it('compareModulesByHpAsc orders by HP ascending', () => {
    const small = createModule({id: 1, name: 'S', hp: 4});
    const large = createModule({id: 2, name: 'L', hp: 20});
    expect(compareModulesByHpAsc(small, large)).toBeLessThan(0);
    expect(compareModulesByHpAsc(large, small)).toBeGreaterThan(0);
  });

  it('compareModulesByHpDesc orders by HP descending', () => {
    const small = createModule({id: 1, name: 'S', hp: 4});
    const large = createModule({id: 2, name: 'L', hp: 20});
    expect(compareModulesByHpDesc(small, large)).toBeGreaterThan(0);
  });

  it('sortAndGroupMinimalModules groups by standard using standard name buckets', () => {
    const u1 = createModule({id: 1, name: 'Tile', standard: {id: 1, name: '1U'}} as any);
    const u3 = createModule({id: 2, name: 'VCO', standard: {id: 0, name: '3U'}} as any);
    const result = sortAndGroupMinimalModules([u1, u3], 'nameAsc', 'standard');
    const ids = result.map(m => m.id);
    const idx1U = ids.indexOf(1);
    const idx3U = ids.indexOf(2);
    expect(Math.abs(idx1U - idx3U)).toBe(1);
  });

  it('getModuleGroupKey returns HP range bucket for hpRange group', () => {
    const tiny = createModule({id: 1, name: 'T', hp: 2});
    const med = createModule({id: 2, name: 'M', hp: 8});
    const big = createModule({id: 3, name: 'B', hp: 16});
    expect(getModuleGroupKey(tiny, 'hpRange')).toBe('1–4 HP');
    expect(getModuleGroupKey(med, 'hpRange')).toBe('5–8 HP');
    expect(getModuleGroupKey(big, 'hpRange')).toBe('15–20 HP');
  });

  it('sortAndGroupMinimalModules sorts by nameAsc across full list', () => {
    const data = [
      createModule({id: 3, name: 'Clouds'}),
      createModule({id: 1, name: 'Arp'}),
      createModule({id: 2, name: 'Braids'})
    ];
    const result = sortAndGroupMinimalModules(data, 'nameAsc', 'none');
    expect(result.map(m => m.id)).toEqual([1, 2, 3]);
  });
});