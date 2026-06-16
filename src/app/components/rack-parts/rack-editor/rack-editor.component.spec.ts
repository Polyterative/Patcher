import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  BehaviorSubject,
  Subject,
} from 'rxjs';
import { ModulePanelZoomDialogComponent } from 'src/app/components/module-parts/module-details/module-panel-zoom-dialog.component';
import { RackDetailDataService } from 'src/app/components/rack-parts/rack-detail-data.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { RackedModule } from 'src/app/models/module';
import { GeneralContextMenuDataService } from 'src/app/shared-interproject/components/@smart/general-context-menu/general-context-menu-data.service';
import { RackEditorComponent } from './rack-editor.component';
import {
  RACK_ANALYSIS_MODES,
  RACK_LAYOUT_HOVER_MODES
} from '../rack-analysis-mode';
import { AnalyticsService } from 'src/app/features/backbone/analytics-integration/analytics.service';


describe('RackEditorComponent', () => {
  let createdComponents: RackEditorComponent[];

  function createComponent(
    snackBar: MatSnackBar = {} as MatSnackBar,
    supabaseService: SupabaseService = {} as SupabaseService,
    dataService: RackDetailDataService = {} as RackDetailDataService,
    contextMenuDataService: GeneralContextMenuDataService = {} as GeneralContextMenuDataService,
    changeDetectorRef: ChangeDetectorRef = {markForCheck: () => undefined} as ChangeDetectorRef,
    dialog: MatDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']),
    analytics: Pick<AnalyticsService, 'capture'> = {capture: () => undefined}
  ) {
    const normalizedContextMenu = {
      menuItems$: new BehaviorSubject<any[]>([]),
      open$: new Subject<MouseEvent>(),
      menuClose$: new Subject<any>(),
      ...contextMenuDataService
    } as GeneralContextMenuDataService;

    const component = new RackEditorComponent(
      snackBar,
      supabaseService,
      dataService,
      normalizedContextMenu,
      changeDetectorRef,
      dialog,
      analytics as AnalyticsService
    );
    createdComponents.push(component);
    return component;
  }

  beforeEach(() => {
    createdComponents = [];
  });

  afterEach(() => {
    createdComponents.forEach((component) => component.ngOnDestroy());
  });

  it('opens the active panel in the zoom dialog from inspect action', () => {
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      dialog
    );

    component.openInspectPanel({
      module: {
        panels: [
          {id: 1, filename: 'light.png', description: 'Light'} as any,
          {id: 2, filename: 'dark.png', description: 'Dark'} as any
        ]
      } as any,
      rackingData: {
        selectedPanelId: 2
      } as any
    } as RackedModule);

    expect(dialog.open).toHaveBeenCalledWith(
      ModulePanelZoomDialogComponent,
      jasmine.objectContaining({
        data: jasmine.objectContaining({
          imageUrl: 'https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/dark.png'
        })
      })
    );
  });

  it('does nothing when the active panel has no image file', () => {
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      dialog
    );

    component.openInspectPanel({
      module: {
        panels: [
          {id: 1, filename: '', description: 'No file'} as any
        ]
      } as any,
      rackingData: {
        selectedPanelId: 1
      } as any
    } as RackedModule);

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('does not expose HP override actions in the module context menu', () => {
    const menuItems$ = new BehaviorSubject<any[]>([]);
    const open$ = new Subject<MouseEvent>();
    const dataService = {
      isCurrentRackPropertyOfCurrentUser$: new BehaviorSubject(true),
      isCurrentRackEditable$: new BehaviorSubject(true),
      requestRackedModuleDuplication$: new Subject<RackedModule>(),
      requestRackedModuleRemoval$: new Subject<RackedModule>(),
      requestRackedModuleReplaceWithBlank$: new Subject<RackedModule>(),
      requestRackedModuleRowClearing$: new Subject<RackedModule>(),
      requestClearRow$: new Subject<number>(),
      requestRackedModulePanelSwitch$: new Subject<any>(),
    };

    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      dataService as any,
      {menuItems$, open$} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.data = {hp: 104} as any;
    component.ngOnInit();

    component.moduleRightClick$.next({
      $event: new MouseEvent('contextmenu'),
        rackedModule: {
          module: {
            name: 'Belgrad',
            hp: 14,
            manufacturer: {name: 'Xaoc Devices'},
            panels: []
          }
        } as any
      });

    const ids = menuItems$.value.map(item => item.id);
    expect(ids).not.toContain('edit-hp');
    expect(ids).not.toContain('reset-hp');
    expect(ids).not.toContain('clear-row');
    expect(ids).toEqual([
      'name',
      'inspect',
      'duplicate',
      'void-spacer-1',
      'replace-with-blank',
      'void-spacer-2',
      'delete'
    ]);
    expect(menuItems$.value.find(item => item.id === 'void-spacer-1')?.separator).toBeTrue();
    expect(menuItems$.value.find(item => item.id === 'void-spacer-2')?.separator).toBeTrue();
    expect(menuItems$.value.find(item => item.id === 'delete')?.danger).toBeTrue();
    expect(menuItems$.value.find(item => item.id === 'replace-with-blank')?.label).toBe('Replace with blank');
    expect(menuItems$.value[0].label).toBe('Belgrad (Xaoc Devices, 14 HP)');
  });

  it('toggles the view options panel', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.viewOptionsExpanded = true;
    component.toggleViewOptions();
    expect(component.viewOptionsExpanded).toBeFalse();

    component.toggleViewOptions();
    expect(component.viewOptionsExpanded).toBeTrue();
  });

  it('summarizes the layout arrangement count for the analysis panel', () => {
    const dataService = {
      singleRackData$: new BehaviorSubject({hp: 84}),
      layoutScope$: new BehaviorSubject('all')
    } as unknown as RackDetailDataService;
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      dataService
    );
    const moduleAt = (id: number, hp: number, row: number, column: number) => ({
      module: {
        id,
        hp,
        moduleFormat: {id: 0}
      },
      rackingData: {
        id,
        row,
        column
      }
    }) as unknown as RackedModule;

    expect(component.layoutArrangementSummary([
      [moduleAt(1, 10, 0, 0), moduleAt(2, 20, 0, 1)],
      [moduleAt(3, 30, 1, 0), moduleAt(4, 40, 1, 1)]
    ])).toBe('12 valid arrangements fit the current rows.');
  });

  it('summarizes when no layout arrangement fits the current row set', () => {
    const dataService = {
      singleRackData$: new BehaviorSubject({hp: 84}),
      layoutScope$: new BehaviorSubject('all')
    } as unknown as RackDetailDataService;
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      dataService
    );
    const moduleAt = (id: number, hp: number) => ({
      module: {
        id,
        hp,
        moduleFormat: {id: 0}
      },
      rackingData: {
        id,
        row: 0,
        column: id
      }
    }) as unknown as RackedModule;

    expect(component.layoutArrangementSummary([
      [moduleAt(1, 60), moduleAt(2, 30)]
    ])).toBe('No valid arrangement fits the current row set.');
  });

  it('summarizes layout validity for the analysis panel', () => {
    const dataService = {
      singleRackData$: new BehaviorSubject({hp: 84}),
      layoutScope$: new BehaviorSubject('all')
    } as unknown as RackDetailDataService;
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      dataService
    );
    const moduleAt = (id: number, hp: number, row: number) => ({
      module: {
        id,
        hp,
        moduleFormat: {id: 0}
      },
      rackingData: {
        id,
        row,
        column: id
      }
    }) as unknown as RackedModule;

    expect(component.layoutValiditySummary([
      [moduleAt(1, 80, 0), moduleAt(2, 10, 0)],
      [moduleAt(3, 20, 1)]
    ])).toBe('6HP over capacity across the current rows.');
  });

  it('blocks layout remix affordance when rows mix physical formats', () => {
    const dataService = {
      singleRackData$: new BehaviorSubject({hp: 84}),
      layoutScope$: new BehaviorSubject('all')
    } as unknown as RackDetailDataService;
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      dataService
    );
    const moduleAt = (id: number, standardId: number) => ({
      module: {
        id,
        hp: 8,
        standard: {id: standardId}
      },
      rackingData: {
        id,
        row: 0,
        column: id
      }
    }) as unknown as RackedModule;

    expect(component.layoutRemixUnavailableReason([
      [moduleAt(1, 0), moduleAt(2, 1)]
    ])).toBe('Fix mixed-format rows before remixing.');
  });

  it('summarizes how many modules the next layout remix would move', () => {
    const dataService = {
      singleRackData$: new BehaviorSubject({hp: 84, rows: 2}),
      layoutScope$: new BehaviorSubject('all')
    } as unknown as RackDetailDataService;
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      dataService
    );
    const moduleAt = (id: number, hp: number, row: number, column: number) => ({
      module: {
        id,
        hp,
        standard: {id: 0}
      },
      rackingData: {
        id,
        row,
        column
      }
    }) as unknown as RackedModule;

    expect(component.layoutRemixMoveSummary([
      [moduleAt(1, 80, 0, 0), moduleAt(2, 10, 0, 1)],
      [moduleAt(3, 20, 1, 0)]
    ])).toBe('Remix would move 1 module.');
  });

  it('opens secondary touch actions for the selected module from the visible action tray', () => {
    const menuItems$ = new BehaviorSubject<any[]>([]);
    const open$ = new Subject<MouseEvent>();
    const dataService = {
      isCurrentRackPropertyOfCurrentUser$: new BehaviorSubject(true),
      isCurrentRackEditable$: new BehaviorSubject(true),
      requestRackedModuleDuplication$: new Subject<RackedModule>(),
      requestRackedModuleRemoval$: new Subject<RackedModule>(),
      requestRackedModuleReplaceWithBlank$: new Subject<RackedModule>(),
      requestRackedModuleRowClearing$: new Subject<RackedModule>(),
      requestClearRow$: new Subject<number>(),
      requestRackedModulePanelSwitch$: new Subject<any>(),
    };
    const contextMenu = {menuItems$, open$} as GeneralContextMenuDataService;

    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      dataService as any,
      contextMenu,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );
    const openSpy = spyOn(open$, 'next');
    const anchor = document.createElement('button');
    spyOn(anchor, 'getBoundingClientRect').and.returnValue({
      left: 120,
      top: 240,
      width: 80,
      height: 40,
      right: 200,
      bottom: 280,
      x: 120,
      y: 240,
      toJSON: () => ({})
    } as DOMRect);

    component.data = {hp: 104} as any;
    component.ngOnInit();
    component.selectedTouchModule = {
      module: {
        name: 'Belgrad',
        hp: 14,
        manufacturer: {name: 'Xaoc Devices'},
        panels: []
      }
    } as any;

    component.openSelectedTouchModuleMenu(anchor);

    expect(menuItems$.value.map(item => item.id)).not.toContain('clear-row');
    expect(openSpy).toHaveBeenCalled();
    expect(openSpy.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({
      clientX: 160,
      clientY: 260
    }));
  });

  it('uses the same shared action ids for the touch tray and the context menu', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    expect(component.touchTrayModuleActions.map(action => action.id)).toEqual([
      'inspect',
      'duplicate',
      'replace-with-blank',
      'delete'
    ]);
    expect(component.moduleActions.filter(action => action.includeInContextMenu).map(action => action.id)).toEqual([
      'inspect',
      'duplicate',
      'replace-with-blank',
      'delete'
    ]);
  });

  it('exposes clear row from the row action menu', () => {
    const menuItems$ = new BehaviorSubject<any[]>([]);
    const open$ = new Subject<MouseEvent>();
    const requestDuplicateRow$ = new Subject<number>();
    const requestClearRow$ = new Subject<number>();
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {
        requestMoveRow$: new Subject<{rowId: number; direction: 'up' | 'down'}>(),
        requestDuplicateRow$,
        requestClearRow$,
        requestDeleteRow$: new Subject<number>()
      } as any,
      {menuItems$, open$} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );
    const duplicateSpy = spyOn(requestDuplicateRow$, 'next');
    const clearSpy = spyOn(requestClearRow$, 'next');

    component.openRowOverflowMenu({
      $event: new MouseEvent('click'),
      rowId: 1,
      totalRows: 3,
      rowModuleCount: 2
    });

    const ids = menuItems$.value.map(item => item.id);
    expect(ids).toEqual([
      'row-name',
      'move-row-up',
      'move-row-down',
      'duplicate-row',
      'void-spacer-1',
      'clear-row',
      'delete-row'
    ]);
    expect(menuItems$.value.find(item => item.id === 'void-spacer-1')?.separator).toBeTrue();
    expect(ids).toContain('clear-row');
    expect(ids).toContain('delete-row');
    const duplicateItem = menuItems$.value.find(item => item.id === 'duplicate-row');
    const clearItem = menuItems$.value.find(item => item.id === 'clear-row');
    const deleteItem = menuItems$.value.find(item => item.id === 'delete-row');
    expect(duplicateItem.disabled).toBeFalse();
    expect(clearItem.disabled).toBeFalse();
    expect(deleteItem.disabled).toBeTrue();

    duplicateItem.click$.next(duplicateItem);
    clearItem.click$.next(clearItem);

    expect(duplicateSpy).toHaveBeenCalledWith(1);
    expect(clearSpy).toHaveBeenCalledWith(1);
  });

  it('clears the touch selection after running the shared replace-with-blank action', () => {
    const replaceWithBlank$ = new Subject<RackedModule>();
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {
        requestRackedModuleReplaceWithBlank$: replaceWithBlank$
      } as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );
    const moduleRef = {
      module: {
        name: 'Belgrad'
      }
    } as RackedModule;
    const replaceSpy = spyOn(replaceWithBlank$, 'next');

    component.selectedTouchModule = moduleRef;

    const replaceAction = component.moduleActions.find(action => action.id === 'replace-with-blank');
    expect(replaceAction).toBeDefined();
    component.runSelectedTouchAction(replaceAction!);

    expect(replaceSpy).toHaveBeenCalledWith(moduleRef);
    expect(component.selectedTouchModule).toBeNull();
  });

  it('exposes active rack analysis modes while keeping paused signal mode hidden', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    expect(component.analysisModeOptions.map(option => option.mode)).toEqual([
      RACK_ANALYSIS_MODES.off,
      RACK_ANALYSIS_MODES.power,
      RACK_ANALYSIS_MODES.function,
      RACK_ANALYSIS_MODES.layout,
    ]);
    expect(component.analysisModes.layout).toBe('layout');
    expect(component.analysisModeOptions.map(option => option.mode)).not.toContain(RACK_ANALYSIS_MODES.signal);
  });

  it('exposes layout analysis legend items for exact and combination highlights', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    expect(component.layoutAnalysisLegendItems.map(item => item.label)).toEqual([
      'Same HP',
      'Smaller combo',
    ]);
    expect(component.layoutAnalysisLegendItems.map(item => item.swatchClass)).toEqual([
      'rackEditorFloatingOptions__analysisSwatch--layoutExact',
      'rackEditorFloatingOptions__analysisSwatch--layoutCombo',
    ]);
  });

  it('exposes layout hover mode options for pinned same-HP and cycling combos', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    expect(component.layoutHoverModeOptions.map(option => option.mode)).toEqual([
      RACK_LAYOUT_HOVER_MODES.sameHp,
      RACK_LAYOUT_HOVER_MODES.combinations,
    ]);
  });

  it('updates layout hover mode through the rack data service', () => {
    const layoutHoverMode$ = new BehaviorSubject(RACK_LAYOUT_HOVER_MODES.sameHp);
    const analytics = jasmine.createSpyObj('AnalyticsService', ['capture']);
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {
        layoutHoverMode$,
        singleRackData$: new BehaviorSubject({id: 88}),
      } as unknown as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open']),
      analytics
    );

    component.setLayoutHoverMode(RACK_LAYOUT_HOVER_MODES.combinations);

    expect(layoutHoverMode$.value).toBe(RACK_LAYOUT_HOVER_MODES.combinations);
    expect(analytics.capture).toHaveBeenCalledWith('rack.layout_hover_mode_changed', {
      rack_id: 88,
      mode: RACK_LAYOUT_HOVER_MODES.combinations
    });
  });

  it('updates layout remix scope through the rack data service', () => {
    const layoutScope$ = new BehaviorSubject<'all' | '3u' | '1u'>('all');
    const analytics = jasmine.createSpyObj('AnalyticsService', ['capture']);
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {
        layoutScope$,
        singleRackData$: new BehaviorSubject({id: 88}),
      } as unknown as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open']),
      analytics
    );

    component.setLayoutScope('3u');

    expect(layoutScope$.value).toBe('3u');
    expect(analytics.capture).toHaveBeenCalledWith('rack.layout_scope_changed', {
      rack_id: 88,
      scope: '3u'
    });
  });

  it('builds single-row layout scope options', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    expect(component.layoutRowScopeOptions([[], []])).toEqual([
      {scope: {rowIndex: 0}, label: 'Row 1'},
      {scope: {rowIndex: 1}, label: 'Row 2'}
    ]);
    expect(component.isLayoutScopeActive({rowIndex: 1}, {rowIndex: 1})).toBeTrue();
    expect(component.isLayoutScopeActive({rowIndex: 0}, {rowIndex: 1})).toBeFalse();
  });

  it('labels the remix action for the active layout scope', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    expect(component.layoutRemixActionLabel('all')).toBe('Remix layout');
    expect(component.layoutRemixActionLabel('3u')).toBe('Remix 3U');
    expect(component.layoutRemixActionLabel('1u')).toBe('Remix 1U');
    expect(component.layoutRemixActionLabel({rowIndex: 2})).toBe('Remix Row 3');
  });

  it('requests layout remix through the rack data service', () => {
    const requestLayoutRemix$ = new Subject<void>();
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {requestLayoutRemix$} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );
    const remixSpy = spyOn(requestLayoutRemix$, 'next');

    component.requestLayoutRemix();

    expect(remixSpy).toHaveBeenCalled();
  });

  it('scales the rack down when the viewport is narrower than the rack width', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.data = {hp: 104} as any;
    spyOn(window, 'getComputedStyle').and.returnValue({fontSize: '10'} as CSSStyleDeclaration);
    (component as any).rackViewportRef = {
      nativeElement: {
        clientWidth: 520
      }
    };

    (component as any).updateAutoScale();

    expect(component.autoScale).toBeCloseTo(0.5, 4);
  });

  it('combines auto scale and reduced scale into the drag surface scale', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.data = {hp: 104} as any;
    spyOn(window, 'getComputedStyle').and.returnValue({fontSize: '10'} as CSSStyleDeclaration);
    (component as any).rackViewportRef = {
      nativeElement: {
        clientWidth: 520
      }
    };

    (component as any).updateAutoScale();

    expect(component.effectiveScale(false)).toBeCloseTo(0.5, 4);
    expect(component.effectiveScale(true)).toBeCloseTo(0.325, 4);
  });

  it('returns compensated rack frame dimensions for transform scaling', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.data = {hp: 104} as any;
    spyOn(window, 'getComputedStyle').and.returnValue({fontSize: '10'} as CSSStyleDeclaration);
    (component as any).rackViewportRef = {
      nativeElement: {
        clientWidth: 520
      }
    };
    (component as any).rackScaleSurfaceRef = {
      nativeElement: {
        offsetHeight: 400
      }
    };

    (component as any).updateAutoScale();

    expect(component.scaledRackWidthPx(false)).toBeCloseTo(520, 4);
    expect(component.scaledRackHeightPx(false)).toBeCloseTo(200, 4);
    expect(component.scaledRackWidthPx(true)).toBeCloseTo(338, 4);
    expect(component.scaledRackHeightPx(true)).toBeCloseTo(130, 4);
    expect(component.rackSurfaceTransform(true)).toBe('scale(0.325)');
  });

  it('disables drop animations only for the explicit reduced-scale mode', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.autoScale = 1;
    expect(component.shouldDisableDropAnimations(false)).toBeFalse();

    component.autoScale = 0.92;
    expect(component.shouldDisableDropAnimations(false)).toBeFalse();

    component.autoScale = 1;
    expect(component.shouldDisableDropAnimations(true)).toBeTrue();
  });

  it('caps the rack scale at full size when the viewport is wide enough', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.data = {hp: 104} as any;
    spyOn(window, 'getComputedStyle').and.returnValue({fontSize: '10'} as CSSStyleDeclaration);
    (component as any).rackViewportRef = {
      nativeElement: {
        clientWidth: 1600
      }
    };

    (component as any).updateAutoScale();

    expect(component.autoScale).toBe(1);
  });

  it('falls back to the window width when no rack viewport reference is available', () => {
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      {markForCheck: () => undefined} as ChangeDetectorRef,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.data = {hp: 104} as any;
    spyOn(window, 'getComputedStyle').and.returnValue({fontSize: '10'} as CSSStyleDeclaration);
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(780);

    (component as any).rackViewportRef = undefined;
    (component as any).updateAutoScale();

    expect(component.autoScale).toBeCloseTo(0.75, 4);
  });

  it('recomputes scale when the rack viewport setter receives a new element', async () => {
    const cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      cdr,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.data = {hp: 104} as any;
    spyOn(window, 'getComputedStyle').and.returnValue({fontSize: '10'} as CSSStyleDeclaration);

    component.rackViewport = {
      nativeElement: {
        clientWidth: 624
      }
    } as any;

    await Promise.resolve();

    expect(component.autoScale).toBeCloseTo(0.6, 4);
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('recomputes scale and marks for check on window resize', () => {
    const cdr = jasmine.createSpyObj<ChangeDetectorRef>('ChangeDetectorRef', ['markForCheck']);
    const component = createComponent(
      {} as MatSnackBar,
      {} as SupabaseService,
      {} as RackDetailDataService,
      {} as GeneralContextMenuDataService,
      cdr,
      jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
    );

    component.data = {hp: 104} as any;
    spyOn(window, 'getComputedStyle').and.returnValue({fontSize: '10'} as CSSStyleDeclaration);
    spyOnProperty(window, 'innerWidth', 'get').and.returnValue(832);
    (component as any).rackViewportRef = undefined;

    component.onWindowResize();

    expect(component.autoScale).toBeCloseTo(0.8, 4);
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('analysisModes has expected entries', () => {
    const component = createComponent();
    expect(typeof component.analysisModes).toBe('object');
    expect(component.analysisModes['off']).toBeDefined();
    expect(component.analysisModes['function']).toBeDefined();
    expect(component.analysisModes['signal']).toBeDefined();
  });

  it('signalFocusOptions contains all expected focus areas', () => {
    const component = createComponent();
    const values = component.signalFocusOptions.map(o => o.value);
    expect(values).toContain('voices');
    expect(values).toContain('clock');
    expect(values).toContain('mixing');
    expect(values).toContain('modulation');
    expect(values).toContain('tone');
  });

  it('viewOptionsExpanded starts as false', () => {
    const component = createComponent();
    expect(component.viewOptionsExpanded).toBeFalse();
  });

  it('selectedTouchModule starts as null', () => {
    const component = createComponent();
    expect(component.selectedTouchModule).toBeNull();
  });
});
