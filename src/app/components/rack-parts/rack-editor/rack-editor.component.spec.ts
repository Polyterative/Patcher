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


describe('RackEditorComponent', () => {
  it('opens the active panel in the zoom dialog from inspect action', () => {
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);

    const component = new RackEditorComponent(
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

    const component = new RackEditorComponent(
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

    const component = new RackEditorComponent(
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
    const component = new RackEditorComponent(
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

  it('scales the rack down when the viewport is narrower than the rack width', () => {
    const component = new RackEditorComponent(
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
    const component = new RackEditorComponent(
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
    const component = new RackEditorComponent(
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
    const component = new RackEditorComponent(
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
    const component = new RackEditorComponent(
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
    const component = new RackEditorComponent(
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
    const component = new RackEditorComponent(
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
    const component = new RackEditorComponent(
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
