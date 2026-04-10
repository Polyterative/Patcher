import {
  ChangeDetectionStrategy,
  Component,
  Inject
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';


export interface ModulePanelZoomDialogData {
  imageUrl: string;
  label: string;
}

@Component({
  selector: 'app-module-panel-zoom-dialog',
  templateUrl: './module-panel-zoom-dialog.component.html',
  styleUrls: ['./module-panel-zoom-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModulePanelZoomDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ModulePanelZoomDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ModulePanelZoomDialogData
  ) {}
}
