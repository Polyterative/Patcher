import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { DbModule } from 'src/app/models/module';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../module-minimal/module-minimal.component';
import { derivePanelLabel, PANEL_COLORS } from '../panel.constants';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { ModulePanelZoomDialogComponent } from './module-panel-zoom-dialog.component';


@Component({
  selector:    'app-module-details',
  templateUrl: './module-details.component.html',
  styleUrls:   ['./module-details.component.scss'],
  animations:  [
    fadeInOnEnterAnimation({
      duration: 8000,
      delay:    0,
      anchor:   'help'
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone:      false
})
export class ModuleDetailsComponent {
  private readonly panelStorageBaseUrl = 'https://sozmatmywjpstwidzlss.supabase.co/storage/v1/object/public/module-panels/';
  @Input() data: DbModule;
  @Input() viewConfig: ModuleMinimalViewConfig = defaultModuleMinimalViewConfig;
  /** Passed through to app-module-cvs for instance-aware CV clicks */
  @Input() instanceId: number | undefined;

  switches = [];
  previewPanelId: number | null = null;
  readonly preferredPanelColor$;

  setPreviewPanel(panelId: number): void {
    this.previewPanelId = panelId;
  }

  constructor(
    public backend: SupabaseService,
    public appState: AppStateService,
    private readonly dialog: MatDialog
  ) {
    this.preferredPanelColor$ = this.appState.preferredPanelColor$;
  }

  openPanelZoom(panelId: number, filename: string, description: string, index: number): void {
    this.setPreviewPanel(panelId);

    if (!filename) {
      return;
    }

    this.dialog.open(ModulePanelZoomDialogComponent, {
      width: 'min(96vw, 90rem)',
      maxWidth: '96vw',
      height: 'min(92vh, 64rem)',
      autoFocus: false,
      panelClass: 'panel-zoom-dialog-shell',
      data: {
        imageUrl: this.getPanelImageUrl(filename),
        label: this.getPanelLabel(filename, description, index)
      }
    });
  }

  getPanelLabel(filename: string, description: string, index: number): string {
    return derivePanelLabel(filename, description, index);
  }

  getPanelImageUrl(filename: string): string {
    return `${ this.panelStorageBaseUrl }${ filename }`;
  }

  getPanelColorName(color: number): string | null {
    return PANEL_COLORS[color] ?? null;
  }

  /** Returns the color badge label only when it adds info not already in the label text. */
  getPanelColorBadge(filename: string, description: string, color: number, index: number): string | null {
    const colorName = PANEL_COLORS[color] ?? null;
    if (!colorName) return null;
    const label = derivePanelLabel(filename, description, index);
    return label.toLowerCase() === colorName.toLowerCase() ? null : colorName;
  }
}
