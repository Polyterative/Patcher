import { MinimalModule } from './module';

export interface CVwithModule extends CV {
  module: MinimalModule;
}

export interface CV {
  name: string;
  id: number;
  min?: number;
  max?: number;
  isVOCT?: boolean;
  isDCC?: boolean;
  isAudio?: boolean;
}

export interface CVConnectionEntity {
  cv: CVwithModule;
  kind: 'in' | 'out';
}