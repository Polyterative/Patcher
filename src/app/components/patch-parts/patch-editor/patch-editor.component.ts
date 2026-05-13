import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { UntypedFormControl } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  fromEvent,
  Observable,
  of,
  Subject
} from 'rxjs';
import {
  debounceTime,
  catchError,
  distinctUntilChanged,
  filter,
  map,
  startWith,
  switchMap,
  takeUntil
} from 'rxjs/operators';
import {
  MAX_INSTANCES_PER_MODULE,
  PatchDetailDataService
} from 'src/app/components/patch-parts/patch-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { Patch } from 'src/app/models/patch';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { CVConnectionEntity } from 'src/app/models/cv';
import {
  DbModule,
  RackedModule
} from 'src/app/models/module';
import { Rack } from 'src/app/models/rack';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../../module-parts/module-minimal/module-minimal.component';
import { FormTypes } from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import {
  EditorModuleCard,
  LinkedRackDivergence,
  LinkedRackPreviewCard,
  LinkedRackPreviewState,
  PATCH_EDITOR_OPERATION_MODES,
  PatchEditorGroupModeId,
  PatchEditorOperationMode,
  PatchEditorSortModeId,
  PatchEditorSortStrategy,
  RackInlinePanelSide
} from './patch-editor.types';
import {
  asSortModeId,
  asGroupModeId,
  buildDivergenceTooltip,
  buildLinkedRackInstanceMap,
  buildLinkedRackPreviewState,
  countOrphanedConnections,
  defaultLinkedRackPreviewState,
  detectLinkedRackDivergence,
  filterEditorCardsByQuery,
  loadingLinkedRackPreviewState,
  PATCH_EDITOR_GROUP_MODE_OPTIONS,
  PATCH_EDITOR_OPERATION_MODE_OPTIONS,
  PATCH_EDITOR_SORT_MODE_OPTIONS,
  resolveRackInlinePanelSide,
  resolvePatchEditorSortStrategy,
  sortAndGroupEditorCards
} from './patch-editor.utils';

// Re-export for backward compatibility with spec files and external consumers
export type {
  EditorModuleCard,
  PatchEditorSortModeId,
  PatchEditorGroupModeId,
  PatchEditorSortStrategy,
  PatchEditorOperationMode,
  PatchEditorOperationModeOption,
  LinkedRackPreviewCard,
  LinkedRackPreviewRow,
  LinkedRackPreviewState,
  RackInlinePanelSide,
  DivergenceModuleInfo,
  LinkedRackDivergence
} from './patch-editor.types';
export { PATCH_EDITOR_OPERATION_MODES } from './patch-editor.types';
export {
  resolveRackInlinePanelSide,
  filterEditorCardsByQuery,
  resolvePatchEditorSortStrategy,
  sortAndGroupEditorCards,
  buildLinkedRackPreviewRows,
  buildLinkedRackInstanceMap,
  buildLinkedRackPreviewState,
  detectLinkedRackDivergence,
  countOrphanedConnections,
  buildDivergenceTooltip,
  PATCH_EDITOR_OPERATION_MODE_OPTIONS,
  PATCH_EDITOR_SORT_MODE_OPTIONS,
  PATCH_EDITOR_GROUP_MODE_OPTIONS,
  PATCH_EDITOR_SORT_STRATEGIES
} from './patch-editor.utils';


