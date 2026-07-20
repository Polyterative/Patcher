import { Injectable } from '@angular/core';
import { RackedModule } from 'src/app/models/module';
import {
  buildSignalModuleAnalysis,
  SignalDestinationMatch,
  SignalModuleAnalysis,
  SignalTypeFamily,
  suggestSignalFocusArea,
} from '../../rack-signal-analysis.utils';
import {
  ModuleRenderRect,
  SignalHoverCardPlacement,
  SignalOverlayFrame,
  SignalOverlayLine,
} from './rack-visual-model.types';
import {
  buildCurvedSignalPath,
  buildRenderedModuleElementMap,
  buildSignalOverlayFrame,
  resolveRenderedModuleRect,
  resolveSignalHoverCardPlacement,
  withAlpha,
} from './rack-visual-model.utils';

interface SignalStateParams {
  hoveredRackedModule: RackedModule | null;
  hoveredModuleElement: HTMLElement | null;
  rowedRackedModules: RackedModule[][] | null | undefined;
  screenElement: HTMLElement | null | undefined;
  hostElement: HTMLElement;
  rackViewportElement: HTMLElement | null;
  focusArea: ReturnType<typeof suggestSignalFocusArea> | null | undefined;
  isSignalModeActive: boolean;
  moduleDomKey: (module: RackedModule) => string;
  markForCheck: () => void;
}

@Injectable()
export class RackVisualModelSignalService {
  private static readonly signalFamilyColors: Record<SignalTypeFamily, string> = {
    audio: '#e2523c',
    pitch: '#7b61ff',
    clock: '#17a36b',
    modulation: '#2f80ed',
    other: '#76889b',
  };
  private static readonly signalHoverCardWidthPx = 224;
  private static readonly signalHoverCardGapPx = 10;

  private signalAnalysis: SignalModuleAnalysis | null = null;
  private signalDestinationMatches = new Map<string, SignalDestinationMatch>();

  signalHoverCardPlacement: SignalHoverCardPlacement = 'right';
  signalOverlayFrame: SignalOverlayFrame | null = null;
  signalOverlayLines: SignalOverlayLine[] = [];

  updateSignalAnalysisState(params: SignalStateParams): void {
    if (!params.hoveredRackedModule || !params.isSignalModeActive) {
      this.clear(false);
      params.markForCheck();
      return;
    }

    this.signalAnalysis = buildSignalModuleAnalysis(params.hoveredRackedModule, params.rowedRackedModules, {
      focusArea: params.focusArea ?? suggestSignalFocusArea(params.hoveredRackedModule),
      maxMatches: 8,
    });
    this.signalDestinationMatches = new Map(
      this.signalAnalysis.destinationMatches
        .map(match => [params.moduleDomKey(match.destination), match])
    );
    this.refreshSignalPresentation(params);
    params.markForCheck();
  }

  refreshSignalPresentation(params: Omit<SignalStateParams, 'isSignalModeActive' | 'focusArea' | 'markForCheck'>): void {
    if (!params.hoveredRackedModule || !params.screenElement) {
      this.signalOverlayFrame = null;
      this.signalOverlayLines = [];
      return;
    }

    const candidateElement = params.hoveredModuleElement
      ?? (params.hoveredRackedModule
        ? (params.screenElement.querySelector?.(`[data-rack-module-key="${ params.moduleDomKey(params.hoveredRackedModule) }"]`) as HTMLElement | null)
        : null);
    this.signalHoverCardPlacement = resolveSignalHoverCardPlacement(
      candidateElement,
      params.rackViewportElement,
      RackVisualModelSignalService.signalHoverCardWidthPx,
      RackVisualModelSignalService.signalHoverCardGapPx
    );
    this.signalOverlayLines = this.buildSignalOverlayLines(params);
  }

  clear(markForCheck: false | (() => void) = false): void {
    this.signalAnalysis = null;
    this.signalDestinationMatches.clear();
    this.signalHoverCardPlacement = 'right';
    this.signalOverlayFrame = null;
    this.signalOverlayLines = [];
    if (markForCheck) {
      markForCheck();
    }
  }

  signalAnalysisAtHover(): SignalModuleAnalysis | null {
    return this.signalAnalysis;
  }

  isSignalSourceModule(rackedModule: RackedModule, isSignalModeActive: boolean, isHoveredModule: boolean): boolean {
    return isSignalModeActive && isHoveredModule;
  }

