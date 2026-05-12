import {
  buildLinkedRackInstanceMap,
  buildLinkedRackPreviewRows,
  buildLinkedRackPreviewState,
  EditorModuleCard,
  filterEditorCardsByQuery,
  LinkedRackPreviewState,
  PATCH_EDITOR_OPERATION_MODE_OPTIONS,
  PatchEditorComponent,
  resolvePatchEditorSortStrategy,
  sortAndGroupEditorCards
} from './patch-editor.component';
import { of } from 'rxjs';
import { PatchModuleInstance } from 'src/app/models/connection';


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

  it('returns empty rows for empty rack modules list', () => {
    const rows = buildLinkedRackPreviewRows([]);
    expect(rows).toEqual([]);
  });

  it('uses rackingData.id as trackingId', () => {
    const rows = buildLinkedRackPreviewRows([{
      module: {id: 5, name: 'Test'} as any,
      rackingData: {id: 42, row: 0, column: 0, selectedPanelId: null}
    }] as any);

    expect(rows[0].modules[0].trackingId).toBe(42);
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

  // --- buildLinkedRackInstanceMap tests ---

  describe('buildLinkedRackInstanceMap', () => {
    const makePreviewState = (modules: { id: number; moduleId: number; row: number; col: number }[]): LinkedRackPreviewState => {
      const rows = new Map<number, any[]>();
      for (const m of modules) {
        const row = rows.get(m.row) ?? [];
        row.push({trackingId: m.id, module: {id: m.moduleId} as any, row: m.row, column: m.col, selectedPanelId: null});
        rows.set(m.row, row);
      }
      return {
        kind: 'ready',
        description: '',
        rows: [...rows.entries()].sort(([a], [b]) => a - b).map(([row, mods]) => ({row, modules: mods})),
        moduleCount: modules.length
      };
    };

    const makeInstance = (id: number, moduleId: number, label: string | null = null): PatchModuleInstance =>
      ({id, patch_id: 1, module_id: moduleId, instance_label: label}) as PatchModuleInstance;

    it('maps unique modules 1:1 with instances', () => {
      const state = makePreviewState([
        {id: 10, moduleId: 1, row: 0, col: 0},
        {id: 20, moduleId: 2, row: 0, col: 6}
      ]);
      const instances = [makeInstance(100, 1), makeInstance(200, 2)];

      const map = buildLinkedRackInstanceMap(state, instances);

      expect(map.get(10)).toBe(100);
      expect(map.get(20)).toBe(200);
      expect(map.size).toBe(2);
    });

    it('pairs duplicate module rack positions with instances by position order', () => {
      // Same module (id=1) at two rack positions
      const state = makePreviewState([
        {id: 10, moduleId: 1, row: 0, col: 0},
        {id: 20, moduleId: 1, row: 0, col: 8}
      ]);
      const instances = [makeInstance(100, 1, '(1)'), makeInstance(200, 1, '(2)')];

      const map = buildLinkedRackInstanceMap(state, instances);

      // Position (0,0) → first instance, position (0,8) → second instance
      expect(map.get(10)).toBe(100);
      expect(map.get(20)).toBe(200);
      expect(map.size).toBe(2);
    });

    it('leaves unmapped positions when instances are fewer than rack copies', () => {
      // 3 rack copies but only 1 instance
      const state = makePreviewState([
        {id: 10, moduleId: 1, row: 0, col: 0},
        {id: 20, moduleId: 1, row: 0, col: 8},
        {id: 30, moduleId: 1, row: 1, col: 0}
      ]);
      const instances = [makeInstance(100, 1)];

      const map = buildLinkedRackInstanceMap(state, instances);

      expect(map.get(10)).toBe(100);
      expect(map.has(20)).toBe(false);
      expect(map.has(30)).toBe(false);
      expect(map.size).toBe(1);
    });

    it('returns empty map for non-ready preview state', () => {
      const state: LinkedRackPreviewState = {kind: 'loading', description: '', rows: [], moduleCount: 0};
      const instances = [makeInstance(100, 1)];

      const map = buildLinkedRackInstanceMap(state, instances);

      expect(map.size).toBe(0);
    });

    it('pairs by position order: row first, then column', () => {
      // Module appears in row 1 col 2 and row 0 col 5
      const state = makePreviewState([
        {id: 30, moduleId: 1, row: 1, col: 2},
        {id: 10, moduleId: 1, row: 0, col: 5}
      ]);
      const instances = [makeInstance(100, 1, '(1)'), makeInstance(200, 1, '(2)')];

      const map = buildLinkedRackInstanceMap(state, instances);

      // Row 0 comes first → gets instance 100, row 1 → gets instance 200
      expect(map.get(10)).toBe(100);
      expect(map.get(30)).toBe(200);
    });

    it('handles mixed: one module with duplicates, another unique', () => {
      const state = makePreviewState([
        {id: 10, moduleId: 1, row: 0, col: 0},
        {id: 20, moduleId: 2, row: 0, col: 6},
        {id: 30, moduleId: 1, row: 0, col: 12}
      ]);
      const instances = [
        makeInstance(100, 1, '(1)'),
        makeInstance(200, 2),
        makeInstance(300, 1, '(2)')
      ];

      const map = buildLinkedRackInstanceMap(state, instances);

      expect(map.get(10)).toBe(100);   // module 1, position 1
      expect(map.get(30)).toBe(300);   // module 1, position 2
      expect(map.get(20)).toBe(200);   // module 2, unique
      expect(map.size).toBe(3);
    });

    it('ignores extra instances when rack has fewer copies', () => {
      // 1 rack position but 3 instances (orphans from previous rack)
      const state = makePreviewState([
        {id: 10, moduleId: 1, row: 0, col: 0}
      ]);
      const instances = [
        makeInstance(100, 1, '(1)'),
        makeInstance(200, 1, '(2)'),
        makeInstance(300, 1, '(3)')
      ];

      const map = buildLinkedRackInstanceMap(state, instances);

      expect(map.get(10)).toBe(100);
      expect(map.size).toBe(1);
    });

    it('handles empty rack (no modules)', () => {
      const state = makePreviewState([]);
      const instances = [makeInstance(100, 1)];

      const map = buildLinkedRackInstanceMap(state, instances);

      expect(map.size).toBe(0);
    });

    it('handles empty instances (no instances yet)', () => {
      const state = makePreviewState([
        {id: 10, moduleId: 1, row: 0, col: 0}
      ]);

      const map = buildLinkedRackInstanceMap(state, []);

      expect(map.size).toBe(0);
    });

    it('sorts instances by id regardless of array order', () => {
      const state = makePreviewState([
        {id: 10, moduleId: 1, row: 0, col: 0},
        {id: 20, moduleId: 1, row: 0, col: 8}
      ]);
      // Instances in reverse creation order
      const instances = [makeInstance(500, 1, '(2)'), makeInstance(100, 1, '(1)')];

      const map = buildLinkedRackInstanceMap(state, instances);

      // Should sort by id: 100 first, 500 second
      expect(map.get(10)).toBe(100);
      expect(map.get(20)).toBe(500);
    });

    it('handles 8 copies of the same module (max)', () => {
      const positions = Array.from({length: 8}, (_, i) => ({id: i + 1, moduleId: 1, row: Math.floor(i / 4), col: (i % 4) * 8}));
      const state = makePreviewState(positions);
      const instances = Array.from({length: 8}, (_, i) => makeInstance(100 + i, 1, `(${i + 1})`));

      const map = buildLinkedRackInstanceMap(state, instances);

      expect(map.size).toBe(8);
      // Each position paired in order
      for (let i = 0; i < 8; i++) {
        expect(map.get(positions[i].id)).toBe(100 + i);
      }
    });

    it('handles modules with no matching instances (all lazy)', () => {
      const state = makePreviewState([
        {id: 10, moduleId: 1, row: 0, col: 0},
        {id: 20, moduleId: 2, row: 0, col: 8},
        {id: 30, moduleId: 1, row: 1, col: 0}
      ]);
      // Only module 2 has an instance
      const instances = [makeInstance(100, 2)];

      const map = buildLinkedRackInstanceMap(state, instances);

      expect(map.size).toBe(1);
      expect(map.get(20)).toBe(100);
      expect(map.has(10)).toBe(false);
      expect(map.has(30)).toBe(false);
    });

    it('preserves deterministic pairing across recomputation', () => {
      const state = makePreviewState([
        {id: 10, moduleId: 1, row: 0, col: 0},
        {id: 20, moduleId: 1, row: 0, col: 8},
        {id: 30, moduleId: 1, row: 1, col: 0}
      ]);
      const instances = [
        makeInstance(100, 1, '(1)'),
        makeInstance(200, 1, '(2)')
      ];

      // Two separate calls should yield same result
      const map1 = buildLinkedRackInstanceMap(state, instances);
      const map2 = buildLinkedRackInstanceMap(state, instances);

      expect(map1.get(10)).toBe(map2.get(10));
      expect(map1.get(20)).toBe(map2.get(20));
      expect(map1.size).toBe(map2.size);
    });
  });

  describe('getRackModuleConnectionRole', () => {
    let component: PatchEditorComponent;

    beforeEach(() => {
      component = new PatchEditorComponent({} as any, {singlePatchData$: of(undefined)} as any, {} as any);
    });

    it('returns null when no selection exists', () => {
      expect(component.getRackModuleConnectionRole(10, 1, new Map(), null)).toBeNull();
    });

    it('returns role by instance_id match', () => {
      const instanceMap = new Map([[10, 100], [20, 200]]);
      const sel = {
        a: {cv: {module: {id: 1}, instance_id: 100}, kind: 'out' as const},
        b: null
      };

      expect(component.getRackModuleConnectionRole(10, 1, instanceMap, sel as any)).toBe('out');
      // Other copy of same module should NOT match
      expect(component.getRackModuleConnectionRole(20, 1, instanceMap, sel as any)).toBeNull();
    });

    it('falls back to module_id when CV has no instance_id', () => {
      const instanceMap = new Map<number, number>();
      const sel = {
        a: {cv: {module: {id: 1}, instance_id: null}, kind: 'in' as const},
        b: null
      };

      expect(component.getRackModuleConnectionRole(10, 1, instanceMap, sel as any)).toBe('in');
    });

    it('does not highlight unrelated modules', () => {
      const instanceMap = new Map([[10, 100]]);
      const sel = {
        a: {cv: {module: {id: 1}, instance_id: 100}, kind: 'out' as const},
        b: null
      };

      expect(component.getRackModuleConnectionRole(30, 2, instanceMap, sel as any)).toBeNull();
    });

    it('returns roles for both sides in pre-confirm state', () => {
      const instanceMap = new Map([[10, 100], [30, 300]]);
      const sel = {
        a: {cv: {module: {id: 1}, instance_id: 100}, kind: 'out' as const},
        b: {cv: {module: {id: 2}, instance_id: 300}, kind: 'in' as const}
      };

      expect(component.getRackModuleConnectionRole(10, 1, instanceMap, sel as any)).toBe('out');
      expect(component.getRackModuleConnectionRole(30, 2, instanceMap, sel as any)).toBe('in');
    });

    it('only matches the specific copy in pre-confirm when both are same module', () => {
      // Two copies of the same module, one selected as out, the other as in
      const instanceMap = new Map([[10, 100], [20, 200]]);
      const sel = {
        a: {cv: {module: {id: 1}, instance_id: 100}, kind: 'out' as const},
        b: {cv: {module: {id: 1}, instance_id: 200}, kind: 'in' as const}
      };

      expect(component.getRackModuleConnectionRole(10, 1, instanceMap, sel as any)).toBe('out');
      expect(component.getRackModuleConnectionRole(20, 1, instanceMap, sel as any)).toBe('in');
    });
  });

  describe('isRackModuleDimmed', () => {
    let component: PatchEditorComponent;

    beforeEach(() => {
      component = new PatchEditorComponent({} as any, {singlePatchData$: of(undefined)} as any, {} as any);
    });

    it('returns false when nothing is expanded', () => {
      expect(component.isRackModuleDimmed(10, 1, null, null)).toBe(false);
    });

    it('dims other copies of the same module (only clicked copy stays)', () => {
      component.expandedRackTrackingId = 10;
      component.expandedRackModule = {id: 1} as any;

      // Different trackingId, same module.id → should be dimmed
      expect(component.isRackModuleDimmed(20, 1, null, null)).toBe(true);
    });

    it('does not dim the exact clicked position', () => {
      component.expandedRackTrackingId = 10;
      component.expandedRackModule = {id: 1} as any;

      expect(component.isRackModuleDimmed(10, 1, null, null)).toBe(false);
    });

    it('returns true for unrelated modules when something is expanded', () => {
      component.expandedRackTrackingId = 10;
      component.expandedRackModule = {id: 1} as any;

      expect(component.isRackModuleDimmed(30, 2, null, null)).toBe(true);
    });

    it('does not dim modules involved in a pending connection', () => {
      component.expandedRackTrackingId = 10;
      component.expandedRackModule = {id: 1} as any;

      const instanceMap = new Map([[30, 300]]);
      const sel = {
        a: {cv: {module: {id: 2}, instance_id: 300}, kind: 'in' as const},
        b: null
      };

      expect(component.isRackModuleDimmed(30, 2, instanceMap, sel as any)).toBe(false);
    });
  });

  describe('getRackModuleCopyLabel', () => {
    let component: PatchEditorComponent;

    beforeEach(() => {
      component = new PatchEditorComponent({} as any, {singlePatchData$: of(undefined)} as any, {} as any);
    });

    it('returns null for single-copy modules', () => {
      component.linkedRackPreviewState$.next({
        kind: 'ready',
        description: '',
        rows: [{row: 0, modules: [{trackingId: 10, module: {id: 1} as any, row: 0, column: 0, selectedPanelId: null}]}],
        moduleCount: 1
      } as any);

      expect(component.getRackModuleCopyLabel(10, 1)).toBeNull();
    });

    it('returns positional label for duplicate modules', () => {
      component.linkedRackPreviewState$.next({
        kind: 'ready',
        description: '',
        rows: [{
          row: 0,
          modules: [
            {trackingId: 10, module: {id: 1} as any, row: 0, column: 0, selectedPanelId: null},
            {trackingId: 20, module: {id: 1} as any, row: 0, column: 8, selectedPanelId: null}
          ]
        }],
        moduleCount: 2
      } as any);

      expect(component.getRackModuleCopyLabel(10, 1)).toBe('(1)');
      expect(component.getRackModuleCopyLabel(20, 1)).toBe('(2)');
    });

    it('returns null for non-ready preview state', () => {
      component.linkedRackPreviewState$.next({kind: 'loading', description: '', rows: [], moduleCount: 0});

      expect(component.getRackModuleCopyLabel(10, 1)).toBeNull();
    });

    it('sorts by row then column for label assignment', () => {
      component.linkedRackPreviewState$.next({
        kind: 'ready',
        description: '',
        rows: [
          {row: 1, modules: [{trackingId: 30, module: {id: 1} as any, row: 1, column: 0, selectedPanelId: null}]},
          {row: 0, modules: [{trackingId: 10, module: {id: 1} as any, row: 0, column: 5, selectedPanelId: null}]}
        ],
        moduleCount: 2
      } as any);

      // Row 0 comes first → (1), row 1 → (2)
      expect(component.getRackModuleCopyLabel(10, 1)).toBe('(1)');
      expect(component.getRackModuleCopyLabel(30, 1)).toBe('(2)');
    });
  });

  describe('isRackModulePendingSource', () => {
    let component: PatchEditorComponent;

    beforeEach(() => {
      component = new PatchEditorComponent({} as any, {singlePatchData$: of(undefined)} as any, {} as any);
    });

    it('returns false when no selection exists', () => {
      expect(component.isRackModulePendingSource(10, 1, null, null)).toBe(false);
    });

    it('returns true for connection-involved module that is not currently expanded', () => {
      component.expandedRackTrackingId = 20;
      component.expandedRackModule = {id: 2} as any;
      const instanceMap = new Map([[10, 100]]);
      const sel = {
        a: {cv: {module: {id: 1}, instance_id: 100}, kind: 'out' as const},
        b: null
      };

      expect(component.isRackModulePendingSource(10, 1, instanceMap, sel as any)).toBe(true);
    });

    it('returns false for the currently expanded module', () => {
      component.expandedRackTrackingId = 10;
      component.expandedRackModule = {id: 1} as any;
      const instanceMap = new Map([[10, 100]]);
      const sel = {
        a: {cv: {module: {id: 1}, instance_id: 100}, kind: 'out' as const},
        b: null
      };

      expect(component.isRackModulePendingSource(10, 1, instanceMap, sel as any)).toBe(false);
    });
  });

  describe('selectRackModule', () => {
    let component: PatchEditorComponent;

    beforeEach(() => {
      component = new PatchEditorComponent({} as any, {singlePatchData$: of(undefined)} as any, {} as any);
    });

    it('expands a module by trackingId', () => {
      const module = {id: 1, name: 'VCA'} as any;
      component.selectRackModule(10, module);

      expect(component.expandedRackTrackingId).toBe(10);
      expect(component.expandedRackModule).toBe(module);
    });

    it('collapses when clicking the same trackingId again', () => {
      const module = {id: 1, name: 'VCA'} as any;
      component.selectRackModule(10, module);
      component.selectRackModule(10, module);

      expect(component.expandedRackTrackingId).toBeNull();
      expect(component.expandedRackModule).toBeNull();
    });

    it('switches to a different copy of the same module', () => {
      const moduleA = {id: 1, name: 'VCA'} as any;
      const moduleB = {id: 1, name: 'VCA'} as any;
      component.selectRackModule(10, moduleA);
      component.selectRackModule(20, moduleB);

      expect(component.expandedRackTrackingId).toBe(20);
      expect(component.expandedRackModule).toBe(moduleB);
    });

    it('resets when operation mode changes', () => {
      component.selectRackModule(10, {id: 1} as any);
      component.setOperationMode('collection' as any);

      expect(component.expandedRackTrackingId).toBeNull();
      expect(component.expandedRackModule).toBeNull();
    });
  });

  describe('detectLinkedRackDivergence', () => {
    const { detectLinkedRackDivergence } = require('./patch-editor.component');

    const mkPreviewState = (modules: Array<{id: number; name: string; row: number; col: number}>): LinkedRackPreviewState => ({
      kind: 'ready',
      description: '',
      rack: { id: 1, name: 'Test', hp: 84, rows: 1 } as any,
      rows: [{
        row: 0,
        modules: modules.map(m => ({
          trackingId: m.id * 1000,
          module: { id: m.id, name: m.name } as any,
          row: m.row,
          column: m.col,
          selectedPanelId: null
        }))
      }],
      moduleCount: modules.length
    });

    it('returns clean when rack and instances match', () => {
      const state = mkPreviewState([{id: 1, name: 'VCA', row: 0, col: 0}]);
      const instances: PatchModuleInstance[] = [{id: 100, module_id: 1} as any];
      const result = detectLinkedRackDivergence(state, instances, []);
      expect(result.clean).toBeTrue();
      expect(result.totalOrphanedInstances).toBe(0);
    });

    it('returns clean when no instances exist', () => {
      const state = mkPreviewState([{id: 1, name: 'VCA', row: 0, col: 0}]);
      const result = detectLinkedRackDivergence(state, [], []);
      expect(result.clean).toBeTrue();
    });

    it('detects orphaned modules (instance for module not in rack)', () => {
      const state = mkPreviewState([{id: 1, name: 'VCA', row: 0, col: 0}]);
      const instances: PatchModuleInstance[] = [
        {id: 100, module_id: 1} as any,
        {id: 200, module_id: 99} as any
      ];
      const result = detectLinkedRackDivergence(state, instances, []);
      expect(result.clean).toBeFalse();
      expect(result.orphanedModules.length).toBe(1);
      expect(result.orphanedModules[0].moduleId).toBe(99);
      expect(result.totalOrphanedInstances).toBe(1);
    });

    it('detects excess instances (more instances than rack positions)', () => {
      const state = mkPreviewState([{id: 1, name: 'VCA', row: 0, col: 0}]);
      const instances: PatchModuleInstance[] = [
        {id: 100, module_id: 1} as any,
        {id: 101, module_id: 1} as any,
        {id: 102, module_id: 1} as any
      ];
      const result = detectLinkedRackDivergence(state, instances, []);
      expect(result.clean).toBeFalse();
      expect(result.excessInstances.length).toBe(1);
      expect(result.excessInstances[0].patchInstances).toBe(3);
      expect(result.excessInstances[0].rackPositions).toBe(1);
      expect(result.totalOrphanedInstances).toBe(2);
    });

    it('returns clean when preview is not ready', () => {
      const state: LinkedRackPreviewState = {
        kind: 'loading', description: '', rows: [], moduleCount: 0
      };
      const instances: PatchModuleInstance[] = [{id: 100, module_id: 1} as any];
      const result = detectLinkedRackDivergence(state, instances, []);
      expect(result.clean).toBeTrue();
    });

    it('handles multiple orphaned and excess together', () => {
      const state = mkPreviewState([
        {id: 1, name: 'VCA', row: 0, col: 0},
        {id: 1, name: 'VCA', row: 0, col: 1}
      ]);
      const instances: PatchModuleInstance[] = [
        {id: 100, module_id: 1} as any,
        {id: 101, module_id: 1} as any,
        {id: 102, module_id: 1} as any,
        {id: 200, module_id: 50} as any
      ];
      const result = detectLinkedRackDivergence(state, instances, []);
      expect(result.clean).toBeFalse();
      expect(result.orphanedModules.length).toBe(1);
      expect(result.excessInstances.length).toBe(1);
      expect(result.totalOrphanedInstances).toBe(2);
    });
  });

  describe('countOrphanedConnections', () => {
    const { countOrphanedConnections } = require('./patch-editor.component');

    it('returns 0 when no connections exist', () => {
      const map = new Map<number, number>([[1000, 100]]);
      const instances: PatchModuleInstance[] = [{id: 100, module_id: 1} as any];
      expect(countOrphanedConnections(map, instances, [])).toBe(0);
    });

    it('returns 0 when all instances are mapped', () => {
      const map = new Map<number, number>([[1000, 100]]);
      const instances: PatchModuleInstance[] = [{id: 100, module_id: 1} as any];
      const connections = [{instance_id_a: 100, instance_id_b: 100} as any];
      expect(countOrphanedConnections(map, instances, connections)).toBe(0);
    });

    it('counts connections referencing orphaned instances', () => {
      const map = new Map<number, number>([[1000, 100]]);
      const instances: PatchModuleInstance[] = [
        {id: 100, module_id: 1} as any,
        {id: 200, module_id: 2} as any
      ];
      const connections = [
        {instance_id_a: 100, instance_id_b: 200} as any,
        {instance_id_a: 200, instance_id_b: null} as any,
        {instance_id_a: 100, instance_id_b: 100} as any
      ];
      expect(countOrphanedConnections(map, instances, connections)).toBe(2);
    });

    it('returns 0 when all connections have null instance IDs', () => {
      const map = new Map<number, number>([[1000, 100]]);
      const instances: PatchModuleInstance[] = [{id: 100, module_id: 1} as any];
      const connections = [{instance_id_a: null, instance_id_b: null} as any];
      expect(countOrphanedConnections(map, instances, connections)).toBe(0);
    });
  });

  describe('getDivergenceTooltip (buildDivergenceTooltip)', () => {
    const { buildDivergenceTooltip } = require('./patch-editor.component');

    it('includes orphaned module names', () => {
      const divergence = {
        orphanedModules: [{moduleId: 1, moduleName: 'Maths', rackPositions: 0, patchInstances: 2}],
        excessInstances: [],
        totalOrphanedInstances: 2,
        clean: false
      };
      const tooltip = buildDivergenceTooltip(divergence, 0);
      expect(tooltip).toContain('Maths');
      expect(tooltip).toContain('2 instances');
      expect(tooltip).toContain('not in rack');
    });

    it('includes excess instance info', () => {
      const divergence = {
        orphanedModules: [],
        excessInstances: [{moduleId: 1, moduleName: 'VCA', rackPositions: 1, patchInstances: 3}],
        totalOrphanedInstances: 2,
        clean: false
      };
      const tooltip = buildDivergenceTooltip(divergence, 0);
      expect(tooltip).toContain('VCA');
      expect(tooltip).toContain('2 extra instances');
    });

    it('includes orphaned connection count', () => {
      const divergence = {
        orphanedModules: [],
        excessInstances: [{moduleId: 1, moduleName: 'VCA', rackPositions: 1, patchInstances: 2}],
        totalOrphanedInstances: 1,
        clean: false
      };
      const tooltip = buildDivergenceTooltip(divergence, 3);
      expect(tooltip).toContain('3 connections');
    });

    it('always mentions collection mode', () => {
      const divergence = {
        orphanedModules: [{moduleId: 1, moduleName: 'X', rackPositions: 0, patchInstances: 1}],
        excessInstances: [],
        totalOrphanedInstances: 1,
        clean: false
      };
      const tooltip = buildDivergenceTooltip(divergence, 0);
      expect(tooltip).toContain('collection mode');
    });
  });
});
