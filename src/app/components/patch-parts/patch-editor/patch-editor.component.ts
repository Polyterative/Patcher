import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
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
import { animate, style, transition, trigger } from '@angular/animations';
import { UntypedFormControl } from '@angular/forms';
import {
  BehaviorSubject,
  fromEvent,
  Observable
} from 'rxjs';
import {
  filter,
  takeUntil
} from 'rxjs/operators';
import { PatchDetailDataService } from 'src/app/components/patch-parts/patch-detail-data.service';
import { Patch } from 'src/app/models/patch';
import {
  PatchConnection,
  PatchModuleInstance
} from 'src/app/models/connection';
import { CVConnectionEntity } from 'src/app/models/cv';
import { DbModule } from 'src/app/models/module';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../../module-parts/module-minimal/module-minimal.component';
import {
  FormTypes,
  ISelectable
} from 'src/app/shared-interproject/components/@smart/mat-form-entity/form-element-models';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import {
  EditorModuleCard,
  LinkedRackDivergence,
  LinkedRackPreviewState,
  PATCH_EDITOR_OPERATION_MODES,
  PatchEditorGroupModeId,
  PatchEditorOperationMode,
  PatchEditorSortModeId,
  PatchEditorSortStrategy,
  RackInlinePanelSide
} from './patch-editor.types';
import {
  buildDivergenceTooltip,
  PATCH_EDITOR_OPERATION_MODE_OPTIONS,
  resolveRackInlinePanelSide
} from './patch-editor.utils';
import { PatchEditorStateService } from './patch-editor-state.service';
import {
  buildConnectionNames as buildConnectionNamesHelper,
  buildEditorCards as buildEditorCardsHelper
} from './patch-editor-card.utils';
import * as PatchEditorViewUtils from './patch-editor-view.utils';

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
    trigger('moduleEnter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('225ms ease', style({opacity: 1}))
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
  providers: [PatchEditorStateService]
})
export class PatchEditorComponent extends SubManager implements OnInit, OnDestroy {
  @Input() data: Patch;
  @Input() readonly = false;
  //
  readonly formTypes = FormTypes;
  readonly maxInstances: number;
  readonly operationModes = PATCH_EDITOR_OPERATION_MODES;
  readonly operationModeOptions: typeof PATCH_EDITOR_OPERATION_MODE_OPTIONS;
  readonly operationMode$: BehaviorSubject<PatchEditorOperationMode>;
  readonly hasLinkedRack$: Observable<boolean>;
  readonly linkedRackPreviewState$: BehaviorSubject<LinkedRackPreviewState>;
  readonly sortModeOptions$: Observable<ISelectable[]>;
  readonly groupModeOptions$: Observable<ISelectable[]>;
  readonly moduleSortControl: UntypedFormControl;
  readonly moduleGroupControl: UntypedFormControl;
  readonly moduleSortModeId$: Observable<PatchEditorSortModeId>;
  readonly moduleGroupModeId$: Observable<PatchEditorGroupModeId>;
  readonly moduleSortStrategy$: Observable<PatchEditorSortStrategy>;
  readonly moduleSearchControl: UntypedFormControl;
  readonly moduleSearchQuery$: Observable<string>;

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
  sourceEditorCards$: BehaviorSubject<EditorModuleCard[]>;

  /** Collection modules + instances merged into a flat card list */
  editorCards$: BehaviorSubject<EditorModuleCard[]>;
  
  /** Module IDs currently in-flight for copy — prevents spam-clicking */
  addingCopy: Set<number>;

  /** Currently expanded rack position in the rack visual (for showing CVs) */
  expandedRackTrackingId: number | null = null;
  expandedRackModule: DbModule | null = null;
  expandedRackInlineSide: RackInlinePanelSide = 'right';
  
  /** Whether collection modules have been loaded at least once */
  collectionLoaded$: BehaviorSubject<boolean>;

  /**
   * Maps rackingData.id (trackingId) → instance_id for linked rack modules.
   * Each rack position gets its own instance for per-copy CV wiring.
   */
  linkedRackInstanceMap$: BehaviorSubject<Map<number, number>>;

  /** Divergence between linked rack and patch instances (orphaned modules, excess copies, etc.) */
  linkedRackDivergence$: BehaviorSubject<LinkedRackDivergence>;

  /** Count of connections referencing instances not mapped to any rack position */
  orphanedConnectionCount$: BehaviorSubject<number>;

  /** Auto-scale factor for the linked rack visual (fits rack to container width) */
  rackAutoScale = 1;
  rackScaledHeightPx = 0;
  rackScaledWidthPx = 0;
  private rackBaseHeightPx = 0;
  private rackResizeObserver?: ResizeObserver;
  private rackScreenResizeObserver?: ResizeObserver;
  private rackViewportRef?: ElementRef<HTMLElement>;
  private readonly editorState: PatchEditorStateService;

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
  
