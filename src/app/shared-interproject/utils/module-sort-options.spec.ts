import {
  MODULE_GROUP_OPTIONS,
  MODULE_SORT_OPTIONS
} from './module-sort-utils';


describe('MODULE_SORT_OPTIONS', () => {
  it('is a non-empty array', () => {
    expect(MODULE_SORT_OPTIONS.length).toBeGreaterThan(0);
  });
  
  it('each option has id and name as non-empty strings', () => {
    for (const option of MODULE_SORT_OPTIONS) {
      expect(typeof option.id).toBe('string');
      expect((option.id as string).length).toBeGreaterThan(0);
      expect(typeof option.name).toBe('string');
      expect(option.name.length).toBeGreaterThan(0);
    }
  });
  
  it('contains updatedDesc option', () => {
    const ids = MODULE_SORT_OPTIONS.map(o => o.id);
    expect(ids).toContain('updatedDesc');
  });
  
  it('contains updatedAsc option', () => {
    const ids = MODULE_SORT_OPTIONS.map(o => o.id);
    expect(ids).toContain('updatedAsc');
  });
  
  it('contains nameAsc and nameDesc options', () => {
    const ids = MODULE_SORT_OPTIONS.map(o => o.id);
    expect(ids).toContain('nameAsc');
    expect(ids).toContain('nameDesc');
  });
  
  it('contains hpAsc and hpDesc options', () => {
    const ids = MODULE_SORT_OPTIONS.map(o => o.id);
    expect(ids).toContain('hpAsc');
    expect(ids).toContain('hpDesc');
  });
  
  it('contains insMost and outsMost options', () => {
    const ids = MODULE_SORT_OPTIONS.map(o => o.id);
    expect(ids).toContain('insMost');
    expect(ids).toContain('outsMost');
  });
  
  it('all option ids are unique', () => {
    const ids = MODULE_SORT_OPTIONS.map(o => o.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});


describe('MODULE_GROUP_OPTIONS', () => {
  it('is a non-empty array', () => {
    expect(MODULE_GROUP_OPTIONS.length).toBeGreaterThan(0);
  });
  
  it('contains none, standard and hpRange options', () => {
    const ids = MODULE_GROUP_OPTIONS.map(o => o.id);
    expect(ids).toContain('none');
    expect(ids).toContain('standard');
    expect(ids).toContain('hpRange');
  });
  
  it('each option has non-empty id and name', () => {
    for (const option of MODULE_GROUP_OPTIONS) {
      expect(typeof option.id).toBe('string');
      expect((option.id as string).length).toBeGreaterThan(0);
      expect(typeof option.name).toBe('string');
      expect(option.name.length).toBeGreaterThan(0);
    }
  });
  
  it('all option ids are unique', () => {
    const ids = MODULE_GROUP_OPTIONS.map(o => o.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});