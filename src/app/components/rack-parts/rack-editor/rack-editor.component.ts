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
import {
  fadeInOnEnterAnimation,
  fadeOutOnLeaveAnimation
} from "angular-animations";
import { derivePanelLabel } from '../../module-parts/panel.constants';
import { ModulePanelZoomDialogComponent } from '../../module-parts/module-details/module-panel-zoom-dialog.component';
import {
  RACK_ANALYSIS_MODES,
  RACK_ANALYSIS_MODE_OPTIONS
} from '../rack-analysis-mode';


export interface ModuleRightClick {
  $event: MouseEvent;
  rackedModule: RackedModule;
}

const PANEL_IMAGE_BASE = 'https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/';


@Component({
  selector: 'app-rack-editor',
  templateUrl: './rack-editor.component.html',
  styleUrls: ['./rack-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [GeneralContextMenuDataService],
  animations: [
    fadeInOnEnterAnimation({
      anchor: 'enter',
      duration: 1525,
      animateChildren: 'after'
    }),
    fadeOutOnLeaveAnimation({
      anchor: 'leave',
      duration: 1
    })
  ],
  standalone: false
})
export class RackEditorComponent extends SubManager implements OnInit, OnChanges, AfterViewInit {
  @Input() data: RackMinimal;
  
  private static readonly reducedScaleMultiplier = 0.65;
  readonly analysisModes = RACK_ANALYSIS_MODES;
  readonly analysisModeOptions = RACK_ANALYSIS_MODE_OPTIONS;

  moduleRightClick$ = new Subject<ModuleRightClick>();

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
    private readonly dialog: MatDialog
    // userManagerService: UserManagementService
  ) {
    super();

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
          
          const inspectModule$ = new Subject<ContextMenuItem>();
          const duplicateModule$ = new Subject<ContextMenuItem>();
          const deleteModule$ = new Subject<ContextMenuItem>();
          const deleteRow$ = new Subject<ContextMenuItem>();
          const replaceWithBlank$ = new Subject<ContextMenuItem>();
          
          const panels = rackedModule.module.panels ?? [];
          const switchPanelSubjects = panels.map(() => new Subject<ContextMenuItem>());
          const effectiveHp = rackedModule.module.hp;
          const panelSubmenuItem = this.buildPanelSubmenuItem(rackedModule, switchPanelSubjects);

          this.contextMenu.menuItems$.next(this.buildModuleContextMenuItems(
            rackedModule,
            effectiveHp,
            panelSubmenuItem,
            {
              inspectModule$,
              duplicateModule$,
              replaceWithBlank$,
              deleteModule$,
              deleteRow$
            }
          ));
          
          this.contextMenu.open$.next($event);

          this.bindContextMenuAction(inspectModule$, () => this.openInspectPanel(rackedModule));
          this.bindContextMenuAction(duplicateModule$, () => this.dataService.requestRackedModuleDuplication$.next(rackedModule));
          this.bindContextMenuAction(deleteModule$, () => this.dataService.requestRackedModuleRemoval$.next(rackedModule));
          this.bindContextMenuAction(replaceWithBlank$, () => this.dataService.requestRackedModuleReplaceWithBlank$.next(rackedModule));
          this.bindContextMenuAction(deleteRow$, () => this.dataService.requestRackedModuleRowClearing$.next(rackedModule));
          
          switchPanelSubjects.forEach((subject$, idx) => {
            this.bindContextMenuAction(subject$, () => {
              const panelId = panels[idx]?.id ?? null;
              this.dataService.requestRackedModulePanelSwitch$.next({rackedModule, panelId});
            });
          });
          
          
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
      takeUntil(this.contextMenu.open$),
      takeUntil(this.destroy$)
    ).subscribe(() => callback());
  }

  private buildPanelSubmenuItem(
    rackedModule: RackedModule,
    switchPanelSubjects: Subject<ContextMenuItem>[]
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
        click$: switchPanelSubjects[idx]
      }))
    };
  }

  private buildModuleContextMenuItems(
    rackedModule: RackedModule,
    effectiveHp: number,
    panelSubmenuItem: ContextMenuItem | null,
    actions: {
      inspectModule$: Subject<ContextMenuItem>;
      duplicateModule$: Subject<ContextMenuItem>;
      replaceWithBlank$: Subject<ContextMenuItem>;
      deleteModule$: Subject<ContextMenuItem>;
      deleteRow$: Subject<ContextMenuItem>;
    }
  ): ContextMenuItem[] {
    return [
      {
        id: 'name',
        label: `${ rackedModule.module.name } (${ rackedModule.module.manufacturer.name }, ${ effectiveHp } HP)`,
        data: rackedModule,
        disabled: true,
        click$: new Subject<ContextMenuItem>()
      },
      {
        id: 'inspect',
        label: 'Inspect panel',
        icon: 'zoom_in',
        data: rackedModule,
        disabled: false,
        click$: actions.inspectModule$
      },
      ...(panelSubmenuItem ? [panelSubmenuItem] : []),
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: 'content_copy',
        data: rackedModule,
        disabled: false,
        click$: actions.duplicateModule$
      },
      {
        id: 'replace-with-blank',
        label: 'Replace with blank (add spacing)',
        icon: 'space_bar',
        data: rackedModule,
        disabled: false,
        click$: actions.replaceWithBlank$
      },
      {
        id: 'delete',
        label: 'Delete from rack',
        icon: 'delete',
        data: rackedModule,
        disabled: false,
        danger: true,
        click$: actions.deleteModule$
      },
      this.createContextMenuSpacerItem(1),
      this.createContextMenuSpacerItem(2),
      {
        id: 'clear-row',
        label: 'Delete all in row',
        icon: 'delete_sweep',
        data: rackedModule,
        disabled: false,
        danger: true,
        click$: actions.deleteRow$
      }
    ];
  }

  private createContextMenuSpacerItem(index: number): ContextMenuItem {
    return {
      id: `void-spacer-${ index }`,
      label: '-',
      icon: '',
      data: undefined,
      disabled: true,
      click$: new Subject<ContextMenuItem>()
    };
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
