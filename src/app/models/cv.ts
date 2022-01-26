import { MinimalModule } from './module';

export interface CVwithModule extends CV {
  module: MinimalModule;
}

export interface CVwithModuleId extends CV {
  moduleid: number;
}

export interface CV {
  name: string;
  id: number;
  min?: number;
  max?: number;
  isVOCT?: boolean;
  isDCC?: boolean;
  isAudio?: boolean;
  isApproved?: boolean;
}

export interface CVConnectionEntity {
  cv: CVwithModule;
  kind: 'in' | 'out';
}