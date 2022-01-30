import { Timestamped } from './models';
import { PublicUser }  from './user';

export interface Patch extends PatchMinimal {
}

export interface PatchMinimal extends Timestamped {
  id: number;
  author: PublicUser;
  name: string;
  description?: string;
}