  signalDestinationMatchFor(
    rackedModule: RackedModule,
    isSignalModeActive: boolean,
    isHoveredModule: boolean,
    moduleDomKey: string
  ): SignalDestinationMatch | null {
    if (!isSignalModeActive || isHoveredModule) {
      return null;
    }

    return this.signalDestinationMatches.get(moduleDomKey) ?? null;
  }

  signalDestinationFamily(
    rackedModule: RackedModule,
    isSignalModeActive: boolean,
    isHoveredModule: boolean,
    moduleDomKey: string
  ): SignalTypeFamily | null {
    return this.signalDestinationMatchFor(rackedModule, isSignalModeActive, isHoveredModule, moduleDomKey)?.family ?? null;
  }

  signalDestinationRingColor(family: SignalTypeFamily | null): string | null {
    return family ? withAlpha(RackVisualModelSignalService.signalFamilyColors[family], 0.18) : null;
  }

  signalDestinationGlowColor(family: SignalTypeFamily | null): string | null {
    return family ? withAlpha(RackVisualModelSignalService.signalFamilyColors[family], 0.08) : null;
  }

  signalDestinationPanelTopColor(family: SignalTypeFamily | null): string | null {
    return family ? withAlpha(RackVisualModelSignalService.signalFamilyColors[family], 0.2) : null;
  }

  signalDestinationPanelBottomColor(family: SignalTypeFamily | null): string | null {
    return family ? withAlpha(RackVisualModelSignalService.signalFamilyColors[family], 0.34) : null;
  }

  signalDestinationPanelBorderColor(family: SignalTypeFamily | null): string | null {
    return family ? withAlpha(RackVisualModelSignalService.signalFamilyColors[family], 0.24) : null;
  }

  isSignalMutedModule(
    rackedModule: RackedModule,
    isSignalModeActive: boolean,
    hoveredRackedModule: RackedModule | null,
    isHoveredModule: boolean,
    moduleDomKey: string
  ): boolean {
    return isSignalModeActive
      && !!hoveredRackedModule
      && !isHoveredModule
      && !this.signalDestinationMatches.has(moduleDomKey);
  }

  signalLineOpacity(line: SignalOverlayLine): number {
    return line.confidence === 'likely' ? 0.82 : 0.48;
  }

  signalLineStrokeWidth(line: SignalOverlayLine): number {
    return line.confidence === 'likely' ? 3.1 : 2.1;
  }

  signalLineColor(line: SignalOverlayLine): string {
    return RackVisualModelSignalService.signalFamilyColors[line.family];
  }

  signalLineShadow(line: SignalOverlayLine): string {
    return `drop-shadow(0 0 0.2rem ${ this.signalLineColor(line) }55)`;
  }

  signalOverlayViewBox(): string | null {
    if (!this.signalOverlayFrame) {
      return null;
    }

    return `0 0 ${ this.signalOverlayFrame.width } ${ this.signalOverlayFrame.height }`;
  }

  private buildSignalOverlayLines(params: Omit<SignalStateParams, 'isSignalModeActive' | 'focusArea' | 'markForCheck'>): SignalOverlayLine[] {
    const hoveredModule = params.hoveredRackedModule;

    if (!hoveredModule || !params.screenElement) {
      this.signalOverlayFrame = null;
      return [];
    }

    const screenElement = params.screenElement;
    const hostRect = params.hostElement.getBoundingClientRect();
    const screenRect = screenElement.getBoundingClientRect();
    const moduleElements = buildRenderedModuleElementMap(screenElement);
    const sourceElement = params.hoveredModuleElement ?? moduleElements.get(params.moduleDomKey(hoveredModule)) ?? null;
    this.signalOverlayFrame = buildSignalOverlayFrame(screenRect, hostRect);
    const sourceRect = this.resolveRenderedModuleRect(sourceElement, screenRect);

    if (!sourceRect) {
      this.signalOverlayFrame = null;
      return [];
    }

    return Array.from(this.signalDestinationMatches.values())
      .map(match => {
        const destinationRect = this.resolveRenderedModuleRect(
          moduleElements.get(params.moduleDomKey(match.destination)) ?? null,
          screenRect
        );
        if (!destinationRect) {
          return null;
        }

        return {
          key: `${ params.moduleDomKey(hoveredModule) }->${ params.moduleDomKey(match.destination) }`,
          path: buildCurvedSignalPath(sourceRect, destinationRect),
          family: match.family,
          confidence: match.confidence
        };
      })
      .filter((line): line is SignalOverlayLine => !!line);
  }

  private resolveRenderedModuleRect(candidateElement: HTMLElement | null, screenRect: DOMRect): ModuleRenderRect | null {
    return resolveRenderedModuleRect(candidateElement, screenRect);
  }
}
