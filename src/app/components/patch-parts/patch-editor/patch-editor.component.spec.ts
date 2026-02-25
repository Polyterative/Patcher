import {
  EditorModuleCard,
  filterEditorCardsByQuery,
  PatchEditorComponent,
  resolvePatchEditorSortStrategy,
  sortAndGroupEditorCards
} from './patch-editor.component';


const createCard = (
  moduleName: string,
  manufacturerName: string,
  id: number,
  collectionUpdated?: string
): EditorModuleCard => ({
  module: {
    id,
    name: moduleName,
    collectionUpdated,
    manufacturer: {
      name: manufacturerName
    }
  } as any,
  instance: undefined,
  label: undefined,
  instanceCount: 1,
  connectionCount: 0,
  connectionNames: [],
  trackingId: id
});


describe('PatchEditorComponent', () => {
  it('should hide module tags in patch editor cards to keep the editor compact', () => {
    const component = new PatchEditorComponent({} as any, {} as any);
    
    expect(component.modulesViewConfig.hideTags).toBeTrue();
  });
  
  it('returns all cards when search query is empty', () => {
    const cards = [
      createCard('Maths', 'Make Noise', 1),
      createCard('Disting mk4', 'Expert Sleepers', 2)
    ];
    
    expect(filterEditorCardsByQuery(cards, '')).toEqual(cards);
  });
  
  it('filters cards by module name and manufacturer', () => {
    const cards = [
      createCard('Maths', 'Make Noise', 1),
      createCard('Plaits', 'Mutable Instruments', 2),
      createCard('Disting mk4', 'Expert Sleepers', 3)
    ];
    
    expect(filterEditorCardsByQuery(cards, 'plai').map(card => card.module.id)).toEqual([2]);
    expect(filterEditorCardsByQuery(cards, 'expert').map(card => card.module.id)).toEqual([3]);
  });
  
  it('filters cards using normalized search input', () => {
    const cards = [
      createCard('Instruō Cèis', 'Instruō', 1),
      createCard('Maths', 'Make Noise', 2)
    ];
    
    expect(filterEditorCardsByQuery(cards, 'instruo').map(card => card.module.id)).toEqual([1]);
    expect(filterEditorCardsByQuery(cards, 'ceis').map(card => card.module.id)).toEqual([1]);
  });
  
  it('resolves added latest strategy with backend collection-updated ordering', () => {
    const strategy = resolvePatchEditorSortStrategy('addedLatest');
    
    expect(strategy.backendOrder).toEqual({
      key: 'collectionUpdated',
      direction: 'desc'
    });
  });
  
  it('sorts by name in both directions using deterministic local fallback', () => {
    const cards = [
      createCard('Maths', 'Make Noise', 1),
      createCard('plaits', 'Mutable Instruments', 2),
      createCard('Plaits', '4ms', 3)
    ];
    
    const asc = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('nameAsc'), 'none');
    const desc = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('nameDesc'), 'none');
    
    expect(asc.map(card => card.module.id)).toEqual([1, 3, 2]);
    expect(desc.map(card => card.module.id)).toEqual([2, 3, 1]);
  });
  
  it('sorts by collection add order using latest and earliest strategies', () => {
    const cards = [
      createCard('Maths', 'Make Noise', 1, '2026-01-01T00:00:00.000Z'),
      createCard('Plaits', 'Mutable Instruments', 2, '2026-02-10T00:00:00.000Z'),
      createCard('Batumi', 'Xaoc Devices', 3, '2026-01-15T00:00:00.000Z')
    ];
    
    const latest = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('addedLatest'), 'none');
    const earliest = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('addedEarliest'), 'none');
    
    expect(latest.map(card => card.module.id)).toEqual([2, 3, 1]);
    expect(earliest.map(card => card.module.id)).toEqual([1, 3, 2]);
  });
  
  it('groups by manufacturer while preserving active sort order inside each group', () => {
    const cards = [
      createCard('Alpha', 'Mutable Instruments', 1, '2026-02-01T00:00:00.000Z'),
      createCard('Bravo', 'Doepfer', 2, '2026-02-11T00:00:00.000Z'),
      createCard('Charlie', 'Mutable Instruments', 3, '2026-02-10T00:00:00.000Z'),
      createCard('Delta', 'Doepfer', 4, '2026-01-05T00:00:00.000Z')
    ];
    
    const grouped = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('addedLatest'), 'manufacturer');
    
    expect(grouped.map(card => card.module.id)).toEqual([2, 4, 3, 1]);
  });
});