@Component({
  selector: 'app-patch-editor',
  templateUrl: './patch-editor.component.html',
  styleUrls: ['./patch-editor.component.scss'],
  animations: [
    fadeInOnEnterAnimation({
      duration: 225,
      anchor: 'moduleEnter',
      animateChildren: 'after'
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class PatchEditorComponent implements OnInit, OnDestroy {
  @Input() data: Patch;
  @Input() readonly = false;
  //
  readonly formTypes = FormTypes;
  readonly maxInstances = MAX_INSTANCES_PER_MODULE;
  readonly operationModes = PATCH_EDITOR_OPERATION_MODES;
  readonly operationModeOptions = PATCH_EDITOR_OPERATION_MODE_OPTIONS;
  readonly operationMode$: BehaviorSubject<PatchEditorOperationMode>;
  readonly hasLinkedRack$: Observable<boolean>;
  readonly linkedRackPreviewState$ = new BehaviorSubject<LinkedRackPreviewState>(defaultLinkedRackPreviewState);
  readonly sortModeOptions$: Observable<any[]> = of(PATCH_EDITOR_SORT_MODE_OPTIONS);
  readonly groupModeOptions$: Observable<any[]> = of(PATCH_EDITOR_GROUP_MODE_OPTIONS);
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

  /** Currently expanded rack position in the rack visual (for showing CVs) */
  expandedRackTrackingId: number | null = null;
  expandedRackModule: DbModule | null = null;
  expandedRackInlineSide: RackInlinePanelSide = 'right';
  
  /** Whether collection modules have been loaded at least once */
  collectionLoaded$ = new BehaviorSubject<boolean>(false);

  /**
   * Maps rackingData.id (trackingId) → instance_id for linked rack modules.
   * Each rack position gets its own instance for per-copy CV wiring.
   */
  linkedRackInstanceMap$ = new BehaviorSubject<Map<number, number>>(new Map());

  /** Divergence between linked rack and patch instances (orphaned modules, excess copies, etc.) */
  linkedRackDivergence$ = new BehaviorSubject<LinkedRackDivergence>({
    orphanedModules: [], excessInstances: [], totalOrphanedInstances: 0, clean: true
  });

  /** Count of connections referencing instances not mapped to any rack position */
  orphanedConnectionCount$ = new BehaviorSubject<number>(0);

  /** Auto-scale factor for the linked rack visual (fits rack to container width) */
  rackAutoScale = 1;
  rackScaledHeightPx = 0;
  rackScaledWidthPx = 0;
  private rackBaseHeightPx = 0;
  private rackResizeObserver?: ResizeObserver;
  private rackScreenResizeObserver?: ResizeObserver;
  private rackViewportRef?: ElementRef<HTMLElement>;

  @ViewChild('rackViewport', { static: false })
  set rackViewport(ref: ElementRef<HTMLElement> | undefined) {
    this.rackViewportRef = ref;
    this.rackResizeObserver?.disconnect();
    if (ref) {
      this.setupRackAutoScale();
    }
  }

  @ViewChild('rackScreen', { static: false })
  set rackScreen(ref: ElementRef<HTMLElement> | undefined) {
    this.rackScreenResizeObserver?.disconnect();
    if (ref) {
      this.rackScreenResizeObserver = new ResizeObserver(entries => {
        const height = entries[0]?.contentRect.height ?? 0;
        if (height > 0) {
          this.rackBaseHeightPx = height;
          this.rackScaledHeightPx = height * this.rackAutoScale;
          this.cdr.markForCheck();
        }
      });
      this.rackScreenResizeObserver.observe(ref.nativeElement);
    }
  }
  
  protected destroyEvent$ = new Subject<void>();
  
  constructor(
    public backend: SupabaseService,
    public dataService: PatchDetailDataService,
    public appState: AppStateService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {
    this.operationMode$ = this.dataService.editorOperationMode$;
    this.hasLinkedRack$ = this.dataService.linkedRackState$.pipe(
      map(state => state.kind !== 'unlinked'),
      distinctUntilChanged()
    );
  }
  
  ngOnDestroy(): void {
    this.rackResizeObserver?.disconnect();
    this.rackScreenResizeObserver?.disconnect();
    this.destroyEvent$.next();
    this.destroyEvent$.complete();
  }
  
  ngOnInit(): void {
    if (!this.readonly) {
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

      // Close expanded CV panel after a connection is confirmed
      this.dataService.confirmSelectedConnection$
        .pipe(takeUntil(this.destroyEvent$))
        .subscribe(() => {
          this.clearExpandedRackSelection();
        });

      // Capture page-level pointer events so deselection still works even when
      // intermediate components stop bubbling normal click events.
      fromEvent<PointerEvent>(document, 'pointerdown', {capture: true})
        .pipe(
          filter(() => this.expandedRackTrackingId != null),
          filter(event => !this.isInsideRackVisual(event.target)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(() => {
          this.clearExpandedRackSelection();
        });

      // Build trackingId → instance_id map for per-copy CV wiring
      combineLatest([
        this.dataService.patchModuleInstances$,
        this.linkedRackPreviewState$
      ])
        .pipe(
          map(([instances, previewState]) => buildLinkedRackInstanceMap(previewState, instances)),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(map => this.linkedRackInstanceMap$.next(map));

      // Detect divergence between linked rack and patch instances
      combineLatest([
        this.dataService.patchModuleInstances$,
        this.linkedRackPreviewState$,
        this.dataService.patchConnections$
      ])
        .pipe(
          map(([instances, previewState, connections]) =>
            detectLinkedRackDivergence(previewState, instances, connections ?? [])
          ),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(divergence => this.linkedRackDivergence$.next(divergence));

      // Count orphaned connections
      combineLatest([
        this.linkedRackInstanceMap$,
        this.dataService.patchModuleInstances$,
        this.dataService.patchConnections$
      ])
        .pipe(
          map(([instanceMap, instances, connections]) =>
            countOrphanedConnections(instanceMap, instances, connections ?? [])
          ),
          takeUntil(this.destroyEvent$)
        )
        .subscribe(count => this.orphanedConnectionCount$.next(count));
    }

    combineLatest([
      this.dataService.linkedRackState$.pipe(map(state => state.rackId ?? null), distinctUntilChanged()),
      this.backend.auth.getUserSession$()
    ])
      .pipe(
        switchMap(([linkedRackId, user]) => {
          if (linkedRackId == null) {
            return of(defaultLinkedRackPreviewState);
          }

          this.linkedRackPreviewState$.next(loadingLinkedRackPreviewState);
          const rackRead$ = user
            ? this.backend.GET.rackWithId(linkedRackId)
            : this.backend.GET.publicRackWithId(linkedRackId);
          return rackRead$.pipe(
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
      .subscribe(state => {
        this.linkedRackPreviewState$.next(state);
        // Reset expanded module when rack changes (trackingIds are no longer valid)
        this.clearExpandedRackSelection();
        // Seed a preliminary frame height from row count so the frame never
        // collapses to 0 before the ResizeObserver fires.
        if (state.kind === 'ready' && state.rack) {
          const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
          const estimatedHeightPx = state.rows.length * 4 * remPx + 10;
          if (this.rackBaseHeightPx === 0) {
            this.rackBaseHeightPx = estimatedHeightPx;
            this.rackScaledHeightPx = estimatedHeightPx;
            this.cdr.markForCheck();
          }
          queueMicrotask(() => this.updateRackAutoScale(state.rack!.hp));
        }
      });

    this.hasLinkedRack$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(hasLinkedRack => {
        if (hasLinkedRack) {
          this.operationMode$.next(PATCH_EDITOR_OPERATION_MODES.linkedRack);
        } else {
          this.operationMode$.next(PATCH_EDITOR_OPERATION_MODES.collection);
        }
      });

    // Close expanded CV panel after a connection is confirmed so the rack
    // visual shows role colors without a specific module's CVs open.
    this.dataService.confirmSelectedConnection$
      .pipe(takeUntil(this.destroyEvent$))
      .subscribe(() => this.clearExpandedRackSelection());
  }

  /** Trigger adding another copy of the same module */
  onAddCopy(card: EditorModuleCard): void {
    this.addingCopy.add(card.module.id);
    this.dataService.addModuleInstance$.next(card.module);
  }

  onRackModuleClick(trackingId: number, module: DbModule, anchor: HTMLElement): void {
    if (this.readonly) return;
    this.selectRackModule(trackingId, module, anchor);
  }

  clearSearch(): void {
    this.moduleSearchControl.reset('', { emitEvent: true });
  }

  setOperationMode(mode: PatchEditorOperationMode): void {
    this.operationMode$.next(mode);
    this.clearExpandedRackSelection();
  }

  isOperationModeDisabled(mode: PatchEditorOperationMode, hasLinkedRack: boolean): boolean {
    return mode === PATCH_EDITOR_OPERATION_MODES.linkedRack && !hasLinkedRack;
  }

  getOperationModeTooltip(mode: PatchEditorOperationMode, hasLinkedRack: boolean): string {
    if (mode === PATCH_EDITOR_OPERATION_MODES.linkedRack) {
      return hasLinkedRack
        ? 'Rack mode mirrors the linked rack layout so you can patch directly against the modules placed in that rack.'
        : 'Rack mode uses the linked rack as the patching workspace. Link a rack above to enable this mode.';
    }

    return 'Collection mode lets you browse your own modules, search or sort them, and add copies into the patch.';
  }

  getModuleCardConnectionTooltip(card: EditorModuleCard): string {
    if (!card.connectionCount) {
      return '';
    }
    const suffix = card.connectionCount === 1 ? '' : 's';
    return `${ card.connectionCount } connection${ suffix }:\n${ card.connectionNames.join('\n') }`;
  }

  clearExpandedRackSelection(): void {
    this.expandedRackTrackingId = null;
    this.expandedRackModule = null;
    this.expandedRackInlineSide = 'right';
    this.cdr.markForCheck();
  }

  onRackVisualBackgroundClick(event: MouseEvent): void {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('.patch-editor-rack-visual__module-wrapper, .patch-editor-rack-visual__cv-inline')) {
      return;
    }

    this.clearExpandedRackSelection();
  }

  private isInsideRackVisual(target: EventTarget | null): boolean {
    const rackVisual = this.elementRef.nativeElement.querySelector('.patch-editor-rack-visual');
    return rackVisual instanceof HTMLElement
      && target instanceof Node
      && rackVisual.contains(target);
  }

  selectRackModule(trackingId: number, module: DbModule, anchor?: HTMLElement): void {
    if (this.expandedRackTrackingId === trackingId) {
      this.clearExpandedRackSelection();
    } else {
      this.expandedRackTrackingId = trackingId;
      this.expandedRackModule = module;
      this.expandedRackInlineSide = this.resolveRackInlinePanelSide(anchor);
      this.cdr.markForCheck();
    }
  }

  private resolveRackInlinePanelSide(anchor?: HTMLElement): RackInlinePanelSide {
    const visualViewport = typeof window !== 'undefined' ? window.visualViewport : null;
    const viewportWidth = visualViewport?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 0);
    const viewportOffsetLeft = visualViewport?.offsetLeft ?? 0;
    if (!anchor || viewportWidth <= 0) {
      return 'right';
    }

    return resolveRackInlinePanelSide(
      anchor.getBoundingClientRect(),
      viewportWidth,
      viewportOffsetLeft
    );
  }

  /**
   * Returns a positional copy label for a rack module, e.g. "(1)", "(2)".
   * Returns null when the module appears only once in the rack (no disambiguation needed).
   */
  getRackModuleCopyLabel(trackingId: number, moduleId: number): string | null {
    const preview = this.linkedRackPreviewState$.value;
    if (preview.kind !== 'ready') return null;

    const positions: LinkedRackPreviewCard[] = [];
    for (const row of preview.rows) {
      for (const card of row.modules) {
        if (card.module.id === moduleId) positions.push(card);
      }
    }
    if (positions.length <= 1) return null;

    const sorted = [...positions].sort((a, b) => a.row - b.row || a.column - b.column);
    const idx = sorted.findIndex(p => p.trackingId === trackingId);
    return idx >= 0 ? `(${ idx + 1 })` : null;
  }

  /** Builds a detailed tooltip describing rack↔patch divergence */
  getDivergenceTooltip(divergence: LinkedRackDivergence, orphanedConnectionCount: number): string {
    return buildDivergenceTooltip(divergence, orphanedConnectionCount);
  }

  getWorkspaceDescription(
    mode: PatchEditorOperationMode,
    preview: LinkedRackPreviewState,
    divergence: LinkedRackDivergence | null,
    orphanedConnectionCount: number
  ): string {
    if (mode === PATCH_EDITOR_OPERATION_MODES.collection) {
      return 'Browse your collection, search or sort what is available, then add copies to the patch and use their ins and outs to build connections.';
    }

    return this.getRackWorkspaceMessage(preview);
  }

  getRackWorkspaceMessage(preview: LinkedRackPreviewState): string {
    return preview.description;
  }

  getRackToolbarSummary(
    preview: LinkedRackPreviewState,
    divergence: LinkedRackDivergence | null,
    orphanedConnectionCount: number
  ): string {
    if (preview.kind !== 'ready' || !preview.rack) {
      return '';
    }

    if (divergence && !divergence.clean) {
      const connectionSuffix = orphanedConnectionCount > 0
        ? ` · ${ orphanedConnectionCount } connection${ orphanedConnectionCount === 1 ? '' : 's' } affected`
        : '';
      const instanceVerb = divergence.totalOrphanedInstances === 1 ? 'sits' : 'sit';
      return `Linked rack warning — Rack and patch copies have diverged. ${ divergence.totalOrphanedInstances } instance${ divergence.totalOrphanedInstances === 1 ? '' : 's' } ${ instanceVerb } outside the current rack${ connectionSuffix }.`;
    }

    return `${ preview.rack.name } · ${ preview.rack.rows } row${ preview.rack.rows === 1 ? '' : 's' } · ${ preview.rack.hp } HP · ${ preview.moduleCount } placed module${ preview.moduleCount === 1 ? '' : 's' }`;
  }

  /** True when this module should be visually dimmed in the rack visual. */
  isRackModuleDimmed(
    trackingId: number,
    moduleId: number,
    instanceMap: Map<number, number> | null,
    sel: { a: CVConnectionEntity | null; b: CVConnectionEntity | null } | null
  ): boolean {
    if (!this.expandedRackTrackingId) return false;
    // Only the exact clicked position stays un-dimmed
    if (this.expandedRackTrackingId === trackingId) return false;
    // Never dim modules involved in a pending or pre-confirm connection
    if (this.getRackModuleConnectionRole(trackingId, moduleId, instanceMap, sel) != null) return false;
    return true;
  }

  /** True when this module is part of a pending/pre-confirm connection (but not the currently selected one). */
  isRackModulePendingSource(
    trackingId: number,
    moduleId: number,
    instanceMap: Map<number, number> | null,
    sel: { a: CVConnectionEntity | null; b: CVConnectionEntity | null } | null
  ): boolean {
    if (!sel?.a) return false;
    const role = this.getRackModuleConnectionRole(trackingId, moduleId, instanceMap, sel);
    if (!role) return false;
    return this.expandedRackTrackingId !== trackingId;
  }

  /** Returns the connection role ('in' | 'out') for a specific rack position in a pending connection, or null. */
  getRackModuleConnectionRole(
    trackingId: number,
    moduleId: number,
    instanceMap: Map<number, number> | null,
    sel: { a: CVConnectionEntity | null; b: CVConnectionEntity | null } | null
  ): 'in' | 'out' | null {
    if (!sel?.a && !sel?.b) return null;
    const myInstanceId = instanceMap?.get(trackingId);

    // Check side A
    if (sel.a?.cv.module?.id === moduleId) {
      if (sel.a.cv.instance_id != null) {
        if (sel.a.cv.instance_id === myInstanceId) return sel.a.kind;
      } else {
        return sel.a.kind;
      }
    }

    // Check side B
    if (sel.b?.cv.module?.id === moduleId) {
      if (sel.b.cv.instance_id != null) {
        if (sel.b.cv.instance_id === myInstanceId) return sel.b.kind;
      } else {
        return sel.b.kind;
      }
    }

    return null;
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
        cards.push({
          module,
          instance: inst,
          label: undefined,
          instanceCount: count,
          connectionCount: instConns.length,
          connectionNames: this.buildConnectionNames(instConns, inst?.id),
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

  /** Compute auto-scale so the rack visual fits within its container width */
  updateRackAutoScale(rackHp: number): void {
    const containerWidth = this.rackViewportRef?.nativeElement.clientWidth ?? 0;
    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const rackWidthPx = rackHp * remPx;
    this.rackAutoScale = (rackWidthPx > 0 && containerWidth > 0)
      ? Math.min(1, containerWidth / rackWidthPx)
      : 1;
    this.rackScaledWidthPx = rackWidthPx * this.rackAutoScale;
    this.rackScaledHeightPx = this.rackBaseHeightPx * this.rackAutoScale;
    this.cdr.markForCheck();
  }

  private setupRackAutoScale(): void {
    if (!this.rackViewportRef) return;
    this.rackResizeObserver = new ResizeObserver(() => {
      const state = this.linkedRackPreviewState$.value;
      if (state.kind === 'ready' && state.rack) {
        this.updateRackAutoScale(state.rack.hp);
      }
    });
    this.rackResizeObserver.observe(this.rackViewportRef.nativeElement);
  }
}
