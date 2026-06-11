import {
  AfterViewInit,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { animate, animateChild, query, style, transition, trigger } from '@angular/animations';
import { MatSnackBar } from "@angular/material/snack-bar";
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import {
  filter,
  takeUntil,
  withLatestFrom
} from 'rxjs/operators';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { RackedModule } from 'src/app/models/module';
import { RackMinimal } from 'src/app/models/rack';
import {
  ContextMenuItem,
  GeneralContextMenuDataService
} from 'src/app/shared-interproject/components/@smart/general-context-menu/general-context-menu-data.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../../module-parts/module-minimal/module-minimal.component';
import { derivePanelLabel } from '../../module-parts/panel.constants';
import { ModulePanelZoomDialogComponent } from '../../module-parts/module-details/module-panel-zoom-dialog.component';
import { RACK_ANALYSIS_MODES, RACK_ANALYSIS_MODE_OPTIONS } from '../rack-analysis-mode';
import { SignalFocusArea } from '../rack-signal-analysis.utils';
import { prefersTouchInteraction } from 'src/app/shared-interproject/touch-interaction.utils';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import {
  ModuleRightClick,
  PANEL_IMAGE_BASE,
  RackEditorModuleAction,
  RowOverflowClick
} from './rack-editor.types';

export type { ModuleRightClick } from './rack-editor.types';


@Component({
  selector: 'app-rack-editor',
  templateUrl: './rack-editor.component.html',
  styleUrls: ['./rack-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GeneralContextMenuDataService],
  animations: [
    trigger('enter', [
      transition(':enter', [
        style({opacity: 0}),
        animate('1525ms {{ delay }}ms ease', style({opacity: 1})),
        query('@*', animateChild(), { optional: true })
      ], { params: { delay: 0 } })
    ]),
    trigger('leave', [
      transition(':leave', [
        animate('1ms ease', style({opacity: 0}))
      ])
    ])
  ],
  standalone: false
})
export class RackEditorComponent extends SubManager implements OnInit, OnChanges, AfterViewInit {
  @Input() data: RackMinimal;
  
  private static readonly reducedScaleMultiplier = 0.65;
  readonly touchInteractionMode = prefersTouchInteraction();
  readonly analysisModes = RACK_ANALYSIS_MODES;
  readonly analysisModeOptions = RACK_ANALYSIS_MODE_OPTIONS;
  readonly signalAnalysisLegendItems = [
    {label: 'Audio', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalAudio'},
    {label: 'Pitch / V-Oct', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalPitch'},
    {label: 'Clock / Gate', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalClock'},
    {label: 'Modulation', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalModulation'},
    {label: 'Other', swatchClass: 'rackEditorFloatingOptions__analysisSwatch--signalOther'},
  ] as const;
  readonly signalFocusOptions: Array<{value: SignalFocusArea; label: string}> = [
    {value: 'voices', label: 'Voices'},
    {value: 'tone', label: 'Tone shaping'},
    {value: 'mixing', label: 'Mixing'},
    {value: 'modulation', label: 'Modulation'},
    {value: 'clock', label: 'Clock'},
  ];
  readonly moduleActions: RackEditorModuleAction[];
  readonly touchTrayModuleActions: RackEditorModuleAction[];

  moduleRightClick$ = new Subject<ModuleRightClick>();
  selectedTouchModule: RackedModule | null = null;

  autoScale = 1;
  viewOptionsExpanded = false;
  private rackViewportRef?: ElementRef<HTMLElement>;
  private rackScaleSurfaceRef?: ElementRef<HTMLElement>;
  private rackScaleSurfaceResizeObserver?: ResizeObserver;
  private rackSurfaceBaseHeightPx = 0;

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateAutoScale();
    this.cdr.markForCheck();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['data']) {
      this.selectedTouchModule = null;
      this.updateAutoScale();
      queueMicrotask(() => {
        this.updateRackSurfaceFrame();
        this.cdr.markForCheck();
      });
    }
  }

  private updateAutoScale(): void {
    const rackWidth = this.rackWidthPx;
    const availableWidth = this.rackViewportRef?.nativeElement.clientWidth ?? window.innerWidth;
    this.autoScale = rackWidth > 0
      ? Math.min(1, availableWidth / rackWidth)
      : 1;
    this.updateRackSurfaceFrame();
  }

  rackWidthRem(): number {
    return this.data?.hp ?? 0;
  }

  effectiveScale(userRequestedSmallerScale: boolean | null | undefined): number {
    return this.autoScale * (userRequestedSmallerScale ? RackEditorComponent.reducedScaleMultiplier : 1);
  }

  scaledRackWidthPx(userRequestedSmallerScale: boolean | null | undefined): number {
    return this.rackWidthPx * this.effectiveScale(userRequestedSmallerScale);
  }

  scaledRackHeightPx(userRequestedSmallerScale: boolean | null | undefined): number {
    const baseHeight = this.rackSurfaceBaseHeightPx || this.rackScaleSurfaceRef?.nativeElement.offsetHeight || 0;
    return baseHeight * this.effectiveScale(userRequestedSmallerScale);
  }

  rackSurfaceTransform(userRequestedSmallerScale: boolean | null | undefined): string {
    return `scale(${ this.effectiveScale(userRequestedSmallerScale) })`;
  }

  shouldDisableDropAnimations(userRequestedSmallerScale: boolean | null | undefined): boolean {
    return !!userRequestedSmallerScale;
  }

  toggleViewOptions(): void {
    this.viewOptionsExpanded = !this.viewOptionsExpanded;
    this.cdr.markForCheck();
  }

  rackDescription(isCurrentRackPropertyOfCurrentUser: boolean, isCurrentRackEditable: boolean): string {
    if (!isCurrentRackPropertyOfCurrentUser) {
      return '';
    }

    if (!isCurrentRackEditable) {
      return 'Press Edit to make changes';
    }

    return this.touchInteractionMode
      ? 'Changes saved automatically / Tap a module for actions / Press and hold for more options'
      : 'Changes saved automatically / Right click on modules for more options / Add modules from below';
  }

  viewConfig: ModuleMinimalViewConfig = {
    ...defaultModuleMinimalViewConfig,
    hideLabels: true,
    hideManufacturer: false,
    hideDescription: false,
    hideButtons: true,
    hideHP: false,
    hideDates: true,
    hideTags: true
  };
  //
  @ViewChild('screen') screenReference: ElementRef;
  @ViewChild('rackViewport') set rackViewport(reference: ElementRef<HTMLElement> | undefined) {
    this.rackViewportRef = reference;
    if (reference) {
      queueMicrotask(() => {
        this.updateAutoScale();
        this.cdr.markForCheck();
      });
    }
  }
  @ViewChild('rackScaleSurface', {read: ElementRef}) set rackScaleSurface(reference: ElementRef<HTMLElement> | undefined) {
    this.rackScaleSurfaceRef = reference;
    this.observeRackScaleSurface(reference?.nativeElement);
    if (reference) {
      queueMicrotask(() => {
        this.updateRackSurfaceFrame();
        this.cdr.markForCheck();
      });
    }
  }
  @ViewChild('canvas') canvasReference: ElementRef;
  @ViewChild('download') downloadReference: ElementRef;
  
  //
  constructor(
    public snackBar: MatSnackBar,
    public backend: SupabaseService,
    public dataService: RackDetailDataService,
    public contextMenu: GeneralContextMenuDataService,
    private cdr: ChangeDetectorRef,
    private readonly dialog: MatDialog,
    private readonly analytics: AnalyticsService
  ) {
    super();
    this.moduleActions = [
      {
        id: 'inspect',
        label: 'Inspect panel',
        icon: 'zoom_in',
        includeInTouchTray: true,
        includeInContextMenu: true,
        run: (rackedModule) => this.openInspectPanel(rackedModule)
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: 'content_copy',
        includeInTouchTray: true,
        includeInContextMenu: true,
        run: (rackedModule) => this.dataService.requestRackedModuleDuplication$.next(rackedModule)
      },
      {
        id: 'replace-with-blank',
        label: 'Replace with blank',
        icon: 'space_bar',
        includeInTouchTray: true,
        includeInContextMenu: true,
        clearsTouchSelection: true,
        run: (rackedModule) => this.dataService.requestRackedModuleReplaceWithBlank$.next(rackedModule)
      },
      {
        id: 'delete',
        label: 'Remove from rack',
        icon: 'delete',
        danger: true,
        includeInTouchTray: true,
        includeInContextMenu: true,
        clearsTouchSelection: true,
        run: (rackedModule) => this.dataService.requestRackedModuleRemoval$.next(rackedModule)
      }
    ];
    this.touchTrayModuleActions = this.moduleActions.filter(action => action.includeInTouchTray);
  }

  ngOnInit(): void {
    this.updateAutoScale();
    
    const rightClick$ = this.moduleRightClick$.pipe(withLatestFrom(
      this.dataService.isCurrentRackPropertyOfCurrentUser$,
      this.dataService.isCurrentRackEditable$
    ));
    
    this.manageSub(
      rightClick$
        .pipe(
          filter(([, isCurrentRackPropertyOfCurrentUser, isCurrentRackEditable]) =>
            isCurrentRackPropertyOfCurrentUser && isCurrentRackEditable
          )
        )
        .subscribe(([{
          $event,
          rackedModule
        }]) => {
          this.openModuleContextMenu(rackedModule, $event);
        })
    );
     
  }

  ngAfterViewInit(): void {
    this.updateAutoScale();
    this.cdr.markForCheck();
  }

  override ngOnDestroy(): void {
    this.rackScaleSurfaceResizeObserver?.disconnect();
    super.ngOnDestroy();
  }
  
  openInspectPanel(rackedModule: RackedModule): void {
    const {
      activePanel,
      activePanelIndex
    } = this.resolveActivePanelContext(rackedModule);

    if (!activePanel?.filename) {
      return;
    }

    this.analytics.capture('rack.module_panel_inspected', {
      rack_id: this.dataService.singleRackData$?.value?.id,
      module_id: rackedModule.module.id
    });
    this.dialog.open(ModulePanelZoomDialogComponent, {
      width: 'min(96vw, 90rem)',
      maxWidth: '96vw',
      height: 'min(92vh, 64rem)',
      autoFocus: false,
      panelClass: 'panel-zoom-dialog-shell',
      data: {
        imageUrl: PANEL_IMAGE_BASE + activePanel.filename,
        label: derivePanelLabel(activePanel.filename, activePanel.description, activePanelIndex)
      }
    });
  }

  onTouchModuleSelected(rackedModule: RackedModule): void {
    this.selectedTouchModule = this.selectedTouchModule === rackedModule ? null : rackedModule;
    this.cdr.markForCheck();
  }

  clearSelectedTouchModule(): void {
    this.selectedTouchModule = null;
    this.cdr.markForCheck();
  }

  runSelectedTouchAction(action: RackEditorModuleAction): void {
    if (!this.selectedTouchModule) {
      return;
    }

    this.runModuleAction(action, this.selectedTouchModule);
  }

  openSelectedTouchModuleMenu(anchor: HTMLElement | null): void {
    if (!this.selectedTouchModule) {
      return;
    }

    this.openModuleContextMenu(this.selectedTouchModule, this.createContextMenuAnchorEvent(anchor));
  }

  openRowOverflowMenu({$event, rowId, totalRows, rowModuleCount}: RowOverflowClick): void {
    this.contextMenu.menuItems$.next(this.buildRowContextMenuItems(rowId, totalRows, rowModuleCount));
    this.contextMenu.open$.next($event);
  }

  private get rackWidthPx(): number {
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const rem = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16;
    return (this.data?.hp ?? 0) * rem;
  }

  private observeRackScaleSurface(element: HTMLElement | undefined): void {
    this.rackScaleSurfaceResizeObserver?.disconnect();
    this.rackScaleSurfaceResizeObserver = undefined;

    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.rackScaleSurfaceResizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      this.updateRackSurfaceFrame(entry.contentRect.height);
      this.cdr.markForCheck();
    });

    this.rackScaleSurfaceResizeObserver.observe(element);
  }

  private updateRackSurfaceFrame(surfaceHeightPx?: number): void {
    const measuredHeight = surfaceHeightPx ?? this.rackScaleSurfaceRef?.nativeElement.offsetHeight ?? 0;
    this.rackSurfaceBaseHeightPx = measuredHeight;
  }

  private bindContextMenuAction(action$: Subject<ContextMenuItem>, callback: () => void): void {
    action$.pipe(
      takeUntil(this.contextMenu.menuClose$),
      takeUntil(this.destroy$)
    ).subscribe(() => callback());
  }

  private openModuleContextMenu(rackedModule: RackedModule, event: MouseEvent): void {
    const panels = rackedModule.module.panels ?? [];
    const effectiveHp = rackedModule.module.hp;
    const panelSubmenuItem = this.buildPanelSubmenuItem(rackedModule);

    this.contextMenu.menuItems$.next(this.buildModuleContextMenuItems(
      rackedModule,
      effectiveHp,
      panelSubmenuItem
    ));

    this.contextMenu.open$.next(event);
  }

  private createContextMenuAnchorEvent(anchor: HTMLElement | null): MouseEvent {
    const fallbackWidth = typeof window !== 'undefined' ? window.innerWidth : 0;
    const fallbackHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
    const rect = anchor?.getBoundingClientRect();
    const clientX = rect ? rect.left + (rect.width / 2) : fallbackWidth / 2;
    const clientY = rect ? rect.top + (rect.height / 2) : fallbackHeight / 2;

    return new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY
    });
  }

  private buildPanelSubmenuItem(
    rackedModule: RackedModule
  ): ContextMenuItem | null {
    const panels = rackedModule.module.panels ?? [];

    if (panels.length <= 1) {
      return null;
    }

    const {
      activePanelId
    } = this.resolveActivePanelContext(rackedModule);

    return {
      id: 'switch-panel',
      label: 'Switch panel',
      icon: 'contrast',
      disabled: false,
      data: rackedModule,
      click$: new Subject<ContextMenuItem>(),
      submenu: panels.map((panel, idx) => ({
        id: `panel-${ panel.id }`,
        label: `${ derivePanelLabel(panel.filename, panel.description, idx) }${ panel.id === activePanelId ? ' ✓' : '' }`,
        icon: 'contrast',
        disabled: false,
        imageUrl: panel.filename ? PANEL_IMAGE_BASE + panel.filename : undefined,
        data: rackedModule,
        click$: this.createMenuActionSubject(() => {
          this.dataService.requestRackedModulePanelSwitch$.next({
            rackedModule,
            panelId: panels[idx]?.id ?? null
          });
        })
      }))
    };
  }

  private buildModuleContextMenuItems(
    rackedModule: RackedModule,
    effectiveHp: number,
    panelSubmenuItem: ContextMenuItem | null
  ): ContextMenuItem[] {
    const contextMenuActions = this.moduleActions
      .filter(action => action.includeInContextMenu)
      .map(action => this.createContextMenuActionItem(action, rackedModule));
    const inspectAction = contextMenuActions.find(action => action.id === 'inspect');
    const cautionActions = contextMenuActions.filter(action => action.id === 'replace-with-blank');
    const standardActions = contextMenuActions.filter(action =>
      action.id !== 'inspect'
      && action.id !== 'replace-with-blank'
      && !action.danger
    );
    const dangerousActions = contextMenuActions.filter(action => action.danger);

    return [
      {
        id: 'name',
        label: `${ rackedModule.module.name } (${ rackedModule.module.manufacturer.name }, ${ effectiveHp } HP)`,
        data: rackedModule,
        disabled: true,
        click$: new Subject<ContextMenuItem>()
      },
      ...(inspectAction ? [inspectAction] : []),
      ...(panelSubmenuItem ? [panelSubmenuItem] : []),
      ...standardActions,
      ...(cautionActions.length > 0 ? [
        this.createContextMenuSpacerItem(1),
        ...cautionActions
      ] : []),
      ...(dangerousActions.length > 0 ? [
        this.createContextMenuSpacerItem(2),
        ...dangerousActions
      ] : [])
    ];
  }

  private createContextMenuActionItem(action: RackEditorModuleAction, rackedModule: RackedModule): ContextMenuItem {
    return {
      id: action.id,
      label: action.label,
      icon: action.icon,
      data: rackedModule,
      disabled: false,
      danger: action.danger,
      click$: this.createMenuActionSubject(() => this.runModuleAction(action, rackedModule))
    };
  }

  private createMenuActionSubject(callback: () => void): Subject<ContextMenuItem> {
    const action$ = new Subject<ContextMenuItem>();
    this.bindContextMenuAction(action$, callback);
    return action$;
  }

  private createContextMenuSpacerItem(index: number): ContextMenuItem {
    return {
      id: `void-spacer-${ index }`,
      label: '-',
      icon: '',
      data: undefined,
      disabled: true,
      separator: true,
      click$: new Subject<ContextMenuItem>()
    };
  }

  private buildRowContextMenuItems(rowId: number, totalRows: number, rowModuleCount: number): ContextMenuItem[] {
    const rowLabel = `Row ${ rowId + 1 }`;
    const isFirstRow = rowId === 0;
    const isLastRow = rowId >= totalRows - 1;
    const canDeleteRow = totalRows > 1 && rowModuleCount === 0;

    return [
      {
        id: 'row-name',
        label: rowLabel,
        disabled: true,
        click$: new Subject<ContextMenuItem>()
      },
      {
        id: 'move-row-up',
        label: 'Move row up',
        icon: 'keyboard_arrow_up',
        disabled: isFirstRow,
        click$: this.createMenuActionSubject(() => this.dataService.requestMoveRow$.next({
          rowId,
          direction: 'up'
        }))
      },
      {
        id: 'move-row-down',
        label: 'Move row down',
        icon: 'keyboard_arrow_down',
        disabled: isLastRow,
        click$: this.createMenuActionSubject(() => this.dataService.requestMoveRow$.next({
          rowId,
          direction: 'down'
        }))
      },
      {
        id: 'duplicate-row',
        label: 'Duplicate row',
        icon: 'content_copy',
        disabled: false,
        click$: this.createMenuActionSubject(() => this.dataService.requestDuplicateRow$.next(rowId))
      },
      this.createContextMenuSpacerItem(1),
      {
        id: 'clear-row',
        label: 'Clear row',
        icon: 'delete_sweep',
        disabled: rowModuleCount === 0,
        danger: true,
        click$: this.createMenuActionSubject(() => this.dataService.requestClearRow$.next(rowId))
      },
      {
        id: 'delete-row',
        label: 'Delete row',
        icon: 'delete',
        disabled: !canDeleteRow,
        danger: true,
        click$: this.createMenuActionSubject(() => this.dataService.requestDeleteRow$.next(rowId))
      }
    ];
  }

  setAnalysisMode(mode: typeof this.dataService.analysisMode$.value): void {
    this.dataService.analysisMode$.next(mode);
    this.analytics.capture('rack.analysis_mode_changed', {
      rack_id: this.dataService.singleRackData$.value?.id,
      mode
    });
  }

  setSignalFocusArea(area: SignalFocusArea): void {
    this.dataService.signalFocusArea$.next(area);
    this.analytics.capture('rack.signal_focus_changed', {
      rack_id: this.dataService.singleRackData$.value?.id,
      area
    });
  }

  setShouldShowPanelImages(show: boolean): void {
    this.dataService.shouldShowPanelImages$.next(show);
    this.analytics.capture('rack.panel_images_toggled', {
      rack_id: this.dataService.singleRackData$.value?.id,
      visible: show
    });
  }

  setReducedScale(reduced: boolean): void {
    this.dataService.userRequestedSmallerScale$.next(reduced);
    this.analytics.capture('rack.scale_toggled', {
      rack_id: this.dataService.singleRackData$.value?.id,
      reduced
    });
  }

  private runModuleAction(action: RackEditorModuleAction, rackedModule: RackedModule): void {
    action.run(rackedModule);

    if (action.clearsTouchSelection && this.selectedTouchModule === rackedModule) {
      this.clearSelectedTouchModule();
    }
  }

  private resolveActivePanelContext(rackedModule: RackedModule): {
    panels: RackedModule['module']['panels'];
    activePanelId: number | undefined;
    activePanelIndex: number;
    activePanel: RackedModule['module']['panels'][number] | undefined;
  } {
    const panels = rackedModule.module.panels ?? [];
    const activePanelId = rackedModule.rackingData?.selectedPanelId ?? panels[0]?.id;
    const activePanelIndex = panels.findIndex(panel => panel.id === activePanelId);
    const panelIndex = activePanelIndex >= 0 ? activePanelIndex : 0;

    return {
      panels,
      activePanelId,
      activePanelIndex: panelIndex,
      activePanel: panels[panelIndex]
    };
  }

}
