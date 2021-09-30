import {
  Timestamped
}                     from './models';
import { PublicUser } from './user';

export interface Patch extends PatchMinimal {
  // author: PublicUser;
  description?: string;
}

export interface PatchMinimal extends Timestamped {
  id: number;
  author: PublicUser;
  name: string;
  
}
