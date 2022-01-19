import {
  CV,
  CVwithModule
}                   from './cv';
import { DbModule } from './module';
import { Patch }    from './patch';

export interface Connection {
  from: DbModule;
  fromCV: CV;
  to: DbModule;
  toCV: CV;
}

export interface PatchConnection {
  patch: Patch;
  a: CVwithModule;
  b: CVwithModule;
  notes?: string;
}
