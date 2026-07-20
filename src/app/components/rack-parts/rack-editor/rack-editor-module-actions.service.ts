import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';
import { MODULE_PANEL_STORAGE_BASE_URL } from 'src/app/features/backend/storage-url.constants';
import { RackedModule } from 'src/app/models/module';
import {
  ContextMenuItem,
  GeneralContextMenuDataService
} from 'src/app/shared-interproject/components/@smart/general-context-menu/general-context-menu-data.service';
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { ModulePanelZoomDialogComponent } from '../../module-parts/module-details/module-panel-zoom-dialog.component';
import { derivePanelLabel } from '../../module-parts/panel.constants';
import { RackDetailDataService } from '../rack-detail-data.service';
import {
  RackEditorModuleAction,
  RowOverflowClick
} from './rack-editor.types';

@Injectable()
export class RackEditorModuleActionsService extends SubManager {
  readonly moduleActions: RackEditorModuleAction[];
  readonly touchTrayModuleActions: RackEditorModuleAction[];

  constructor(
    private readonly dataService: RackDetailDataService,
    private readonly contextMenu: GeneralContextMenuDataService,
    private readonly dialog: MatDialog,
    private readonly analytics: AnalyticsService
  ) {
    super();
    this.moduleActions = [
      {
        id: 'inspect',
        label: 'Inspect panel',
        icon: 'zoom_in',
        tooltip: 'Inspect panel',
        includeInTouchTray: true,
        includeInContextMenu: true,
        run: (rackedModule) => this.openInspectPanel(rackedModule)
      },
      {
        id: 'flip-orientation',
        label: 'Flip 180°',
        icon: 'rotate_right',
        tooltip: 'Flip module 180°',
        includeInTouchTray: true,
        includeInContextMenu: true,
        run: (rackedModule) => this.dataService.requestRackedModuleOrientationToggle$.next(rackedModule)
      },
      {
        id: 'duplicate',
        label: 'Duplicate',
        icon: 'content_copy',
        tooltip: 'Duplicate',
        includeInTouchTray: true,
        includeInContextMenu: true,
        run: (rackedModule) => this.dataService.requestRackedModuleDuplication$.next(rackedModule)
      },
      {
        id: 'replace-with-blank',
        label: 'Replace with blank',
        icon: 'space_bar',
        tooltip: 'Replace with blank',
        includeInTouchTray: true,
        includeInContextMenu: true,
        clearsTouchSelection: true,
        run: (rackedModule) => this.dataService.requestRackedModuleReplaceWithBlank$.next(rackedModule)
      },
      {
        id: 'delete',
        label: 'Remove from rack',
        icon: 'delete',
        tooltip: 'Remove from rack',
        danger: true,
        includeInTouchTray: true,
        includeInContextMenu: true,
        clearsTouchSelection: true,
        run: (rackedModule) => this.dataService.requestRackedModuleRemoval$.next(rackedModule)
      }
    ];
    this.touchTrayModuleActions = this.moduleActions.filter(action => action.includeInTouchTray);
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
        imageUrl: MODULE_PANEL_STORAGE_BASE_URL + activePanel.filename,
        label: derivePanelLabel(activePanel.filename, activePanel.description, activePanelIndex)
      }
    });
  }

  openModuleContextMenu(
    rackedModule: RackedModule,
    event: MouseEvent,
    runAction: (action: RackEditorModuleAction, target: RackedModule) => void
  ): void {
    const effectiveHp = rackedModule.module.hp;
    const panelSubmenuItem = this.buildPanelSubmenuItem(rackedModule);

    this.contextMenu.menuItems$.next(this.buildModuleContextMenuItems(
      rackedModule,
      effectiveHp,
      panelSubmenuItem,
      runAction
    ));

    this.contextMenu.open$.next(event);
  }

  openRowOverflowMenu({$event, rowId, totalRows, rowModuleCount}: RowOverflowClick): void {
    this.contextMenu.menuItems$.next(this.buildRowContextMenuItems(rowId, totalRows, rowModuleCount));
    this.contextMenu.open$.next($event);
  }

  runModuleAction(action: RackEditorModuleAction, rackedModule: RackedModule): void {
    if (this.isModuleActionDisabled(action, rackedModule)) {
      return;
    }

    action.run(rackedModule);
  }

  createContextMenuAnchorEvent(anchor: HTMLElement | null): MouseEvent {
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

  private buildPanelSubmenuItem(rackedModule: RackedModule): ContextMenuItem | null {
    const panels = rackedModule.module.panels ?? [];

    if (panels.length <= 1) {
      return null;
    }

    const {activePanelId} = this.resolveActivePanelContext(rackedModule);

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
        imageUrl: panel.filename ? MODULE_PANEL_STORAGE_BASE_URL + panel.filename : undefined,
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
    panelSubmenuItem: ContextMenuItem | null,
    runAction: (action: RackEditorModuleAction, target: RackedModule) => void
  ): ContextMenuItem[] {
    const contextMenuActions = this.moduleActions
      .filter(action => action.includeInContextMenu && this.shouldShowModuleAction(action, rackedModule))
      .map(action => this.createContextMenuActionItem(action, rackedModule, runAction));
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

  private createContextMenuActionItem(
    action: RackEditorModuleAction,
    rackedModule: RackedModule,
    runAction: (action: RackEditorModuleAction, target: RackedModule) => void
  ): ContextMenuItem {
    const resolvedAction = this.resolveModuleActionPresentation(action, rackedModule);
    return {
      id: resolvedAction.id,
      label: resolvedAction.label,
      icon: resolvedAction.icon,
      data: rackedModule,
      disabled: this.isModuleActionDisabled(action, rackedModule),
      danger: resolvedAction.danger,
      click$: this.createMenuActionSubject(() => runAction(action, rackedModule))
    };
  }

  shouldShowModuleAction(action: RackEditorModuleAction, rackedModule: RackedModule): boolean {
    if (action.id !== 'flip-orientation') {
      return true;
    }

    if (typeof this.dataService.canToggleRackModuleOrientation !== 'function') {
      return false;
    }

    return this.dataService.canToggleRackModuleOrientation(rackedModule);
  }

  isModuleActionDisabled(action: RackEditorModuleAction, _rackedModule: RackedModule): boolean {
    if (typeof this.dataService.isAnyRackModuleOrientationUpdating !== 'function') {
      return false;
    }

    return (action.id === 'flip-orientation' || action.id === 'duplicate')
      && this.dataService.isAnyRackModuleOrientationUpdating();
  }

  resolveModuleActionPresentation(action: RackEditorModuleAction, rackedModule: RackedModule): RackEditorModuleAction {
    if (action.id !== 'flip-orientation') {
      return action;
    }

    return {
      ...action,
      label: typeof this.dataService.rackModuleOrientationActionLabel === 'function'
        ? this.dataService.rackModuleOrientationActionLabel(rackedModule)
        : action.label,
      icon: typeof this.dataService.rackModuleOrientationActionIcon === 'function'
        ? this.dataService.rackModuleOrientationActionIcon(rackedModule)
        : action.icon,
      tooltip: typeof this.dataService.rackModuleOrientationActionTooltip === 'function'
        ? this.dataService.rackModuleOrientationActionTooltip(rackedModule)
        : action.tooltip
    };
  }

  private createMenuActionSubject(callback: () => void): Subject<ContextMenuItem> {
    const action$ = new Subject<ContextMenuItem>();
    action$.pipe(
      takeUntil(this.contextMenu.menuClose$),
      this.takeUntilDestroyed()
    ).subscribe(() => callback());
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
    const isOrientationUpdating = this.dataService.isAnyRackModuleOrientationUpdating();

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
        disabled: isOrientationUpdating,
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
