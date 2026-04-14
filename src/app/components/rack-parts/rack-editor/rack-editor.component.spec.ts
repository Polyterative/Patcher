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
        },
        rackingData: {
          hpOverride: 16
        }
      } as any
    });

    const ids = menuItems$.value.map(item => item.id);
    expect(ids).not.toContain('edit-hp');
    expect(ids).not.toContain('reset-hp');
    expect(menuItems$.value[0].label).toBe('Belgrad (Xaoc Devices, 16 HP)');
  });
});
