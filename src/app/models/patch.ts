import {
  Privatable,
  Timestamped
} from './models';
import { PublicUser } from './user';


export interface Patch extends PatchMinimal {
}

export interface PatchMinimal extends Timestamped, Privatable {
  id: number;
  author: PublicUser;
  name: string;
  description?: string;
  linked_rack_id?: number | null;
  tags?: string[];
}
