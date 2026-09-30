import { ElementRef } from '@angular/core';

export type ModuleDetailDemandSlot = 'usage' | 'community';

/**
 * Viewport-demand tracker for the below-fold module-detail reads (usage summary,
 * possession counts). Emits the owner's demand signal on first viewport entry —
 * IntersectionObserver also fires immediately for anchors already in view on load,
 * so no content goes missing. Keeps observing so scroll-away state stays accurate
 * for module-change re-emits. Falls back to immediate demand where
 * IntersectionObserver is unavailable (SSR/prerender) so content still loads.
 */
export class ModuleDetailViewportDemand {
  private readonly observers = new Map<ModuleDetailDemandSlot, IntersectionObserver>();
  private readonly visible = new Map<ModuleDetailDemandSlot, boolean>();

  constructor(private readonly emit: (slot: ModuleDetailDemandSlot) => void) {}

  observe(slot: ModuleDetailDemandSlot, ref: ElementRef<HTMLElement> | undefined): void {
    this.observers.get(slot)?.disconnect();
    this.observers.delete(slot);
    this.visible.set(slot, false);
    if (!ref) {
      return;
    }
    if (typeof IntersectionObserver === 'undefined') {
      this.visible.set(slot, true);
      this.emit(slot);
      return;
    }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!this.visible.get(slot)) {
            this.visible.set(slot, true);
            this.emit(slot);
          }
        } else {
          this.visible.set(slot, false);
        }
      }
    });
    this.observers.set(slot, observer);
    observer.observe(ref.nativeElement);
  }

  /** Re-emits demand for anchors currently in view (the observer stays silent when the module changes under it). */
  reemitVisible(): void {
    (['usage', 'community'] as const).forEach(slot => {
      if (this.visible.get(slot)) {
        this.emit(slot);
      }
    });
  }

  disconnect(): void {
    for (const observer of this.observers.values()) {
      observer.disconnect();
    }
    this.observers.clear();
  }
}
