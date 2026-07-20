import {
  Privatable,
  Timestamped
} from './models';
import { PublicUser } from './user';

export const RACK_MODULE_ORIENTATIONS = {
  normal: 'normal',
  rot180: 'rot180'
} as const;

export type RackModuleOrientation = typeof RACK_MODULE_ORIENTATIONS[keyof typeof RACK_MODULE_ORIENTATIONS];

export const DEFAULT_RACK_MODULE_ORIENTATION: RackModuleOrientation = RACK_MODULE_ORIENTATIONS.normal;

const FLIPPABLE_3U_STANDARD_IDS = new Set([0, 1000]);

export function normalizeRackModuleOrientation(value: unknown): RackModuleOrientation {
  return value === RACK_MODULE_ORIENTATIONS.rot180
    ? RACK_MODULE_ORIENTATIONS.rot180
    : RACK_MODULE_ORIENTATIONS.normal;
}

export function nextRackModuleOrientation(value: unknown): RackModuleOrientation {
  return normalizeRackModuleOrientation(value) === RACK_MODULE_ORIENTATIONS.rot180
    ? RACK_MODULE_ORIENTATIONS.normal
    : RACK_MODULE_ORIENTATIONS.rot180;
}

export function isFlippableRackModuleStandard(standardId: number | null | undefined): boolean {
  return typeof standardId === 'number' && FLIPPABLE_3U_STANDARD_IDS.has(standardId);
}


export interface RackingData {
  id?: number;
  rackid: number;
  moduleid: number;
  row: number | null;
  column: number | null;
  selectedPanelId?: number | null;
  orientation?: RackModuleOrientation;
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
  image?: string;
  /** Opaque ~71-bit URL token. Used by `/racks/:publicId` routes. */
  public_id?: string;

}
