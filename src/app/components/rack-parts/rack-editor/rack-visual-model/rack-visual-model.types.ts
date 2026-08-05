import { RackedModule } from 'src/app/models/module';
import { RackFunctionVisual } from '../../rack-function-visuals.utils';
import { RackLayoutHoverVisual } from '../../rack-layout-hover-highlight.utils';
import { RackPowerHeatmapVisual } from '../../rack-power-heatmap.utils';
import {
  SignalDestinationConfidence,
  SignalDestinationMatch,
  SignalTypeFamily
} from '../../rack-signal-analysis.utils';

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
  /** Local CSS pixels (pre-transform) for the overlay element positioning/sizing. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** SVG viewBox dimensions in viewport pixels (post-transform), matching the path coordinate space. */
  viewBoxWidth: number;
  viewBoxHeight: number;
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

export interface RackVisualModuleView {
  readonly rackedModule: RackedModule;
  readonly rowId: number;
  readonly moduleIndex: number;
  readonly moduleDomKey: string;
  readonly rackModuleStableDomKey: string;
  readonly rackModuleTrackKey: number | string;
  readonly effectiveHp: number;
  readonly enterAnimationDelay: number;
  readonly showHoverStats: boolean;
  readonly analysisVisualClass: string;
  readonly powerAnalysisVisual: RackPowerHeatmapVisual;
  readonly functionAnalysisVisual: RackFunctionVisual;
  readonly layoutAnalysisVisual: RackLayoutHoverVisual | null;
  readonly isModuleAnimationSuppressed: boolean;
  readonly isDropRevealSuppressed: boolean;
  readonly isDropRevealAnimating: boolean;
  readonly isModuleLayoutMoveAnimating: boolean;
  readonly isSameHpHighlighted: boolean;
  readonly isSameHpDimmed: boolean;
  readonly isSignalSource: boolean;
  readonly signalDestinationMatch: SignalDestinationMatch | null;
  readonly signalDestinationFamily: SignalTypeFamily | null;
  readonly signalDestinationRingColor: string | null;
  readonly signalDestinationGlowColor: string | null;
  readonly signalDestinationPanelTopColor: string | null;
  readonly signalDestinationPanelBottomColor: string | null;
  readonly signalDestinationPanelBorderColor: string | null;
  readonly isSignalMuted: boolean;
  readonly isTouchSelected: boolean;
  readonly isModuleDragDisabled: boolean;
  readonly isModuleOverflowing: boolean;
  readonly hasCompletePowerData: boolean;
}

export interface RackVisualRowView {
  readonly rowId: number;
  readonly row: RackedModule[];
  readonly modules: RackVisualModuleView[];
}
