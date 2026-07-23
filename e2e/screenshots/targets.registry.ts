import registry = require('./targets.registry.cjs');


export interface ScreenshotTargetMetadata {
  id: string;
  fileName: string;
  title: string;
  authenticated: boolean;
  publicationGate: boolean;
}

interface ScreenshotTargetsRegistryModule {
  PUBLICATION_GATE_IDS: string[];
  SCREENSHOT_TARGETS_REGISTRY: ScreenshotTargetMetadata[];
}

const typedRegistry = registry as ScreenshotTargetsRegistryModule;

export const SCREENSHOT_TARGETS_REGISTRY = typedRegistry.SCREENSHOT_TARGETS_REGISTRY;
export const PUBLICATION_GATE_IDS = typedRegistry.PUBLICATION_GATE_IDS;
