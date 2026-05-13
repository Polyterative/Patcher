import { SignalDestinationConfidence, SignalTypeFamily } from '../../rack-signal-analysis.utils';

export interface SignalOverlayLine {
  key: string;
  path: string;
  family: SignalTypeFamily;
  confidence: SignalDestinationConfidence;
}

export type SignalHoverCardPlacement = 'left' | 'right';

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
