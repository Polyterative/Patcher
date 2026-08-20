import {
  ChangeDetectionStrategy,
  Component,
  Input
} from '@angular/core';
import { MinimalModule } from 'src/app/models/module';
import { getModuleHeightForStandard } from '../get-module-height-for-standard.pipe';

export const PANEL_WALL_SCALE = 1.5;

@Component({
  selector: 'app-module-panel-wall',
  templateUrl: './module-panel-wall.component.html',
  styleUrls: ['./module-panel-wall.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false
})
export class ModulePanelWallComponent {
  @Input() modules: MinimalModule[] = [];
  @Input() preferredPanelColor: number | null = null;
  @Input() wrap = true;

  panelWidthRem(module: MinimalModule): number {
    return Math.max(module.hp || 1, 1) * PANEL_WALL_SCALE;
  }

  panelHeightRem(module: MinimalModule): number {
    return getModuleHeightForStandard(module.standard) * PANEL_WALL_SCALE;
  }

  hasPanelImage(module: MinimalModule): boolean {
    return (module.panels?.length ?? 0) > 0;
  }

  panelTooltip(module: MinimalModule): string {
    const manufacturerName = module.manufacturer?.name;
    return manufacturerName ? `${module.name} by ${manufacturerName}` : module.name;
  }

  hpLabel(module: MinimalModule): string {
    return `${module.hp} HP`;
  }
}
