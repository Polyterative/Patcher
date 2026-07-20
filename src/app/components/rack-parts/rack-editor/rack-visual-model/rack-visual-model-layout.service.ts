import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { RackedModule } from 'src/app/models/module';
import {
  buildRackLayoutHoverCandidates,
  buildRackLayoutHoverVisuals,
  RackLayoutHoverCandidates,
  RackLayoutHoverVisual,
} from '../../rack-layout-hover-highlight.utils';
import {
  ModuleLayoutAnimationCancel,
  RackRowMoveDirection,
  RackRowMoveMotion,
} from './rack-visual-model.types';
import {
  captureModuleLayoutMoveRects,
  findMovedRackModuleKeys,
  playModuleLayoutMoveAnimations,
} from './rack-visual-model.utils';

interface LayoutHoverStateParams {
  rowedRackedModules: RackedModule[][] | null | undefined;
  hoveredRackedModule: RackedModule | null;
  isLayoutModeActive: boolean;
  isLayoutCombinationHoverModeActive: boolean;
  moduleDomKey: (module: RackedModule) => string;
  markForCheck: () => void;
}

interface LayoutMoveAnimationParams {
  previousRows: RackedModule[][] | null | undefined;
  nextRows: RackedModule[][] | null | undefined;
  screenElement: HTMLElement | null | undefined;
  dragScale: number;
  suppressPostDropReorder: boolean;
  keyForModule: (module: RackedModule) => string;
  markForCheck: () => void;
}

@Injectable()
export class RackVisualModelLayoutService {
  private static readonly enterDelaySuppressionDurationMs = 225;
  private static readonly layoutMoveAnimationDurationMs = 620;
  private static readonly manualDropLayoutMoveCooldownMs = 520;
  private static readonly rowMoveAnimationDurationMs = 350;
  private static readonly layoutHoverPhaseDurationMs = 1000;

  private layoutMoveAnimationCancel: ModuleLayoutAnimationCancel | null = null;
  private layoutMoveAnimatingKeys = new Set<string>();
  private readonly enterDelaySuppressedPositions = new Set<string>();
  private readonly enterDelaySuppressionTimerIds = new Map<string, number>();
  private layoutMoveSuppressedUntilMs = 0;
  private rowMoveAnimationTimerId: number | null = null;
  private layoutHoverCandidates: RackLayoutHoverCandidates | null = null;
  private layoutHoverVisuals = new Map<string, RackLayoutHoverVisual>();
  private layoutHoverPhaseIndex = 0;
  private layoutHoverAnimationTimerId: number | null = null;
  private layoutHoverRows: RackedModule[][] | null | undefined = null;
  private layoutHoverModuleDomKey: ((module: RackedModule) => string) | null = null;
  private layoutHoverCombinationMode = false;

  layoutMoveAngularAnimationsDisabled = false;
  readonly rowMoveMotion$ = new BehaviorSubject<RackRowMoveMotion | null>(null);

  prepareLayoutMoveAnimation(params: LayoutMoveAnimationParams): void {
    if (!this.shouldRunLayoutMoveAnimation(params.suppressPostDropReorder)) {
      this.cancelLayoutMoveAnimation();
      return;
    }

    const movedKeys = findMovedRackModuleKeys(params.previousRows, params.nextRows, params.keyForModule);
    if (movedKeys.size === 0) {
      this.cancelLayoutMoveAnimation();
      return;
    }

    if (!params.screenElement) {
      return;
    }

    const snapshots = captureModuleLayoutMoveRects(params.screenElement, movedKeys);
    this.cancelLayoutMoveAnimation();
    if (snapshots.size === 0) {
      return;
    }

    this.layoutMoveAngularAnimationsDisabled = true;
    this.layoutMoveAnimatingKeys = movedKeys;
    this.layoutMoveAnimationCancel = playModuleLayoutMoveAnimations(
      params.screenElement,
      snapshots,
      RackVisualModelLayoutService.layoutMoveAnimationDurationMs,
      params.dragScale,
      () => {
        this.layoutMoveAnimatingKeys.clear();
        this.layoutMoveAngularAnimationsDisabled = false;
        this.layoutMoveAnimationCancel = null;
        params.markForCheck();
      }
    );
  }

