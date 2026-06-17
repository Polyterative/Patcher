import { DiscoveryTipStorageShape } from './discovery-tip.models';


export const DISCOVERY_TIP_STORAGE_KEY = 'patcher.discovery-tips.v2';
export const LEGACY_DISCOVERY_TIP_STORAGE_KEY = 'patcher.discovery-tips.v1';
export const DISCOVERY_TIP_GLOBAL_PAUSE_ID = '__global_pause__';
export const DEFAULT_GLOBAL_DISCOVERY_TIP_PAUSE_MS = 1000 * 60 * 60 * 24 * 7;
export const DEFAULT_TIP_SPACING_MS = 1000 * 60 * 60 * 6;
export const DISCOVERY_TIP_NEW_VIEWER_BASELINE_AT = '1970-01-01T00:00:00.000Z';

export const DEFAULT_STORAGE_SHAPE: DiscoveryTipStorageShape = {
  schemaVersion: 2,
  viewers: {}
};
