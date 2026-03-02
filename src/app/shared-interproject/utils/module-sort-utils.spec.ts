import { MinimalModule } from 'src/app/models/module';
import { sortAndGroupMinimalModules } from './module-sort-utils';


function createModule(id: number, name: string, updated: string, standardId = 0): MinimalModule {
  return {
    id,
    name,
    description: '',
    hp: 8,
    public: true,
    manufacturer: {id: 1, name: 'Maker'},
    manufacturerId: 1,
    standard: {id: standardId, name: standardId === 0 ? '3U' : '1U'},
    tags: [],
    panels: [],
    created: '2024-01-01T00:00:00.000Z',
    updated
  };
}

describe('module-sort-utils', () => {
  it('preserves backend order when sort mode is backend', () => {
    const original = [
      createModule(12, 'B', '2026-02-01T10:00:00.000Z'),
      createModule(7, 'A', '2026-03-01T10:00:00.000Z'),
      createModule(21, 'C', '2025-12-01T10:00:00.000Z')
    ];
    
    const sorted = sortAndGroupMinimalModules(original, 'backend', 'none');
    
    expect(sorted.map(m => m.id)).toEqual([12, 7, 21]);
  });
  
  it('sorts by updated descending with newest modules first', () => {
    const data = [
      createModule(1, 'Old', '2024-01-01T00:00:00.000Z'),
      createModule(2, 'Newest', '2026-01-01T00:00:00.000Z'),
      createModule(3, 'Middle', '2025-01-01T00:00:00.000Z')
    ];
    
    const sorted = sortAndGroupMinimalModules(data, 'updatedDesc', 'none');
    
    expect(sorted.map(m => m.id)).toEqual([2, 3, 1]);
  });
  
  it('sorts by updated ascending with oldest modules first', () => {
    const data = [
      createModule(1, 'Old', '2024-01-01T00:00:00.000Z'),
      createModule(2, 'Newest', '2026-01-01T00:00:00.000Z'),
      createModule(3, 'Middle', '2025-01-01T00:00:00.000Z')
    ];
    
    const sorted = sortAndGroupMinimalModules(data, 'updatedAsc', 'none');
    
    expect(sorted.map(m => m.id)).toEqual([1, 3, 2]);
  });
});