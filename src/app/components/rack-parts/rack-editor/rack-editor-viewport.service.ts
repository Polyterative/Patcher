import {
  ChangeDetectorRef,
  ElementRef,
  Injectable,
  OnDestroy
} from '@angular/core';
import { RackMinimal } from 'src/app/models/rack';

@Injectable()
export class RackEditorViewportService implements OnDestroy {
  private static readonly reducedScaleMultiplier = 0.65;

  autoScale = 1;
  viewOptionsExpanded = false;
  rackViewportRef?: ElementRef<HTMLElement>;
  rackScaleSurfaceRef?: ElementRef<HTMLElement>;

  private rackScaleSurfaceResizeObserver?: ResizeObserver;
  private rackViewportResizeObserver?: ResizeObserver;
  private rackSurfaceBaseHeightPx = 0;
  private rackHp = 0;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.rackScaleSurfaceResizeObserver?.disconnect();
    this.rackViewportResizeObserver?.disconnect();
  }

  setRackData(data: RackMinimal | null | undefined, updateFrameAsync = false): void {
    this.setRackHp(data?.hp ?? 0);
    this.updateAutoScale();

    if (updateFrameAsync) {
      queueMicrotask(() => {
        this.updateRackSurfaceFrame();
        this.cdr.markForCheck();
      });
    }
  }

  setRackHp(rackHp: number): void {
    this.rackHp = rackHp;
  }

  setRackViewport(reference: ElementRef<HTMLElement> | undefined): void {
    this.rackViewportRef = reference;
    this.observeRackViewport(reference?.nativeElement);
    if (reference) {
      queueMicrotask(() => {
        this.updateAutoScale();
        this.cdr.markForCheck();
      });
    }
  }

  setRackScaleSurface(reference: ElementRef<HTMLElement> | undefined): void {
    this.rackScaleSurfaceRef = reference;
    this.observeRackScaleSurface(reference?.nativeElement);
    if (reference) {
      queueMicrotask(() => {
        this.updateRackSurfaceFrame();
        this.cdr.markForCheck();
      });
    }
  }

  onWindowResize(): void {
    this.updateAutoScale();
    this.cdr.markForCheck();
  }

  updateAutoScale(): void {
    const rackWidth = this.rackWidthPx;
    const availableWidth = this.rackViewportRef?.nativeElement.clientWidth ?? window.innerWidth;
    // A 0px viewport means it hasn't been laid out yet (route swap, loading
    // placeholder, hidden tab). Scaling to 0 there leaves the rack invisible until
    // a window resize, so keep the previous scale and let the viewport observer
    // recompute once the element actually has a width.
    if (availableWidth <= 0) {
      this.updateRackSurfaceFrame();
      return;
    }
    this.autoScale = rackWidth > 0
      ? Math.min(1, availableWidth / rackWidth)
      : 1;
    this.updateRackSurfaceFrame();
  }

  rackWidthRem(): number {
    return this.rackHp;
  }

  effectiveScale(userRequestedSmallerScale: boolean | null | undefined): number {
    return this.autoScale * (userRequestedSmallerScale ? RackEditorViewportService.reducedScaleMultiplier : 1);
  }

  scaledRackWidthPx(userRequestedSmallerScale: boolean | null | undefined): number {
    return this.rackWidthPx * this.effectiveScale(userRequestedSmallerScale);
  }

  scaledRackHeightPx(userRequestedSmallerScale: boolean | null | undefined): number {
    const baseHeight = this.rackSurfaceBaseHeightPx || this.rackScaleSurfaceRef?.nativeElement.offsetHeight || 0;
    return baseHeight * this.effectiveScale(userRequestedSmallerScale);
  }

  rackSurfaceTransform(userRequestedSmallerScale: boolean | null | undefined): string {
    return `scale(${ this.effectiveScale(userRequestedSmallerScale) })`;
  }

  shouldDisableDropAnimations(userRequestedSmallerScale: boolean | null | undefined): boolean {
    return !!userRequestedSmallerScale;
  }

  toggleViewOptions(): void {
    this.viewOptionsExpanded = !this.viewOptionsExpanded;
    this.cdr.markForCheck();
  }

  private get rackWidthPx(): number {
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const rem = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 16;
    return this.rackHp * rem;
  }

  private observeRackViewport(element: HTMLElement | undefined): void {
    this.rackViewportResizeObserver?.disconnect();
    this.rackViewportResizeObserver = undefined;

    if (!(element instanceof Element) || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.rackViewportResizeObserver = new ResizeObserver(() => {
      this.updateAutoScale();
      this.cdr.markForCheck();
    });

    this.rackViewportResizeObserver.observe(element);
  }

  private observeRackScaleSurface(element: HTMLElement | undefined): void {
    this.rackScaleSurfaceResizeObserver?.disconnect();
    this.rackScaleSurfaceResizeObserver = undefined;

    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    this.rackScaleSurfaceResizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      this.updateRackSurfaceFrame(entry.contentRect.height);
      this.cdr.markForCheck();
    });

    this.rackScaleSurfaceResizeObserver.observe(element);
  }

  private updateRackSurfaceFrame(surfaceHeightPx?: number): void {
    const measuredHeight = surfaceHeightPx ?? this.rackScaleSurfaceRef?.nativeElement.offsetHeight ?? 0;
    this.rackSurfaceBaseHeightPx = measuredHeight;
  }
}
