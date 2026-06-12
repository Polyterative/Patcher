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
  takeUntil
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
      takeUntil(this.destroy$)
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

    const anchorRect = activeTip.anchorElement.getBoundingClientRect();
    if (anchorRect.width === 0 && anchorRect.height === 0) {
      return null;
    }

    const viewport = this.appViewportService.currentViewport();
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
      }
    );
    return {
      ...position,
      title: activeTip.definition.title,
      body: activeTip.definition.body
    };
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
