import { CV }     from './cv';
import {
  Manufacturer,
  MinimalManufacturer
}                 from './manufacturer';
import {
  Timestamped
}                 from './models';
import { Switch } from './switch';

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

export interface DbModule extends MinimalModule {
  ins: CV[];
  outs: CV[];
  switches: Switch[];
  manualURL: string;
  additional: any;
  isComplete: boolean;
  isDIY: boolean;
}

export interface MinimalModule extends Timestamped {
  id: number;
  name: string;
  description: string;
  hp: number;
  public: boolean;
  manufacturer: MinimalManufacturer;
  standard: number;
}
