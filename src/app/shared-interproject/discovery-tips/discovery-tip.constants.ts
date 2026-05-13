import { DiscoveryTipStorageShape } from './discovery-tip.models';


export const DISCOVERY_TIP_STORAGE_KEY = 'patcher.discovery-tips.v1';
export const DISCOVERY_TIP_GLOBAL_PAUSE_ID = '__global_pause__';
export const DEFAULT_GLOBAL_DISCOVERY_TIP_PAUSE_MS = 1000 * 60 * 60 * 24 * 7;

export const DEFAULT_STORAGE_SHAPE: DiscoveryTipStorageShape = {
  viewers: {}
};
