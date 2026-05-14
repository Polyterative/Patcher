import { StorageUrls } from 'src/app/features/backend/DatabaseStrings';
import { RackedModule } from 'src/app/models/module';

export interface ModuleRightClick {
  $event: MouseEvent;
  rackedModule: RackedModule;
}

export interface RackEditorModuleAction {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
  includeInTouchTray: boolean;
  includeInContextMenu: boolean;
  clearsTouchSelection?: boolean;
  run: (rackedModule: RackedModule) => void;
}

export const PANEL_IMAGE_BASE = StorageUrls.modulePanels;