  cancelLayoutMoveAnimation(): void {
    this.layoutMoveAnimationCancel?.();
    this.layoutMoveAnimationCancel = null;
    this.layoutMoveAnimatingKeys.clear();
    this.layoutMoveAngularAnimationsDisabled = false;
  }

  startRowMoveAnimation(
    move: {rowId: number; direction: RackRowMoveDirection},
    totalRows: number,
    markForCheck: () => void
  ): void {
    const targetRowId = move.direction === 'up' ? move.rowId - 1 : move.rowId + 1;
    if (move.rowId < 0 || move.rowId >= totalRows || targetRowId < 0 || targetRowId >= totalRows) {
      return;
    }

    this.clearRowMoveAnimation();
    this.rowMoveMotion$.next({
      sourceRowId: move.rowId,
      targetRowId,
      direction: move.direction,
    });
    markForCheck();

    if (typeof window === 'undefined') {
      return;
    }

    this.rowMoveAnimationTimerId = window.setTimeout(() => {
      this.rowMoveAnimationTimerId = null;
      this.rowMoveMotion$.next(null);
      markForCheck();
    }, RackVisualModelLayoutService.rowMoveAnimationDurationMs);
  }

  clearRowMoveAnimation(): void {
    if (this.rowMoveAnimationTimerId != null && typeof window !== 'undefined') {
      window.clearTimeout(this.rowMoveAnimationTimerId);
    }
    this.rowMoveAnimationTimerId = null;
    this.rowMoveMotion$.next(null);
  }

  suppressEnterDelayForPosition(positionKey: string, markForCheck: () => void): void {
    this.enterDelaySuppressedPositions.add(positionKey);
    markForCheck();

    if (typeof window === 'undefined') {
      return;
    }

    const existingTimerId = this.enterDelaySuppressionTimerIds.get(positionKey);
    if (existingTimerId != null) {
      window.clearTimeout(existingTimerId);
    }

    const timerId = window.setTimeout(() => {
      this.enterDelaySuppressionTimerIds.delete(positionKey);
      this.enterDelaySuppressedPositions.delete(positionKey);
      markForCheck();
    }, RackVisualModelLayoutService.enterDelaySuppressionDurationMs);
    this.enterDelaySuppressionTimerIds.set(positionKey, timerId);
  }

  clearEnterDelaySuppressions(): void {
    if (typeof window !== 'undefined') {
      for (const timerId of this.enterDelaySuppressionTimerIds.values()) {
        window.clearTimeout(timerId);
      }
    }
    this.enterDelaySuppressionTimerIds.clear();
    this.enterDelaySuppressedPositions.clear();
  }

  enterAnimationDelay(positionKey: string, index: number): number {
    return this.isEnterDelaySuppressed(positionKey) ? 0 : index * 50;
  }

  isEnterDelaySuppressed(positionKey: string): boolean {
    return this.enterDelaySuppressedPositions.has(positionKey);
  }

  updateLayoutHoverState(params: LayoutHoverStateParams): void {
    this.stopLayoutHoverAnimation();
    this.layoutHoverRows = params.rowedRackedModules;
    this.layoutHoverModuleDomKey = params.moduleDomKey;
    this.layoutHoverCombinationMode = params.isLayoutCombinationHoverModeActive;

    if (!params.hoveredRackedModule || !params.isLayoutModeActive) {
      this.clearLayoutHoverState(false);
      params.markForCheck();
      return;
    }

    this.layoutHoverCandidates = buildRackLayoutHoverCandidates(
      params.rowedRackedModules,
      params.hoveredRackedModule,
      params.moduleDomKey
    );
    this.layoutHoverPhaseIndex = this.initialLayoutHoverPhaseIndex();
    this.refreshLayoutHoverVisuals();

    if (this.shouldCycleLayoutHoverHighlights()) {
      this.layoutHoverAnimationTimerId = window.setInterval(() => {
        this.advanceLayoutHoverPhase(params.markForCheck);
      }, RackVisualModelLayoutService.layoutHoverPhaseDurationMs);
    }

    params.markForCheck();
  }

