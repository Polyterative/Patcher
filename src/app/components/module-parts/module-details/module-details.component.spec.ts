import { MatDialog } from '@angular/material/dialog';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { ModuleDetailsComponent } from './module-details.component';
import { ModulePanelZoomDialogComponent } from './module-panel-zoom-dialog.component';


describe('ModuleDetailsComponent', () => {
  let dialog: jasmine.SpyObj<MatDialog>;
  let component: ModuleDetailsComponent;

  beforeEach(() => {
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    const appState = {
      preferredPanelColor$: { subscribe: () => ({ unsubscribe() {} }) }
    } as unknown as AppStateService;

    component = new ModuleDetailsComponent({} as any, appState, dialog);
  });

  it('opens the panel zoom dialog with the selected panel image and label', () => {
    component.openPanelZoom(42, 'panel.png', 'dark', 0);

    expect(component.previewPanelId).toBe(42);
    expect(dialog.open).toHaveBeenCalledWith(
      ModulePanelZoomDialogComponent,
      jasmine.objectContaining({
        data: {
          imageUrl: 'https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/panel.png',
          label: jasmine.any(String)
        }
      })
    );
  });

  it('updates preview without opening dialog when no panel image exists', () => {
    component.openPanelZoom(7, '', 'no image', 0);

    expect(component.previewPanelId).toBe(7);
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('builds panel URLs transparently for both legacy jpg and new webp filenames', () => {
    expect(component.getPanelImageUrl('panel.jpg'))
      .toBe('https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/panel.jpg');
    expect(component.getPanelImageUrl('panel.webp'))
      .toBe('https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/panel.webp');
  });

  it('returns null when panel color is unknown', () => {
    expect(component.getPanelColorName(999)).toBeNull();
  });

  it('suppresses the color badge when the derived label already matches the color', () => {
    expect(component.getPanelColorBadge('ignored.png', 'Dark', 2, 0)).toBeNull();
  });

  it('shows the color badge when the derived label adds distinct info', () => {
    expect(component.getPanelColorBadge('proto-panel.png', 'Prototype panel', 2, 0)).toBe('Dark');
    expect(component.getPanelColorBadge('proto-panel.png', 'Prototype panel', 999, 0)).toBeNull();
  });
});
