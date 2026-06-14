import {
  AsyncPipe,
  isPlatformBrowser,
  NgStyle
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  fromEvent,
  merge,
  of
} from 'rxjs';
import {
  map,
  startWith,
} from 'rxjs/operators';
import { SubManager } from '../../directives/subscription-manager';
import { AppViewportService } from '../../app-viewport.service';
import { DiscoveryTipActive } from '../discovery-tip.models';
import { DiscoveryTipService } from '../discovery-tip.service';
import {
  calculateDiscoveryTipPosition,
  DiscoveryTipPosition,
  DiscoveryTipViewModel
} from './discovery-tip-surface.utils';

export { calculateDiscoveryTipPosition };

@Component({
  selector: 'app-discovery-tip-surface',
  templateUrl: './discovery-tip-surface.component.html',
  styleUrls: ['./discovery-tip-surface.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    NgStyle,
  ],
  standalone: true
})
export class DiscoveryTipSurfaceComponent extends SubManager implements OnInit {
  private readonly isBrowser: boolean;
  private tipPanelElement: HTMLElement | null = null;
  private tipResizeObserver: ResizeObserver | null = null;
  private measuredTipSize: {width: number; height: number} | undefined;
  private scrolledTipId: string | null = null;
  private readonly refreshTick$ = new BehaviorSubject<number>(0);
  readonly viewModel$;

  @ViewChild('tipPanel')
  set tipPanel(panel: ElementRef<HTMLElement> | undefined) {
    if (!this.isBrowser) {
      return;
    }

    this.tipResizeObserver?.disconnect();
    this.tipPanelElement = panel?.nativeElement ?? null;

    if (!this.tipPanelElement) {
      this.measuredTipSize = undefined;
      return;
    }

    this.updateMeasuredTipSize();
    this.tipResizeObserver = new ResizeObserver(() => this.updateMeasuredTipSize());
    this.tipResizeObserver.observe(this.tipPanelElement);
  }

  constructor(
    readonly discoveryTipService: DiscoveryTipService,
    private readonly appViewportService: AppViewportService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    super();
    this.isBrowser = isPlatformBrowser(platformId);
    this.viewModel$ = combineLatest([
      this.discoveryTipService.activeTip$.pipe(startWith(null)),
      this.refreshTick$
    ]).pipe(
      map(([activeTip]) => this.buildViewModel(activeTip))
    );
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    const visualViewport = window.visualViewport;
    merge(
      of(null),
      fromEvent(window, 'resize'),
      fromEvent(window, 'scroll', {capture: true}),
      ...(visualViewport ? [
        fromEvent(visualViewport, 'resize'),
        fromEvent(visualViewport, 'scroll')
      ] : [])
    ).pipe(
      this.takeUntilDestroyed()
    ).subscribe(() => {
      this.refreshTick$.next(Date.now());
    });
  }

  override ngOnDestroy(): void {
    this.tipResizeObserver?.disconnect();
    super.ngOnDestroy();
  }

  private buildViewModel(activeTip: DiscoveryTipActive | null): DiscoveryTipViewModel | null {
    if (!this.isBrowser || !activeTip) {
      return null;
    }

    const viewport = this.appViewportService.currentViewport();
    const anchorRect = this.focusRectFor(activeTip);
    if (anchorRect.width === 0 && anchorRect.height === 0) {
      return null;
    }

    if (!this.isVerticallyVisible(anchorRect, viewport.offsetTop, viewport.height)) {
      this.scrollTargetIntoView(activeTip);
      return null;
    }

    const guidedStepLabel = activeTip.guidedStepIndex && activeTip.guidedStepTotal
      ? `Step ${ activeTip.guidedStepIndex } of ${ activeTip.guidedStepTotal }`
      : undefined;
    const position = calculateDiscoveryTipPosition(
      anchorRect,
      viewport.width,
      viewport.height,
      activeTip.definition.title,
      activeTip.definition.body,
      this.measuredTipSize,
      {
        offsetLeft: viewport.offsetLeft,
        offsetTop: viewport.offsetTop
      },
      activeTip.definition.placement?.preferredSide ?? 'auto'
    );
    return {
      ...position,
      title: activeTip.definition.title,
      body: activeTip.definition.body,
      reason: activeTip.reason,
      guidedStepLabel,
      isGuided: !!activeTip.guidedStepTotal,
      isLastGuidedStep: activeTip.guidedStepIndex === activeTip.guidedStepTotal,
      highlight: this.highlightFor(anchorRect, viewport.offsetLeft, viewport.offsetTop, viewport.width, viewport.height)
    };
  }

