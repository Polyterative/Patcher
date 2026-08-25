import { MinimalModule } from './module';


export interface CVwithModule extends CV {
  module: MinimalModule;
  /** Set when this CV belongs to a specific patch module instance */
  instance_id?: number;
}

export interface CVwithModuleId extends CV {
  moduleid: number;
}

export interface CV {
  name: string;
  id: number;
  min?: number;
  max?: number;
  isVOCT?: boolean | null;
  isDCC?: boolean | null;
  isAudio?: boolean | null;
  isApproved?: boolean;
  authorid?: string;
}

export interface CVConnectionEntity {
  cv: CVwithModule;
  kind: 'in' | 'out';
}