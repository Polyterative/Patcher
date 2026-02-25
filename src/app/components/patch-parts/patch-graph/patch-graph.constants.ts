export const PATCH_GRAPH_NODE_TYPE = {
  MODULE: 'module',
  CV_OUT: 'cv-out',
  CV_IN: 'cv-in'
} as const;

export type PatchGraphNodeType = typeof PATCH_GRAPH_NODE_TYPE[keyof typeof PATCH_GRAPH_NODE_TYPE];

export const PATCH_GRAPH_EDGE_STAGE = {
  MODULE_BRIDGE: 'module-bridge',
  MODULE_TO_CV_OUT: 'module-to-cv-out',
  CV_IN_TO_MODULE: 'cv-in-to-module',
  CV_OUT_TO_CV_IN: 'cv-out-to-cv-in'
} as const;

export type PatchGraphEdgeStage = typeof PATCH_GRAPH_EDGE_STAGE[keyof typeof PATCH_GRAPH_EDGE_STAGE];

export const PATCH_GRAPH_HIDDEN_COLOR = 'rgba(0, 0, 0, 0)';