  constructor(
    public dataService: PatchDetailDataService,
    public appState: AppStateService,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef,
    private analytics: AnalyticsService,
    editorState?: PatchEditorStateService
  ) {
    super();
    this.editorState = editorState ?? new PatchEditorStateService(this.dataService, this.analytics);
    this.maxInstances = this.editorState.maxInstances;
    this.operationModeOptions = this.editorState.operationModeOptions;
    this.operationMode$ = this.editorState.operationMode$;
    this.hasLinkedRack$ = this.editorState.hasLinkedRack$;
    this.linkedRackPreviewState$ = this.editorState.linkedRackPreviewState$;
    this.sortModeOptions$ = this.editorState.sortModeOptions$;
    this.groupModeOptions$ = this.editorState.groupModeOptions$;
    this.moduleSortControl = this.editorState.moduleSortControl;
    this.moduleGroupControl = this.editorState.moduleGroupControl;
    this.moduleSortModeId$ = this.editorState.moduleSortModeId$;
    this.moduleGroupModeId$ = this.editorState.moduleGroupModeId$;
    this.moduleSortStrategy$ = this.editorState.moduleSortStrategy$;
    this.moduleSearchControl = this.editorState.moduleSearchControl;
    this.moduleSearchQuery$ = this.editorState.moduleSearchQuery$;
    this.sourceEditorCards$ = this.editorState.sourceEditorCards$;
    this.editorCards$ = this.editorState.editorCards$;
    this.addingCopy = this.editorState.addingCopy;
    this.collectionLoaded$ = this.editorState.collectionLoaded$;
    this.linkedRackInstanceMap$ = this.editorState.linkedRackInstanceMap$;
    this.linkedRackDivergence$ = this.editorState.linkedRackDivergence$;
    this.orphanedConnectionCount$ = this.editorState.orphanedConnectionCount$;
  }
  
  ngOnDestroy(): void {
    this.rackResizeObserver?.disconnect();
    this.rackScreenResizeObserver?.disconnect();
    this.editorState.ngOnDestroy();
    super.ngOnDestroy();
  }
  
  ngOnInit(): void {
    this.editorState.connect({
      readonly: this.readonly,
      clearExpandedRackSelection: () => this.clearExpandedRackSelection(),
      prepareRackPreviewFrame: state => this.prepareRackPreviewFrame(state)
    });

    if (!this.readonly) {
      // Capture page-level pointer events so deselection still works even when
      // intermediate components stop bubbling normal click events.
      fromEvent<PointerEvent>(document, 'pointerdown', {capture: true})
        .pipe(
          filter(() => this.expandedRackTrackingId != null),
          filter(event => !this.isInsideRackVisual(event.target)),
          this.takeUntilDestroyed()
        )
        .subscribe(() => {
          this.clearExpandedRackSelection();
        });
    }
  }

  private prepareRackPreviewFrame(state: LinkedRackPreviewState): void {
    if (state.kind !== 'ready' || !state.rack) {
      return;
    }

    const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const estimatedHeightPx = state.rows.length * 4 * remPx + 10;
    if (this.rackBaseHeightPx === 0) {
      this.rackBaseHeightPx = estimatedHeightPx;
      this.rackScaledHeightPx = estimatedHeightPx;
      this.cdr.markForCheck();
    }
    queueMicrotask(() => this.updateRackAutoScale(state.rack!.hp));
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
    this.analytics.capture('patch.editor_mode_changed', {
      patch_id: this.dataService.singlePatchData$.value?.id,
      mode,
      trigger: 'user'
    });
    this.clearExpandedRackSelection();
  }

  isOperationModeDisabled(mode: PatchEditorOperationMode, hasLinkedRack: boolean): boolean {
    return PatchEditorViewUtils.isOperationModeDisabled(mode, hasLinkedRack);
  }

  getOperationModeTooltip(mode: PatchEditorOperationMode, hasLinkedRack: boolean): string {
    return PatchEditorViewUtils.getOperationModeTooltip(mode, hasLinkedRack);
  }

  getModuleCardConnectionTooltip(card: EditorModuleCard): string {
    return PatchEditorViewUtils.getModuleCardConnectionTooltip(card);
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

  getRackModuleCopyLabel(trackingId: number, moduleId: number): string | null {
    return PatchEditorViewUtils.getRackModuleCopyLabel(this.linkedRackPreviewState$.value, trackingId, moduleId);
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
    return PatchEditorViewUtils.getWorkspaceDescription(mode, preview);
  }

  getRackWorkspaceMessage(preview: LinkedRackPreviewState): string {
    return PatchEditorViewUtils.getRackWorkspaceMessage(preview);
  }

  getRackToolbarSummary(
    preview: LinkedRackPreviewState,
    divergence: LinkedRackDivergence | null,
    orphanedConnectionCount: number
  ): string {
    return PatchEditorViewUtils.getRackToolbarSummary(preview, divergence, orphanedConnectionCount);
  }

  isRackModuleDimmed(
    trackingId: number,
    moduleId: number,
    instanceMap: Map<number, number> | null,
    sel: { a: CVConnectionEntity | null; b: CVConnectionEntity | null } | null
  ): boolean {
    return PatchEditorViewUtils.isRackModuleDimmed(
      this.expandedRackTrackingId,
      trackingId,
      moduleId,
      instanceMap,
      sel
    );
  }

  isRackModulePendingSource(
    trackingId: number,
    moduleId: number,
    instanceMap: Map<number, number> | null,
    sel: { a: CVConnectionEntity | null; b: CVConnectionEntity | null } | null
  ): boolean {
    return PatchEditorViewUtils.isRackModulePendingSource(
      this.expandedRackTrackingId,
      trackingId,
      moduleId,
      instanceMap,
      sel
    );
  }

  getRackModuleConnectionRole(
    trackingId: number,
    moduleId: number,
    instanceMap: Map<number, number> | null,
    sel: { a: CVConnectionEntity | null; b: CVConnectionEntity | null } | null
  ): 'in' | 'out' | null {
    return PatchEditorViewUtils.getRackModuleConnectionRole(trackingId, moduleId, instanceMap, sel);
  }
  
  private buildEditorCards(
    modules: DbModule[],
    instances: PatchModuleInstance[],
    connections: PatchConnection[]
  ): EditorModuleCard[] {
    return buildEditorCardsHelper(modules, instances, connections);
  }
  
  private buildConnectionNames(
    conns: PatchConnection[],
    instanceId: number | undefined
  ): string[] {
    return buildConnectionNamesHelper(conns, instanceId);
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
