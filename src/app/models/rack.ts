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

/**
 * Database storage values for `rack_modules.orientation` after the smallint
 * migration (GitHub issue #145): `0` is normal, `1` is `rot180`, `2+` reserved
 * for reviewed future states. Phase 1 readers accept both the legacy text and
 * the numeric encodings; writers still send text until the operator apply.
 */
export const RACK_MODULE_ORIENTATION_DB_VALUES = {
  normal: 0,
  rot180: 1
} as const;

const FLIPPABLE_3U_STANDARD_IDS = new Set([0, 1000]);

export function normalizeRackModuleOrientation(value: unknown): RackModuleOrientation {
  if (
    value === RACK_MODULE_ORIENTATIONS.rot180 ||
    value === RACK_MODULE_ORIENTATION_DB_VALUES.rot180
  ) {
    return RACK_MODULE_ORIENTATIONS.rot180;
  }
  return RACK_MODULE_ORIENTATIONS.normal;
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
