export interface Module {
  name: string;
  description?: string;
  mkr: Manufacturer;
  hp: number;
  ins?: CV[];
  outs?: CV[];
  switches?: Switch[];
  manualURL?: string;
}

export interface DbComment {

}


interface MinimalManufacturer {
  name: string;
  id: number;
  logo?: string;
}

export interface MinimalModule extends Timestamped {
  id: number;
  name: string;
  description: string;
  hp: number;
  public: boolean;
  manufacturer: MinimalManufacturer;
  /**
   *   {{data.standard == 0 ? '' : data.standard == 1 ? 'Intellijel 1U' : data.standard == 2 ? 'PulpLo Logic 1U' : ""}}
   */
  standard: number;
}

export enum TagType {
  Purpose = 0, Nature = 1, Character = 2,
}

export interface Tag {
  id: number;
  name: string;
  type: TagType;
}

export interface DbModule extends MinimalModule {
  ins: CV[];
  outs: CV[];
  switches: Switch[];
  manualURL: string;
  additional: any;
  isComplete: boolean;
  isDIY: boolean;
  tags: { tag: Tag }[];
}

export interface RackingData {
  id: number;
  rackid: number;
  moduleid: number;
  row: number;
  column: number;
}

export interface RackedModule {
  rackingData: RackingData;
  module: DbModule;
}

export interface Timestamped {
  created: string;
  updated: string;
}

export interface Rack extends RackMinimal {
  // hp: number;
  // public: boolean;
  // manufacturer: MinimalManufacturer;
  // standard: number;
  // created: string;
  // updated: string;
}

export interface RackMinimal extends Timestamped {
  id: number;
  name: string;
  description?: string;
  hp: number;
  rows: number;
  author: PublicUser;
  // isLocked: boolean;
  locked: boolean;
}

export interface DBManufacturer {
  id: number;
  name: string;
  url?: string;
  logo?: string;
  admin?: string;
}

export interface Manufacturer {
  name: string;
  url?: string;
  logo?: string;
  admin?: string;
}

export interface Switch {
  name: string;
  positions: string[];
}

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

export interface Patch extends PatchMinimal {
  // author: PublicUser;
  description?: string;
}

export interface PatchMinimal extends Timestamped {
  id: number;
  author: PublicUser;
  name: string;
  
}

export interface PublicUser {
  email: string;
  id: string;
  username: string;
}
