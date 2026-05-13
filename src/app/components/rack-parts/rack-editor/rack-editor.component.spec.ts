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
import { RACK_ANALYSIS_MODES } from '../rack-analysis-mode';


describe('RackEditorComponent', () => {
  let createdComponents: RackEditorComponent[];

  function createComponent(
    snackBar: MatSnackBar = {} as MatSnackBar,
    supabaseService: SupabaseService = {} as SupabaseService,
    dataService: RackDetailDataService = {} as RackDetailDataService,
    contextMenuDataService: GeneralContextMenuDataService = {} as GeneralContextMenuDataService,
    changeDetectorRef: ChangeDetectorRef = {markForCheck: () => undefined} as ChangeDetectorRef,
    dialog: MatDialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open'])
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
      dialog
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

    expect(menuItems$.value.map(item => item.id)).toContain('clear-row');
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
      'delete',
      'clear-row'
    ]);
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

  it('does not expose the paused signal analysis mode in the UI options', () => {
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
    ]);
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
});
