import {
  EditorModuleCard,
  filterEditorCardsByQuery,
  PATCH_EDITOR_GROUP_MODE_OPTIONS,
  PATCH_EDITOR_SORT_MODE_OPTIONS,
  PATCH_EDITOR_SORT_STRATEGIES,
  resolvePatchEditorSortStrategy,
  sortAndGroupEditorCards
} from './patch-editor.component';


function card(
  id: number,
  moduleName: string,
  manufacturerName: string,
  connectionCount = 0,
  instanceCount = 1,
  collectionUpdated?: string
): EditorModuleCard {
  return {
    module: {
      id,
      name: moduleName,
      collectionUpdated,
      manufacturer: {name: manufacturerName}
    } as any,
    instance: undefined,
    label: undefined,
    instanceCount,
    connectionCount,
    connectionNames: [],
    trackingId: id
  };
}


describe('PATCH_EDITOR_SORT_MODE_OPTIONS', () => {
  it('is a non-empty array of ISelectable items', () => {
    expect(PATCH_EDITOR_SORT_MODE_OPTIONS.length).toBeGreaterThan(0);
    for (const opt of PATCH_EDITOR_SORT_MODE_OPTIONS) {
      expect(typeof opt.id).toBe('string');
      expect(typeof opt.name).toBe('string');
    }
  });
  
  it('contains all expected sort mode IDs', () => {
    const ids = PATCH_EDITOR_SORT_MODE_OPTIONS.map(o => o.id);
    expect(ids).toContain('nameAsc');
    expect(ids).toContain('nameDesc');
    expect(ids).toContain('addedLatest');
    expect(ids).toContain('addedEarliest');
    expect(ids).toContain('manufacturerAsc');
    expect(ids).toContain('manufacturerDesc');
    expect(ids).toContain('connectionsMost');
  });
});


describe('PATCH_EDITOR_GROUP_MODE_OPTIONS', () => {
  it('is a non-empty array', () => {
    expect(PATCH_EDITOR_GROUP_MODE_OPTIONS.length).toBeGreaterThan(0);
  });
  
  it('contains all expected group mode IDs', () => {
    const ids = PATCH_EDITOR_GROUP_MODE_OPTIONS.map(o => o.id);
    expect(ids).toContain('none');
    expect(ids).toContain('manufacturer');
    expect(ids).toContain('connectionState');
    expect(ids).toContain('patchPresence');
  });
});


describe('PATCH_EDITOR_SORT_STRATEGIES', () => {
  it('each strategy has an id, label, backendOrder, and localComparator', () => {
    for (const strategy of Object.values(PATCH_EDITOR_SORT_STRATEGIES)) {
      expect(strategy.id).toBeTruthy();
      expect(strategy.label).toBeTruthy();
      expect(strategy.backendOrder.key).toBeTruthy();
      expect(['asc', 'desc']).toContain(strategy.backendOrder.direction);
      expect(typeof strategy.localComparator).toBe('function');
    }
  });
  
  it('all 7 sort modes are present in the strategies map', () => {
    const keys = Object.keys(PATCH_EDITOR_SORT_STRATEGIES);
    expect(keys).toContain('nameAsc');
    expect(keys).toContain('nameDesc');
    expect(keys).toContain('addedLatest');
    expect(keys).toContain('addedEarliest');
    expect(keys).toContain('manufacturerAsc');
    expect(keys).toContain('manufacturerDesc');
    expect(keys).toContain('connectionsMost');
  });
});


describe('resolvePatchEditorSortStrategy', () => {
  it('returns the named strategy for a valid sort mode id', () => {
    const strategy = resolvePatchEditorSortStrategy('manufacturerDesc');
    expect(strategy.id).toBe('manufacturerDesc');
  });
  
  it('addedEarliest strategy has direction asc in backendOrder', () => {
    const strategy = resolvePatchEditorSortStrategy('addedEarliest');
    expect(strategy.backendOrder.direction).toBe('asc');
  });
  
  it('connectionsMost strategy has a valid localComparator', () => {
    const strategy = resolvePatchEditorSortStrategy('connectionsMost');
    expect(typeof strategy.localComparator).toBe('function');
  });
});


describe('sortAndGroupEditorCards - extended coverage', () => {
  it('connectionsMost tiebreaks by instanceCount when connectionCounts are equal', () => {
    const cards = [
      card(1, 'Alpha', 'Maker', 2, 1),
      card(2, 'Beta', 'Maker', 2, 3), // same connections but more instances
      card(3, 'Gamma', 'Maker', 2, 2)
    ];
    const sorted = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('connectionsMost'), 'none');
    // Higher instanceCount should come first when connectionCount ties
    expect(sorted[0].module.id).toBe(2);
    expect(sorted[1].module.id).toBe(3);
  });
  
  it('connectionsMost tiebreaks by name when both connectionCount and instanceCount are equal', () => {
    const cards = [
      card(3, 'Zeta', 'Maker', 1, 1),
      card(1, 'Alpha', 'Maker', 1, 1),
      card(2, 'Mango', 'Maker', 1, 1)
    ];
    const sorted = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('connectionsMost'), 'none');
    expect(sorted.map(c => c.module.name)).toEqual(['Alpha', 'Mango', 'Zeta']);
  });
  
  it('grouping by manufacturer uses alphabetically sorted group keys', () => {
    const cards = [
      card(1, 'X', 'Mutable Instruments', 0, 1),
      card(2, 'Y', 'Doepfer', 0, 1),
      card(3, 'Z', 'ALM Busy Circuits', 0, 1)
    ];
    const grouped = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('nameAsc'), 'manufacturer');
    // ALM < Doepfer < Mutable (alphabetical by normalized name)
    expect(grouped[0].module.id).toBe(3); // ALM
    expect(grouped[1].module.id).toBe(2); // Doepfer
    expect(grouped[2].module.id).toBe(1); // Mutable
  });
  
  it('addedLatest: cards with equal timestamps fall back to name ordering', () => {
    const sameTs = '2026-01-01T00:00:00.000Z';
    const cards = [
      card(3, 'Zeta', 'Maker', 0, 1, sameTs),
      card(1, 'Alpha', 'Maker', 0, 1, sameTs),
      card(2, 'Mango', 'Maker', 0, 1, sameTs)
    ];
    const sorted = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('addedLatest'), 'none');
    expect(sorted.map(c => c.module.name)).toEqual(['Alpha', 'Mango', 'Zeta']);
  });
  
  it('filterEditorCardsByQuery with null module properties does not throw', () => {
    const cards = [
      {...card(1, 'Alpha', 'Maker'), module: {id: 1, name: null, manufacturer: null} as any}
    ];
    expect(() => filterEditorCardsByQuery(cards, 'alpha')).not.toThrow();
  });
});