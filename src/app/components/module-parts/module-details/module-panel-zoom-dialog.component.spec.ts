import { MatDialogRef } from '@angular/material/dialog';
import { ModulePanelZoomDialogComponent } from './module-panel-zoom-dialog.component';
import { ModulePanelZoomDialogData } from './module-panel-zoom-dialog.component';

describe('ModulePanelZoomDialogComponent', () => {
  let comp: ModulePanelZoomDialogComponent;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ModulePanelZoomDialogComponent>>;
  let mockData: ModulePanelZoomDialogData;

  beforeEach(() => {
    mockDialogRef = jasmine.createSpyObj<MatDialogRef<ModulePanelZoomDialogComponent>>(
      'MatDialogRef',
      ['close']
    );
    mockData = { imageUrl: 'https://example.com/image.png', label: 'Test Module' };
    comp = new ModulePanelZoomDialogComponent(mockDialogRef, mockData);
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('exposes data from MAT_DIALOG_DATA', () => {
    expect(comp.data).toBe(mockData);
  });

  it('exposes dialogRef', () => {
    expect(comp.dialogRef).toBe(mockDialogRef);
  });

  it('data contains both imageUrl and label from injection', () => {
    expect(comp.data.imageUrl).toBe('https://example.com/image.png');
    expect(comp.data.label).toBe('Test Module');
  });
});
