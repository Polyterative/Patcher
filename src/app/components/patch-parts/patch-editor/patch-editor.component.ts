import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  debounceTime,
  catchError,
  distinctUntilChanged,
  map,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import {
  MAX_INSTANCES_PER_MODULE,
  PatchDetailDataService
} from 'src/app/components/patch-parts/patch-detail-data.service';
import {
  CurrentUserModulesOrderConfig,
  SupabaseService
} from 'src/app/features/backend/supabase.service';
import { Patch } from 'src/app/models/patch';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import {
  DbModule,
  RackedModule
} from 'src/app/models/module';
import { Rack } from 'src/app/models/rack';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../../module-parts/module-minimal/module-minimal.component';
import {
  FormTypes,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { matchesSearchQuery } from 'src/app/shared-interproject/components/@smart/mat-form-entity/string-utils';
import {
  compareModulesByManufacturerAsc,
  compareModulesByManufacturerDesc,
  compareModulesByNameAsc,
  getModuleNormalizedManufacturer
} from 'src/app/shared-interproject/utils/module-sort-utils';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';


/** One card in the editor module list */
export interface EditorModuleCard {
  module: DbModule;
  /** Set when an instance exists for this card; undefined for modules with 0 instances */
  instance: PatchModuleInstance | undefined;
  /** Display label — only set when there are 2+ instances of the same module */
  label: string | undefined;
  /** How many instances of this module exist in the patch (for showing/hiding delete button) */
  instanceCount: number;
  /** How many connections reference this instance (for indicator + delete confirmation) */
  connectionCount: number;
  /** Human-readable connection summaries for tooltip (max 10) */
  connectionNames: string[];
  /**
   * Stable identity key for @for tracking.
   * Uses instance.id when set; falls back to -(module.id) so the key never flips
   * when the first instance is created (avoids DOM re-creation → no re-animation).
   */
  trackingId: number;
}

type DbModuleWithCollectionUpdated =
  DbModule
  & {
  collectionUpdated?: string | null;
};

type EditorCardComparator = (a: EditorModuleCard, b: EditorModuleCard) => number;
type GroupingKeyGenerator = (card: EditorModuleCard) => string;

export type PatchEditorSortModeId =
  'nameAsc'
  | 'nameDesc'
  | 'addedLatest'
  | 'addedEarliest'
  | 'manufacturerAsc'
  | 'manufacturerDesc'
  | 'connectionsMost';

export type PatchEditorGroupModeId =
  'none'
  | 'manufacturer'
  | 'connectionState'
  | 'patchPresence';

export interface PatchEditorSortStrategy {
  id: PatchEditorSortModeId;
  label: string;
  backendOrder: CurrentUserModulesOrderConfig;
  localComparator: EditorCardComparator;
  groupingKeyGenerator?: GroupingKeyGenerator;
}

export const PATCH_EDITOR_OPERATION_MODES = {
  collection: 'collection',
  linkedRack: 'linkedRack'
} as const;

export type PatchEditorOperationMode =
  typeof PATCH_EDITOR_OPERATION_MODES[keyof typeof PATCH_EDITOR_OPERATION_MODES];

export interface PatchEditorOperationModeOption {
  mode: PatchEditorOperationMode;
  label: string;
}

export interface LinkedRackPreviewCard {
  trackingId: number;
  module: DbModule;
  row: number;
  column: number;
  selectedPanelId: number | null;
}

export interface LinkedRackPreviewRow {
  row: number;
  modules: LinkedRackPreviewCard[];
}

export interface LinkedRackPreviewState {
  kind: 'unlinked' | 'loading' | 'ready' | 'unavailable';
  description: string;
  rack?: Rack;
  rows: LinkedRackPreviewRow[];
  moduleCount: number;
}

const unknownManufacturerGroupKey = '\uffff';

const defaultSortModeId: PatchEditorSortModeId = 'nameAsc';
const defaultGroupModeId: PatchEditorGroupModeId = 'none';
const defaultOperationMode: PatchEditorOperationMode = PATCH_EDITOR_OPERATION_MODES.collection;

export const PATCH_EDITOR_OPERATION_MODE_OPTIONS: ReadonlyArray<PatchEditorOperationModeOption> = [
  {mode: PATCH_EDITOR_OPERATION_MODES.collection, label: 'Collection'},
  {mode: PATCH_EDITOR_OPERATION_MODES.linkedRack, label: 'Linked rack'}
];

const defaultLinkedRackPreviewState: LinkedRackPreviewState = {
  kind: 'unlinked',
  description: 'Link a rack to show read-only rack context below the editor.',
  rows: [],
  moduleCount: 0
};

const loadingLinkedRackPreviewState: LinkedRackPreviewState = {
  kind: 'loading',
  description: 'Loading linked rack context…',
  rows: [],
  moduleCount: 0
};

export const PATCH_EDITOR_SORT_MODE_OPTIONS: ISelectable[] = [
  {
    id: 'nameAsc',
    name: 'Name (A→Z)'
  },
  {
    id: 'nameDesc',
    name: 'Name (Z→A)'
  },
  {
    id: 'addedLatest',
    name: 'Added latest'
  },
  {
    id: 'addedEarliest',
    name: 'Added earliest'
  },
  {
    id: 'manufacturerAsc',
    name: 'Manufacturer (A→Z)'
  },
  {
    id: 'manufacturerDesc',
    name: 'Manufacturer (Z→A)'
  },
  {
    id: 'connectionsMost',
    name: 'Connections (most first)'
  }
];

export const PATCH_EDITOR_GROUP_MODE_OPTIONS: ISelectable[] = [
  {
    id: 'none',
    name: 'Grouping off'
  },
  {
    id: 'manufacturer',
    name: 'Group by manufacturer'
  },
  {
    id: 'connectionState',
    name: 'Group by connection'
  },
  {
    id: 'patchPresence',
    name: 'Group by patch presence'
  }
];


function getCollectionUpdatedValue(card: EditorModuleCard): string {
  return `${ (card.module as DbModuleWithCollectionUpdated)?.collectionUpdated ?? '' }`;
}

function getCollectionUpdatedTimestamp(card: EditorModuleCard): number {
  const value = getCollectionUpdatedValue(card);
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareByTrackingId(a: EditorModuleCard, b: EditorModuleCard): number {
  return a.trackingId - b.trackingId;
}

function compareByNameAscending(a: EditorModuleCard, b: EditorModuleCard): number {
  const moduleComparison = compareModulesByNameAsc(a.module, b.module);
  return moduleComparison !== 0 ? moduleComparison : compareByTrackingId(a, b);
}

function compareByNameDescending(a: EditorModuleCard, b: EditorModuleCard): number {
  return compareByNameAscending(b, a);
}

function compareByAddedLatest(a: EditorModuleCard, b: EditorModuleCard): number {
  const timestampComparison = getCollectionUpdatedTimestamp(b) - getCollectionUpdatedTimestamp(a);
  if (timestampComparison !== 0) {
    return timestampComparison;
  }
  
  const nameComparison = compareByNameAscending(a, b);
  if (nameComparison !== 0) {
    return nameComparison;
  }
  
  return compareByTrackingId(a, b);
}

function compareByAddedEarliest(a: EditorModuleCard, b: EditorModuleCard): number {
  return compareByAddedLatest(b, a);
}

function compareByManufacturerAscending(a: EditorModuleCard, b: EditorModuleCard): number {
  const moduleComparison = compareModulesByManufacturerAsc(a.module, b.module);
  return moduleComparison !== 0 ? moduleComparison : compareByTrackingId(a, b);
}

function compareByManufacturerDescending(a: EditorModuleCard, b: EditorModuleCard): number {
  const moduleComparison = compareModulesByManufacturerDesc(a.module, b.module);
  return moduleComparison !== 0 ? moduleComparison : compareByTrackingId(a, b);
}

function compareByConnectionsMost(a: EditorModuleCard, b: EditorModuleCard): number {
  const connectionComparison = b.connectionCount - a.connectionCount;
  if (connectionComparison !== 0) {
    return connectionComparison;
  }
  
  const instanceComparison = b.instanceCount - a.instanceCount;
  if (instanceComparison !== 0) {
    return instanceComparison;
  }
  
  return compareByNameAscending(a, b);
}

function manufacturerGroupingKeyGenerator(card: EditorModuleCard): string {
  return getModuleNormalizedManufacturer(card.module) || unknownManufacturerGroupKey;
}

export const PATCH_EDITOR_SORT_STRATEGIES: Record<PatchEditorSortModeId, PatchEditorSortStrategy> = {
  nameAsc: {
    id: 'nameAsc',
    label: 'Name (A→Z)',
    backendOrder: {
      key: 'moduleName',
      direction: 'asc'
    },
    localComparator: compareByNameAscending,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  nameDesc: {
    id: 'nameDesc',
    label: 'Name (Z→A)',
    backendOrder: {
      key: 'moduleName',
      direction: 'desc'
    },
    localComparator: compareByNameDescending,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  addedLatest: {
    id: 'addedLatest',
    label: 'Added latest',
    backendOrder: {
      key: 'collectionUpdated',
      direction: 'desc'
    },
    localComparator: compareByAddedLatest,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  addedEarliest: {
    id: 'addedEarliest',
    label: 'Added earliest',
    backendOrder: {
      key: 'collectionUpdated',
      direction: 'asc'
    },
    localComparator: compareByAddedEarliest,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  manufacturerAsc: {
    id: 'manufacturerAsc',
    label: 'Manufacturer (A→Z)',
    backendOrder: {
      key: 'moduleName',
      direction: 'asc'
    },
    localComparator: compareByManufacturerAscending,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  manufacturerDesc: {
    id: 'manufacturerDesc',
    label: 'Manufacturer (Z→A)',
    backendOrder: {
      key: 'moduleName',
      direction: 'asc'
    },
    localComparator: compareByManufacturerDescending,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  },
  connectionsMost: {
    id: 'connectionsMost',
    label: 'Connections (most first)',
    backendOrder: {
      key: 'moduleName',
      direction: 'asc'
    },
    localComparator: compareByConnectionsMost,
    groupingKeyGenerator: manufacturerGroupingKeyGenerator
  }
};

function asSortModeId(value: unknown): PatchEditorSortModeId {
  const modeId = (value as ISelectable)?.id;
  return (modeId === 'nameAsc'
    || modeId === 'nameDesc'
    || modeId === 'addedLatest'
    || modeId === 'addedEarliest'
    || modeId === 'manufacturerAsc'
    || modeId === 'manufacturerDesc'
    || modeId === 'connectionsMost')
    ? modeId
    : defaultSortModeId;
}

function asGroupModeId(value: unknown): PatchEditorGroupModeId {
  const modeId = (value as ISelectable)?.id;
  return (modeId === 'none'
    || modeId === 'manufacturer'
    || modeId === 'connectionState'
    || modeId === 'patchPresence')
    ? modeId
    : defaultGroupModeId;
}

export function filterEditorCardsByQuery(cards: EditorModuleCard[], searchQuery: string): EditorModuleCard[] {
  if (!searchQuery?.trim()) {
    return cards;
  }
  
  return cards.filter(card => matchesSearchQuery(
    searchQuery,
    card.module?.name,
    card.module?.manufacturer?.name
  ));
}

export function resolvePatchEditorSortStrategy(sortModeId: PatchEditorSortModeId): PatchEditorSortStrategy {
  return PATCH_EDITOR_SORT_STRATEGIES[sortModeId] ?? PATCH_EDITOR_SORT_STRATEGIES[defaultSortModeId];
}

export function sortAndGroupEditorCards(
  cards: EditorModuleCard[],
  strategy: PatchEditorSortStrategy,
  groupModeId: PatchEditorGroupModeId
): EditorModuleCard[] {
  const sortedCards = [...cards].sort(strategy.localComparator);
  
  if (groupModeId === 'none') {
    return sortedCards;
  }
  
  const groupedCards = new Map<string, EditorModuleCard[]>();
  for (const card of sortedCards) {
    const groupKey = getGroupKeyForMode(card, strategy, groupModeId);
    const existingGroup = groupedCards.get(groupKey) || [];
    existingGroup.push(card);
    groupedCards.set(groupKey, existingGroup);
  }
  
  const orderedGroupKeys = [...groupedCards.keys()].sort((a, b) => a.localeCompare(b));
  return orderedGroupKeys.flatMap(groupKey => groupedCards.get(groupKey) || []);
}

function getGroupKeyForMode(
  card: EditorModuleCard,
  strategy: PatchEditorSortStrategy,
  groupModeId: PatchEditorGroupModeId
): string {
  if (groupModeId === 'manufacturer') {
    return strategy.groupingKeyGenerator
      ? strategy.groupingKeyGenerator(card)
      : manufacturerGroupingKeyGenerator(card);
  }
  
  if (groupModeId === 'connectionState') {
    return card.connectionCount > 0 ? '0_connected' : '1_not_connected';
  }
  
  if (groupModeId === 'patchPresence') {
    return card.instanceCount > 0 ? '0_in_patch' : '1_not_in_patch';
  }
  
  return '0_default';
}

export function buildLinkedRackPreviewRows(rackedModules: RackedModule[]): LinkedRackPreviewRow[] {
  const rows = new Map<number, LinkedRackPreviewCard[]>();

  for (const rackedModule of rackedModules) {
    const row = rackedModule.rackingData.row ?? 0;
    const rowCards = rows.get(row) ?? [];
    rowCards.push({
      trackingId: rackedModule.rackingData.id ?? ((row + 1) * 100000) + (rackedModule.rackingData.column ?? 0) + rackedModule.module.id,
      module: rackedModule.module,
      row,
      column: rackedModule.rackingData.column ?? 0,
      selectedPanelId: rackedModule.rackingData.selectedPanelId ?? null
    });
    rows.set(row, rowCards);
  }

  return [...rows.entries()]
    .sort(([rowA], [rowB]) => rowA - rowB)
    .map(([row, modules]) => ({
      row,
      modules: [...modules].sort((a, b) => a.column - b.column)
    }));
}

export function buildLinkedRackPreviewState(
  rack: Rack | undefined,
  rackedModules: RackedModule[] = []
): LinkedRackPreviewState {
  if (!rack) {
    return {
      kind: 'unavailable',
      description: 'The linked rack could not be loaded. Collection-first editing still works.',
      rows: [],
      moduleCount: 0
    };
  }

  const rows = buildLinkedRackPreviewRows(rackedModules);
  return {
    kind: 'ready',
    description: 'Read-only rack context only. Module sourcing and editing above still come from your collection.',
    rack,
    rows,
    moduleCount: rackedModules.length
  };
}

@Component({
  selector: 'app-patch-editor',
  templateUrl: './patch-editor.component.html',
  styleUrls: ['./patch-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchEditorComponent implements OnInit, OnDestroy {
  @Input() data: Patch;
  //
  readonly formTypes = FormTypes;
  readonly maxInstances = MAX_INSTANCES_PER_MODULE;
  readonly operationModes = PATCH_EDITOR_OPERATION_MODES;
  readonly operationModeOptions = PATCH_EDITOR_OPERATION_MODE_OPTIONS;
  readonly operationMode$ = new BehaviorSubject<PatchEditorOperationMode>(defaultOperationMode);
  readonly hasLinkedRack$: Observable<boolean>;
  readonly linkedRackPreviewState$ = new BehaviorSubject<LinkedRackPreviewState>(defaultLinkedRackPreviewState);
  readonly sortModeOptions$: Observable<ISelectable[]> = of(PATCH_EDITOR_SORT_MODE_OPTIONS);
  readonly groupModeOptions$: Observable<ISelectable[]> = of(PATCH_EDITOR_GROUP_MODE_OPTIONS);
  readonly moduleSortControl = new UntypedFormControl(PATCH_EDITOR_SORT_MODE_OPTIONS[0]);
  readonly moduleGroupControl = new UntypedFormControl(PATCH_EDITOR_GROUP_MODE_OPTIONS[0]);
  readonly moduleSortModeId$ = this.moduleSortControl.valueChanges.pipe(
    startWith(PATCH_EDITOR_SORT_MODE_OPTIONS[0]),
    map(value => asSortModeId(value)),
    distinctUntilChanged()
  );
  readonly moduleGroupModeId$ = this.moduleGroupControl.valueChanges.pipe(
    startWith(PATCH_EDITOR_GROUP_MODE_OPTIONS[0]),
    map(value => asGroupModeId(value)),
    distinctUntilChanged()
  );
  readonly moduleSortStrategy$ = this.moduleSortModeId$.pipe(
    map(sortModeId => resolvePatchEditorSortStrategy(sortModeId)),
    distinctUntilChanged((a, b) => a.id === b.id)
  );
  readonly moduleSearchControl = new UntypedFormControl('');
  readonly moduleSearchQuery$ = this.moduleSearchControl.valueChanges.pipe(
    startWith(''),
    debounceTime(120),
    map(value => value ?? ''),
    map(value => `${ value }`),
    distinctUntilChanged()
  );

  modulesViewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideLabels:        true,
    hideManufacturer:  true,
    hideDescription:   true,
    hideButtons:       true,
    hideHP:            true,
    hideDates:         true,
    hideTags: true,
    hidePanelsOptions: true,
    hideIoCounts:      true,
    hideReportIssue:   true,
  };
  
  /** Unfiltered collection modules + instances merged into a flat card list */
  sourceEditorCards$ = new BehaviorSubject<EditorModuleCard[]>([]);

  /** Collection modules + instances merged into a flat card list */
  editorCards$ = new BehaviorSubject<EditorModuleCard[]>([]);
  
  /** Module IDs currently in-flight for copy — prevents spam-clicking */
  addingCopy = new Set<number>();
  
  /** Whether collection modules have been loaded at least once */
  collectionLoaded$ = new BehaviorSubject<boolean>(false);
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public backend: SupabaseService,
    public dataService: PatchDetailDataService,
    public appState: AppStateService
  ) {
    this.hasLinkedRack$ = this.dataService.singlePatchData$.pipe(
      map(patch => patch?.linked_rack_id != null),
      distinctUntilChanged()
    );
  }
  
  ngOnDestroy(): void {
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  ngOnInit(): void {
    // Fetch user's collection modules with backend-first ordering for selected sort mode
    this.moduleSortStrategy$
      .pipe(
        switchMap(strategy => this.backend.GET.currentUserModules(
          true,
          false,
          strategy.backendOrder
        )),
        takeUntil(this.destroyEvent$)
      )
      .subscribe((modules: DbModule[]) => {
        this.dataService.collectionModules$.next(modules);
        this.collectionLoaded$.next(true);
      });
    
    // Merge collection modules + instances + connections into editor cards whenever any changes
    combineLatest([
      this.dataService.collectionModules$,
      this.dataService.patchModuleInstances$,
      this.dataService.editorConnections$
    ])
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(cards => {
        const [modules, instances, connections] = cards;
        const editorCards = this.buildEditorCards(modules, instances, connections || []);
        
        // Clear in-flight copy flags for modules whose cards have updated
        this.addingCopy.clear();
        this.sourceEditorCards$.next(editorCards);
      });
    
    // Apply search first, then strategy sorting, then optional grouping
    combineLatest([
      this.sourceEditorCards$,
      this.moduleSearchQuery$,
      this.moduleSortStrategy$,
      this.moduleGroupModeId$
    ])
      .pipe(
        map(([cards, searchQuery, strategy, groupModeId]) => {
          const filteredCards = filterEditorCardsByQuery(cards, searchQuery);
          return sortAndGroupEditorCards(filteredCards, strategy, groupModeId);
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(cards => this.editorCards$.next(cards));

    this.dataService.singlePatchData$
      .pipe(
        map(patch => patch?.linked_rack_id ?? null),
        distinctUntilChanged(),
        switchMap(linkedRackId => {
          if (linkedRackId == null) {
            return of(defaultLinkedRackPreviewState);
          }

          this.linkedRackPreviewState$.next(loadingLinkedRackPreviewState);
          return this.backend.GET.rackWithId(linkedRackId).pipe(
            switchMap((response: any) => {
              const rack = response?.data as Rack | undefined;
              if (!rack) {
                return of(buildLinkedRackPreviewState(undefined));
              }

              return this.backend.get.rackedModules(linkedRackId).pipe(
                map((rackedModules: RackedModule[]) => buildLinkedRackPreviewState(rack, rackedModules)),
                catchError(() => of(buildLinkedRackPreviewState(undefined)))
              );
            }),
            catchError(() => of(buildLinkedRackPreviewState(undefined)))
          );
        }),
        takeUntil(this.destroyEvent$)
      )
      .subscribe(state => this.linkedRackPreviewState$.next(state));

    this.hasLinkedRack$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(hasLinkedRack => {
        if (!hasLinkedRack) {
          this.operationMode$.next(defaultOperationMode);
        }
      });
  }
  
  /** Trigger adding another copy of the same module */
  onAddCopy(card: EditorModuleCard): void {
    this.addingCopy.add(card.module.id);
    this.dataService.addModuleInstance$.next(card.module);
  }

  setOperationMode(mode: PatchEditorOperationMode): void {
    this.operationMode$.next(mode);
  }
  
  /**
   * Merge collection modules with instances into a flat list of cards.
   *
   * - Module with 0 instances → 1 card (no instanceId, no label)
   * - Module with 1 instance  → 1 card (instanceId set, no label)
   * - Module with N instances → N cards (each with instanceId + label "(1)", "(2)", …)
   */
  private buildEditorCards(
    modules: DbModule[],
    instances: PatchModuleInstance[],
    connections: PatchConnection[]
  ): EditorModuleCard[] {
    const cards: EditorModuleCard[] = [];
    
    // Group instances by module_id
    const instancesByModule = new Map<number, PatchModuleInstance[]>();
    for (const inst of instances) {
      const list = instancesByModule.get(inst.module_id) || [];
      list.push(inst);
      instancesByModule.set(inst.module_id, list);
    }
    
    for (const module of modules) {
      const moduleInstances = instancesByModule.get(module.id) || [];
      const count = moduleInstances.length;
      
      if (count <= 1) {
        const inst = moduleInstances[0] ?? undefined;
        const instConns = inst
          ? connections.filter(c => c.instance_id_a === inst.id || c.instance_id_b === inst.id)
          : [];
        // 0 or 1 instance → single card
        cards.push({
          module,
          instance: inst,
          label: undefined,
          instanceCount: count,
          connectionCount: instConns.length,
          connectionNames: this.buildConnectionNames(instConns, inst?.id),
          // Stable key: prefer instance.id; fall back to negative module.id so the key
          // never changes when the first instance is lazily created (prevents re-animation).
          trackingId: inst?.id ?? -module.id
        });
      } else {
        // N instances → N cards with labels
        moduleInstances.forEach((inst, idx) => {
          const instConns = connections.filter(
            c => c.instance_id_a === inst.id || c.instance_id_b === inst.id
          );
          cards.push({
            module,
            instance: inst,
            label: inst.instance_label || `(${ idx + 1 })`,
            instanceCount: count,
            connectionCount: instConns.length,
            connectionNames: this.buildConnectionNames(instConns, inst.id),
            trackingId: inst.id
          });
        });
      }
    }
    
    return cards;
  }
  
  /**
   * Build human-readable connection summaries for an instance's tooltip.
   * Shows "CV → OtherModule: CV" for each connection, capped at 10.
   */
  private buildConnectionNames(
    conns: PatchConnection[],
    instanceId: number | undefined
  ): string[] {
    if (!instanceId || conns.length === 0) return [];
    
    const names = conns.slice(0, 10).map(c => {
      const isA = c.instance_id_a === instanceId;
      const thisCv = isA ? c.a : c.b;
      const otherCv = isA ? c.b : c.a;
      return `${ thisCv.name } → ${ otherCv.module.name }: ${ otherCv.name }`;
    });
    
    if (conns.length > 10) {
      names.push(`… and ${ conns.length - 10 } more`);
    }
    
    return names;
  }
}