  private scrollTargetIntoView(activeTip: DiscoveryTipActive): void {
    if (this.scrolledTipId === activeTip.definition.id) {
      return;
    }

    this.scrolledTipId = activeTip.definition.id;
    activeTip.anchorElement.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'instant'
    });
    window.requestAnimationFrame(() => this.refreshTick$.next(Date.now()));
  }

  private isVerticallyVisible(rect: DOMRect, viewportTop: number, viewportHeight: number): boolean {
    const margin = 16;
    const visibleTop = viewportTop + margin;
    const visibleBottom = viewportTop + viewportHeight - margin;
    return rect.top >= visibleTop && rect.bottom <= visibleBottom;
  }

  private focusRectFor(activeTip: DiscoveryTipActive): DOMRect {
    const anchorRect = activeTip.anchorElement.getBoundingClientRect();
    const targetKind = activeTip.definition.placement?.targetKind ?? 'element';
    if (targetKind === 'control' || activeTip.definition.anchorId === 'user-area-search') {
      return this.controlRect(activeTip.anchorElement, anchorRect);
    }

    if (targetKind === 'element' || targetKind === 'action') {
      return anchorRect;
    }

    const sectionRect = this.sectionStartRect(activeTip.anchorElement, anchorRect);
    return this.rectFromBounds(
      sectionRect.left,
      sectionRect.top,
      sectionRect.width,
      Math.min(sectionRect.height, 112)
    );
  }

  private controlRect(anchorElement: HTMLElement, fallbackRect: DOMRect): DOMRect {
    const exactControl = anchorElement.querySelector<HTMLElement>(
      '.mdc-notched-outline, .mat-mdc-text-field-wrapper, .mdc-text-field'
    );
    if (exactControl) {
      const rect = exactControl.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }

    const candidates = anchorElement.querySelectorAll<HTMLElement>(
      'input, textarea, button, [role="textbox"], .mat-mdc-form-field, mat-form-field, .user-area-utility-search__field'
    );
    for (const candidate of Array.from(candidates)) {
      const rect = candidate.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }
    return fallbackRect;
  }

  private sectionStartRect(anchorElement: HTMLElement, fallbackRect: DOMRect): DOMRect {
    const candidates = anchorElement.querySelectorAll<HTMLElement>(
      'lib-hero-content-card, .container > .row.gap1, .section-actions, h1, h2, h3, .title'
    );
    for (const candidate of Array.from(candidates)) {
      const rect = candidate.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }
    return fallbackRect;
  }

  private highlightFor(
    rect: DOMRect,
    viewportLeft: number,
    viewportTop: number,
    viewportWidth: number,
    viewportHeight: number
  ) {
    const padding = 8;
    const left = Math.max(viewportLeft + 8, rect.left - padding);
    const top = Math.max(viewportTop + 8, rect.top - padding);
    const right = Math.min(viewportLeft + viewportWidth - 8, rect.right + padding);
    const bottom = Math.min(viewportTop + viewportHeight - 8, rect.bottom + padding);
    return {
      left,
      top,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
    };
  }

  private rectFromBounds(left: number, top: number, width: number, height: number): DOMRect {
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({})
    } as DOMRect;
  }

  private updateMeasuredTipSize(): void {
    if (!this.tipPanelElement) {
      return;
    }

    const rect = this.tipPanelElement.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (width === 0 || height === 0) {
      return;
    }

    if (this.measuredTipSize?.width === width && this.measuredTipSize.height === height) {
      return;
    }

    this.measuredTipSize = {width, height};
    this.refreshTick$.next(Date.now());
  }
}
