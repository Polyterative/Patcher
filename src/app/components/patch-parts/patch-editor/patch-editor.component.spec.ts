import {
  buildLinkedRackPreviewRows,
  buildLinkedRackPreviewState,
  EditorModuleCard,
  filterEditorCardsByQuery,
  PATCH_EDITOR_OPERATION_MODE_OPTIONS,
  PatchEditorComponent,
  resolvePatchEditorSortStrategy,
  sortAndGroupEditorCards
} from './patch-editor.component';
import { of } from 'rxjs';


const createCard = (
  moduleName: string,
  manufacturerName: string,
  id: number,
  collectionUpdated?: string,
  connectionCount = 0,
  instanceCount = 1
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
  instanceCount,
  connectionCount,
  connectionNames: [],
  trackingId: id
});


describe('PatchEditorComponent', () => {
  it('should hide module tags in patch editor cards to keep the editor compact', () => {
    const component = new PatchEditorComponent({} as any, {singlePatchData$: of(undefined)} as any, {} as any);
    
    expect(component.modulesViewConfig.hideTags).toBeTrue();
  });

  it('defaults the patch editor operation mode to collection', () => {
    const component = new PatchEditorComponent({} as any, {singlePatchData$: of(undefined)} as any, {} as any);

    expect(component.operationMode$.value).toBe('collection');
  });

  it('exposes collection and linked-rack operation modes', () => {
    expect(PATCH_EDITOR_OPERATION_MODE_OPTIONS.map(option => option.mode)).toEqual(['collection', 'linkedRack']);
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

  it('matches multi-term queries across manufacturer and module name', () => {
    const cards = [
      createCard('Lùbadh', 'Instruō', 1),
      createCard('Maths', 'Make Noise', 2)
    ];
    
    expect(filterEditorCardsByQuery(cards, 'instruo lubadh').map(card => card.module.id)).toEqual([1]);
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
  
  it('sorts by manufacturer in both directions', () => {
    const cards = [
      createCard('Maths', 'Make Noise', 1),
      createCard('A-140', 'Doepfer', 2),
      createCard('Pamela', 'ALM', 3)
    ];
    
    const asc = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('manufacturerAsc'), 'none');
    const desc = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('manufacturerDesc'), 'none');
    
    expect(asc.map(card => card.module.id)).toEqual([3, 2, 1]);
    expect(desc.map(card => card.module.id)).toEqual([1, 2, 3]);
  });
  
  it('sorts by connections with most-connected cards first', () => {
    const cards = [
      createCard('Maths', 'Make Noise', 1, undefined, 3),
      createCard('Plaits', 'Mutable Instruments', 2, undefined, 0),
      createCard('Batumi', 'Xaoc', 3, undefined, 1)
    ];
    
    const sorted = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('connectionsMost'), 'none');
    
    expect(sorted.map(card => card.module.id)).toEqual([1, 3, 2]);
  });
  
  it('groups by connection state with connected modules first', () => {
    const cards = [
      createCard('Alpha', 'Make Noise', 1, undefined, 0),
      createCard('Bravo', 'Make Noise', 2, undefined, 2),
      createCard('Charlie', 'Make Noise', 3, undefined, 1),
      createCard('Delta', 'Make Noise', 4, undefined, 0)
    ];
    
    const grouped = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('nameAsc'), 'connectionState');
    
    expect(grouped.map(card => card.module.id)).toEqual([2, 3, 1, 4]);
  });
  
  it('groups by patch presence with in-patch modules first', () => {
    const cards = [
      createCard('Alpha', 'Make Noise', 1, undefined, 0, 0),
      createCard('Bravo', 'Make Noise', 2, undefined, 0, 2),
      createCard('Charlie', 'Make Noise', 3, undefined, 0, 1)
    ];
    
    const grouped = sortAndGroupEditorCards(cards, resolvePatchEditorSortStrategy('nameAsc'), 'patchPresence');
    
    expect(grouped.map(card => card.module.id)).toEqual([2, 3, 1]);
  });

  it('groups linked-rack preview modules by row and sorts them by column', () => {
    const rows = buildLinkedRackPreviewRows([
      {
        module: {id: 2, name: 'B', manufacturer: {name: 'Maker'}} as any,
        rackingData: {id: 22, row: 1, column: 8, selectedPanelId: null}
      },
      {
        module: {id: 1, name: 'A', manufacturer: {name: 'Maker'}} as any,
        rackingData: {id: 11, row: 0, column: 6, selectedPanelId: null}
      },
      {
        module: {id: 3, name: 'C', manufacturer: {name: 'Maker'}} as any,
        rackingData: {id: 33, row: 1, column: 2, selectedPanelId: null}
      }
    ] as any);

    expect(rows.map(row => row.row)).toEqual([0, 1]);
    expect(rows[1].modules.map(card => card.module.id)).toEqual([3, 2]);
  });

  it('builds an unavailable linked-rack preview state when the rack cannot be loaded', () => {
    const state = buildLinkedRackPreviewState(undefined);

    expect(state.kind).toBe('unavailable');
    expect(state.rows).toEqual([]);
  });

  it('linkedRackInstanceMap$ starts empty', () => {
    const component = new PatchEditorComponent({} as any, {singlePatchData$: of(undefined)} as any, {} as any);

    expect(component.linkedRackInstanceMap$.value.size).toBe(0);
  });
});
