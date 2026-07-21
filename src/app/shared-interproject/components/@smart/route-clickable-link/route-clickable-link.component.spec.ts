import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
import { of } from 'rxjs';
import {
  getRouteClickableLinkKey,
  RouteClickableLink,
  RouteClickableLinkComponent
} from './route-clickable-link.component';

function makeItem(overrides: Partial<RouteClickableLink> = {}): RouteClickableLink {
  return {
    label: 'Home',
    disabled: false,
    route: '/home',
    ...overrides
  };
}

function makeAppStateMock(): AppStateService {
  const breakpointObserver = jasmine.createSpyObj<BreakpointObserver>('BreakpointObserver', ['observe']);
  const breakpointState: BreakpointState = { matches: false, breakpoints: {} };
  breakpointObserver.observe.and.returnValue(of(breakpointState));
  return new AppStateService(breakpointObserver);
}

function makeComp(): RouteClickableLinkComponent {
  return new RouteClickableLinkComponent(makeAppStateMock());
}

// ─── getRouteClickableLinkKey ────────────────────────────────────────────────

describe('getRouteClickableLinkKey', () => {
  it('combines route, href, label, and icon with colons', () => {
    const item: RouteClickableLink = {
      label: 'Home',
      disabled: false,
      route: '/home',
      icon: 'home'
    };
    expect(getRouteClickableLinkKey(item)).toBe('/home::Home:home');
  });

  it('falls back to empty string for missing route', () => {
    const item: RouteClickableLink = { label: 'External', disabled: false, href: 'https://example.com' };
    expect(getRouteClickableLinkKey(item)).toBe(':https://example.com:External:');
  });

  it('produces deterministic keys for identical items', () => {
    const a = makeItem({ label: 'Test', route: '/test', icon: 'star' });
    const b = makeItem({ label: 'Test', route: '/test', icon: 'star' });
    expect(getRouteClickableLinkKey(a)).toBe(getRouteClickableLinkKey(b));
  });

  it('produces different keys for different labels', () => {
    const a = makeItem({ label: 'A' });
    const b = makeItem({ label: 'B' });
    expect(getRouteClickableLinkKey(a)).not.toBe(getRouteClickableLinkKey(b));
  });
});

// ─── RouteClickableLinkComponent ─────────────────────────────────────────────

describe('RouteClickableLinkComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp()).not.toThrow();
    });

    it('data$ defaults to of([])', (done) => {
      const comp = makeComp();
      comp.data$.subscribe(v => {
        expect(v).toEqual([]);
        done();
      });
    });

    it('direction defaults to "row"', () => {
      expect(makeComp().direction).toBe('row');
    });
  });

  describe('trackByLink', () => {
    it('returns the link key for a given item', () => {
      const comp = makeComp();
      const item = makeItem({ label: 'Test', route: '/test', icon: 'star' });
      expect(comp.trackByLink(0, item)).toBe(getRouteClickableLinkKey(item));
    });

    it('returns different keys for different items', () => {
      const comp = makeComp();
      const a = makeItem({ label: 'A' });
      const b = makeItem({ label: 'B' });
      expect(comp.trackByLink(0, a)).not.toBe(comp.trackByLink(1, b));
    });
  });

  describe('onLinkInteraction', () => {
    it('prevents default and stops propagation when item is disabled', () => {
      const comp = makeComp();
      const event = jasmine.createSpyObj<Event>('event', ['preventDefault', 'stopPropagation']);
      comp.onLinkInteraction(event, makeItem({ disabled: true }));
      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    it('does NOT prevent default when item is enabled', () => {
      const comp = makeComp();
      const event = jasmine.createSpyObj<Event>('event', ['preventDefault', 'stopPropagation']);
      comp.onLinkInteraction(event, makeItem({ disabled: false }));
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(event.stopPropagation).not.toHaveBeenCalled();
    });
  });
});
