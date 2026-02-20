import {
  CV,
  CVwithModule
} from './cv';
import { DbModule } from './module';
import { Patch } from './patch';


export interface Connection {
  from: DbModule;
  fromCV: CV;
  to: DbModule;
  toCV: CV;
}

export interface PatchModuleInstance {
  id: number;
  patch_id: number;
  module_id: number;
  instance_label: string | null;
  /** Populated when query joins the modules table */
  module?: {
    name: string;
    manufacturer?: {
      name: string
    } | null;
  } | null;
}

export interface PatchConnection {
  patch: Patch;
  a: CVwithModule;
  b: CVwithModule;
  notes?: string;
  /** instance IDs corresponding to a.module and b.module respectively */
  instance_id_a?: number;
  instance_id_b?: number;
}