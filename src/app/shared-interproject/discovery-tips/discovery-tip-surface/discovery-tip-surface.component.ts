import {
  AsyncPipe,
  isPlatformBrowser,
  NgStyle
} from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID
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


interface DiscoveryTipPosition {
  left: number;
  top: number;
  side: 'above' | 'below';
}

interface DiscoveryTipViewModel extends DiscoveryTipPosition {
  title: string;
  body: string;
}

function estimateDiscoveryTipHeight(title: string, body: string, tipWidth: number): number {
  const contentWidth = Math.max(180, tipWidth - 32);
  const charsPerLine = Math.max(22, Math.floor(contentWidth / 8.5));
  const titleLines = Math.max(1, Math.ceil(title.length / Math.max(16, charsPerLine - 6)));
  const bodyLines = Math.max(2, Math.ceil(body.length / charsPerLine));

  return 132 + (titleLines * 24) + (bodyLines * 18);
}

export function calculateDiscoveryTipPosition(
  anchorRect: DOMRect,
  viewportWidth: number,
  viewportHeight: number,
  title = '',
  body = ''
): DiscoveryTipPosition {
  const tipWidth = Math.min(320, viewportWidth - 32);
  const tipHeight = estimateDiscoveryTipHeight(title, body, tipWidth);
  const gap = 14;
  const preferAbove = anchorRect.top > viewportHeight * 0.45;
  const side: 'above' | 'below' = preferAbove ? 'above' : 'below';
  const unclampedLeft = anchorRect.left + (anchorRect.width / 2) - (tipWidth / 2);
  const left = Math.max(16, Math.min(unclampedLeft, viewportWidth - tipWidth - 16));
  const top = side === 'above'
    ? Math.max(16, anchorRect.top - gap - tipHeight)
    : Math.min(viewportHeight - tipHeight - 16, anchorRect.bottom + gap);

  return {
    left,
    top,
    side
  };
}

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
  private readonly refreshTick$ = new BehaviorSubject<number>(0);
  readonly viewModel$;

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
      activeTip.definition.body
    );
    return {
      ...position,
      title: activeTip.definition.title,
      body: activeTip.definition.body
    };
  }
}
