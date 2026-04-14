import { ChangeDetectorRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
});
