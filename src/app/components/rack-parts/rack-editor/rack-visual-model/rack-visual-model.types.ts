import { SignalDestinationConfidence, SignalTypeFamily } from '../../rack-signal-analysis.utils';

export interface SignalOverlayLine {
  key: string;
  path: string;
  family: SignalTypeFamily;
  confidence: SignalDestinationConfidence;
}

export type SignalHoverCardPlacement = 'left' | 'right';

export type RackRowMoveDirection = 'up' | 'down';

export interface RackRowMoveMotion {
  sourceRowId: number;
  targetRowId: number;
  direction: RackRowMoveDirection;
}

export interface SignalOverlayFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ModuleRenderRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface ModuleLayoutMoveRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type ModuleLayoutAnimationCancel = () => void;
