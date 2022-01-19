import { CV }          from './cv';
import {
  Manufacturer,
  MinimalManufacturer
}                      from './manufacturer';
import { Timestamped } from './models';
import { RackingData } from './rack';
import { Switch }      from './switch';
import { Tag }         from './tag';

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

export interface MinimalModule extends Timestamped {
  id: number;
  name: string;
  description: string;
  hp: number;
  public: boolean;
  manufacturer: MinimalManufacturer;
  manufacturerId: number;
  /**
   *   {{data.standard == 0 ? '' : data.standard == 1 ? 'Intellijel 1U' : data.standard == 2 ? 'PulpLo Logic 1U' : ""}}
   */
  standard: number;
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

export interface RackedModule {
  rackingData: RackingData;
  module: DbModule;
}
