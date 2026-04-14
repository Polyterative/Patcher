import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  Input,
  OnInit,
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
  getEffectiveRackedModuleHp,
} from '../racked-module-hp.utils';


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
export class RackEditorComponent extends SubManager implements OnInit {
  @Input() data: RackMinimal;
  
  moduleRightClick$ = new Subject<ModuleRightClick>();

  autoScale = 1;

  @HostListener('window:resize')
  onWindowResize(): void {
    this.updateAutoScale();
    this.cdr.markForCheck();
  }

  private updateAutoScale(): void {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    this.autoScale = Math.min(1, window.innerWidth / (this.data.hp * rem));
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
        .subscribe(([
                      {
                        $event,
                        rackedModule
                      }, and, b
                    ]) => {
          
          const inspectModule$ = new Subject<ContextMenuItem>();
          const duplicateModule$ = new Subject<ContextMenuItem>();
          const deleteModule$ = new Subject<ContextMenuItem>();
          const deleteRow$ = new Subject<ContextMenuItem>();
          const replaceWithBlank$ = new Subject<ContextMenuItem>();
          
          const panels = rackedModule.module.panels ?? [];
          const switchPanelSubjects = panels.map(() => new Subject<ContextMenuItem>());
          const effectiveHp = getEffectiveRackedModuleHp(rackedModule);

          const switchPanelParentSubject = new Subject<ContextMenuItem>();
          const panelSubmenuItem: ContextMenuItem | null = panels.length > 1
            ? {
                id: 'switch-panel',
                label: 'Switch panel',
                icon: 'contrast',
                disabled: false,
                data: rackedModule,
                click$: switchPanelParentSubject,
                submenu: panels.map((panel, idx) => {
                  const isActive = panel.id === (rackedModule.rackingData.selectedPanelId ?? panels[0]?.id);
                  return {
                    id: `panel-${ panel.id }`,
                    label: `${ derivePanelLabel(panel.filename, panel.description, idx) }${ isActive ? ' ✓' : '' }`,
                    icon: 'contrast',
                    disabled: false,
                    imageUrl: panel.filename ? PANEL_IMAGE_BASE + panel.filename : undefined,
                    data: rackedModule,
                    click$: switchPanelSubjects[idx]
                  } as ContextMenuItem;
                })
              }
            : null;

          this.contextMenu.menuItems$.next([
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
              click$: inspectModule$
            },
            ...(panelSubmenuItem ? [panelSubmenuItem] : []),
            {
              id: 'duplicate',
              label: 'Duplicate',
              icon: 'content_copy',
              data: rackedModule,
              disabled: false,
              click$: duplicateModule$
            },
            {
              id: 'replace-with-blank',
              label: 'Replace with blank (add spacing)',
              icon: 'space_bar',
              data: rackedModule,
              disabled: false,
              click$: replaceWithBlank$
            },
            {
              id: 'delete',
              label: 'Delete from rack',
              icon: 'delete',
              data: rackedModule,
              disabled: false,
              danger: true,
              click$: deleteModule$
            },
            {
              id: 'void-spacer',
              label: '-',
              icon: '',
              data: undefined,
              disabled: true,
              click$: new Subject<ContextMenuItem>()
            },
            {
              id: 'void-spacer',
              label: '-',
              icon: '',
              data: undefined,
              disabled: true,
              click$: new Subject<ContextMenuItem>()
            },
            
            {
              id: 'clear-row',
              label: 'Delete all in row',
              icon: 'delete_sweep',
              data: rackedModule,
              disabled: false,
              danger: true,
              click$: deleteRow$
            },
          ]);
          
          this.contextMenu.open$.next($event);

          inspectModule$
            .pipe(
              takeUntil(this.contextMenu.open$),
              takeUntil(this.destroy$)
            )
            .subscribe(_ => this.openInspectPanel(rackedModule))
          
          duplicateModule$
            .pipe(
              takeUntil(this.contextMenu.open$),
              takeUntil(this.destroy$)
            )
            .subscribe(_ => this.dataService.requestRackedModuleDuplication$.next(rackedModule))
          
          deleteModule$
            .pipe(
              takeUntil(this.contextMenu.open$),
              takeUntil(this.destroy$)
            )
            .subscribe(_ => this.dataService.requestRackedModuleRemoval$.next(rackedModule))
          
          replaceWithBlank$
            .pipe(
              takeUntil(this.contextMenu.open$),
              takeUntil(this.destroy$)
            )
            .subscribe(_ => this.dataService.requestRackedModuleReplaceWithBlank$.next(rackedModule))
          
          deleteRow$
            .pipe(
              takeUntil(this.contextMenu.open$),
              takeUntil(this.destroy$)
            )
            .subscribe(_ => this.dataService.requestRackedModuleRowClearing$.next(rackedModule))
          
          switchPanelSubjects.forEach((subject$, idx) => {
            subject$.pipe(
              takeUntil(this.contextMenu.open$),
              takeUntil(this.destroy$)
            ).subscribe(() => {
              const panelId = panels[idx]?.id ?? null;
              this.dataService.requestRackedModulePanelSwitch$.next({rackedModule, panelId});
            });
          });
          
          
        })
    );
    
  }
  
  calculateRackUtilization(totalHp: number, rows: number, usedHp: number): string {
    const totalCapacity = Number(totalHp) * Number(rows);
    if (totalCapacity === 0 || isNaN(totalCapacity)) return '0%';
    return ((Number(usedHp) / totalCapacity) * 100).toFixed(2) + '%';
  }

  openInspectPanel(rackedModule: RackedModule): void {
    const panels = rackedModule.module.panels ?? [];
    const activePanelId = rackedModule.rackingData.selectedPanelId ?? panels[0]?.id;
    const activePanelIndex = panels.findIndex((panel) => panel.id === activePanelId);
    const panelIndex = activePanelIndex >= 0 ? activePanelIndex : 0;
    const activePanel = panels[panelIndex];

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
        label: derivePanelLabel(activePanel.filename, activePanel.description, panelIndex)
      }
    });
  }

}
