import { ElementRef } from '@angular/core';
import {
  ModuleDetailDemandSlot,
  ModuleDetailViewportDemand
} from './module-browser-detail.viewport-demand';

type EntryInit = { isIntersecting: boolean };

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly observed: Element[] = [];
  disconnected = false;

  constructor(private readonly callback: (entries: EntryInit[]) => void) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed.push(target);
  }

  disconnect(): void {
    this.disconnected = true;
  }

  trigger(isIntersecting: boolean): void {
    if (!this.disconnected) {
      this.callback([{isIntersecting}]);
    }
  }
}

describe('ModuleDetailViewportDemand', () => {
  let realIntersectionObserver: typeof IntersectionObserver | undefined;
  let emitted: ModuleDetailDemandSlot[];
  let demand: ModuleDetailViewportDemand;

  const anchor = () => new ElementRef<HTMLElement>(document.createElement('div'));

  beforeEach(() => {
    realIntersectionObserver = (globalThis as { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
    FakeIntersectionObserver.instances = [];
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver;
    emitted = [];
    demand = new ModuleDetailViewportDemand(slot => emitted.push(slot));
  });

  afterEach(() => {
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = realIntersectionObserver;
  });

  it('emits once on first viewport entry, not on repeats', () => {
    demand.observe('usage', anchor());

    FakeIntersectionObserver.instances[0].trigger(true);
    FakeIntersectionObserver.instances[0].trigger(true);

    expect(emitted).toEqual(['usage']);
  });

  it('re-emits after scroll-away and re-entry', () => {
    demand.observe('community', anchor());

    FakeIntersectionObserver.instances[0].trigger(true);
    FakeIntersectionObserver.instances[0].trigger(false);
    FakeIntersectionObserver.instances[0].trigger(true);

    expect(emitted).toEqual(['community', 'community']);
  });

  it('tracks slots independently', () => {
    demand.observe('usage', anchor());
    demand.observe('community', anchor());

    FakeIntersectionObserver.instances[0].trigger(true);

    expect(emitted).toEqual(['usage']);
  });

  it('reemitVisible emits only currently visible slots', () => {
    demand.observe('usage', anchor());
    demand.observe('community', anchor());
    FakeIntersectionObserver.instances[0].trigger(true);
    emitted = [];

    demand.reemitVisible();

    expect(emitted).toEqual(['usage']);
  });

  it('re-observing resets visibility so entry must happen again', () => {
    demand.observe('usage', anchor());
    FakeIntersectionObserver.instances[0].trigger(true);
    emitted = [];

    demand.observe('usage', anchor());
    demand.reemitVisible();

    expect(emitted).toEqual([]);
  });

  it('ignores a missing anchor without emitting', () => {
    expect(() => demand.observe('usage', undefined)).not.toThrow();
    demand.reemitVisible();

    expect(emitted).toEqual([]);
  });

  it('disconnect stops all observers', () => {
    demand.observe('usage', anchor());
    demand.observe('community', anchor());

    demand.disconnect();

    expect(FakeIntersectionObserver.instances.every(instance => instance.disconnected)).toBeTrue();
  });

  it('emits immediately when IntersectionObserver is unavailable (SSR/prerender)', () => {
    (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = undefined;
    const ssrEmitted: ModuleDetailDemandSlot[] = [];
    const ssrDemand = new ModuleDetailViewportDemand(slot => ssrEmitted.push(slot));

    ssrDemand.observe('usage', anchor());
    ssrDemand.observe('community', anchor());
    ssrDemand.reemitVisible();

    expect(ssrEmitted).toEqual(['usage', 'community', 'usage', 'community']);
  });
});
