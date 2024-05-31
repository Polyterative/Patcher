import {
  Privatable,
  Timestamped
} from './models';
import { PublicUser } from './user';


export interface RackingData {
  id: number;
  rackid: number;
  moduleid: number;
  row: number;
  column: number;
}


export interface Rack extends RackMinimal {
  // hp: number;
  // public: boolean;
  // manufacturer: MinimalManufacturer;
  // standard: number;
  // created: string;
  // updated: string;
}

export interface RackMinimal extends Timestamped, Privatable {
  id: number;
  name: string;
  description?: string;
  hp: number;
  rows: number;
  author: PublicUser;
  locked: boolean;
}