import { RackedModule } from 'src/app/models/module';

export interface ModuleRightClick {
  $event: MouseEvent;
  rackedModule: RackedModule;
}

export interface RowOverflowClick {
  $event: MouseEvent;
  rowId: number;
  totalRows: number;
  rowModuleCount: number;
}

export interface RackEditorModuleAction {
  id: string;
  label: string;
  icon: string;
  tooltip?: string;
  danger?: boolean;
  includeInTouchTray: boolean;
  includeInContextMenu: boolean;
  clearsTouchSelection?: boolean;
  run: (rackedModule: RackedModule) => void;
}
