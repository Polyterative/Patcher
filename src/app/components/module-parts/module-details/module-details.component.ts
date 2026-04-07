import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { fadeInOnEnterAnimation } from 'angular-animations';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { DbModule } from 'src/app/models/module';
import {
  defaultModuleMinimalViewConfig,
  ModuleMinimalViewConfig
} from '../module-minimal/module-minimal.component';
import { derivePanelLabel, PANEL_COLORS } from '../panel.constants';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';


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
    public appState: AppStateService
  ) {
    this.preferredPanelColor$ = this.appState.preferredPanelColor$;
  }

  getPanelLabel(filename: string, description: string, index: number): string {
    return derivePanelLabel(filename, description, index);
  }

  getPanelColorName(color: number): string | null {
    return PANEL_COLORS[color] ?? null;
  }
}