  layoutAnalysisVisual(moduleDomKey: string): RackLayoutHoverVisual | null {
    return this.layoutHoverVisuals.get(moduleDomKey) ?? null;
  }

  clearLayoutHoverState(shouldStopAnimation = true): void {
    if (shouldStopAnimation) {
      this.stopLayoutHoverAnimation();
    }
    this.layoutHoverCandidates = null;
    this.layoutHoverVisuals.clear();
    this.layoutHoverPhaseIndex = 0;
  }

  suppressLayoutMoveAnimationForManualDrop(): void {
    this.layoutMoveSuppressedUntilMs = Date.now() + RackVisualModelLayoutService.manualDropLayoutMoveCooldownMs;
    this.cancelLayoutMoveAnimation();
  }

  isRowMovingUp(rowId: number, motion: RackRowMoveMotion | null): boolean {
    return !!motion && (
      (motion.direction === 'up' && motion.targetRowId === rowId)
      || (motion.direction === 'down' && motion.sourceRowId === rowId)
    );
  }

  isRowMovingDown(rowId: number, motion: RackRowMoveMotion | null): boolean {
    return !!motion && (
      (motion.direction === 'down' && motion.targetRowId === rowId)
      || (motion.direction === 'up' && motion.sourceRowId === rowId)
    );
  }

  isModuleLayoutMoveAnimating(moduleStableDomKey: string): boolean {
    return this.layoutMoveAnimatingKeys.has(moduleStableDomKey);
  }

  areLayoutMoveAngularAnimationsDisabled(): boolean {
    return this.layoutMoveAngularAnimationsDisabled;
  }

  destroy(): void {
    this.cancelLayoutMoveAnimation();
    this.clearRowMoveAnimation();
    this.clearEnterDelaySuppressions();
    this.clearLayoutHoverState();
  }

  private advanceLayoutHoverPhase(markForCheck: () => void): void {
    const combinationCount = this.layoutHoverCandidates?.combinationGroups.length ?? 0;
    if (!this.layoutHoverCombinationMode || combinationCount <= 1) {
      return;
    }

    this.layoutHoverPhaseIndex = ((this.layoutHoverPhaseIndex - 1 + 1) % combinationCount) + 1;
    this.refreshLayoutHoverVisuals();
    markForCheck();
  }

  private refreshLayoutHoverVisuals(): void {
    this.layoutHoverVisuals = this.layoutHoverCandidates && this.layoutHoverModuleDomKey
      ? buildRackLayoutHoverVisuals(
        this.layoutHoverRows,
        this.layoutHoverCandidates,
        this.layoutHoverPhaseIndex,
        this.layoutHoverModuleDomKey
      )
      : new Map<string, RackLayoutHoverVisual>();
  }

  private stopLayoutHoverAnimation(): void {
    if (this.layoutHoverAnimationTimerId == null) {
      return;
    }

    window.clearInterval(this.layoutHoverAnimationTimerId);
    this.layoutHoverAnimationTimerId = null;
  }

  private shouldCycleLayoutHoverHighlights(): boolean {
    return typeof window !== 'undefined'
      && this.layoutHoverCombinationMode
      && (this.layoutHoverCandidates?.combinationGroups.length ?? 0) > 1
      && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  }

  private initialLayoutHoverPhaseIndex(): number {
    return this.layoutHoverCombinationMode
      && (this.layoutHoverCandidates?.combinationGroups.length ?? 0) > 0
      ? 1
      : 0;
  }

  private shouldRunLayoutMoveAnimation(suppressPostDropReorder: boolean): boolean {
    return typeof window !== 'undefined'
      && !!window.requestAnimationFrame
      && !window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
      && Date.now() >= this.layoutMoveSuppressedUntilMs
      && !suppressPostDropReorder;
  }
}
