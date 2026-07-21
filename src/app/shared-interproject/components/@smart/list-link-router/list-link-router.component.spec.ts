import { ListLinkRouterComponent } from './list-link-router.component';
import { cleanCardlinkModelObject, CardLink } from './clickable-list-card-base';

function makeComp(): ListLinkRouterComponent {
  return new ListLinkRouterComponent();
}

function makeArrayLink(label = 'Home'): CardLink {
  return { label, route: ['/home'] };
}

function makeStringLink(label = 'External'): CardLink {
  return { label, route: 'https://example.com' };
}

describe('ListLinkRouterComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp()).not.toThrow();
    });

    it('linksData defaults to cleanCardlinkModelObject', () => {
      const comp = makeComp();
      expect(comp.linksData).toBe(cleanCardlinkModelObject);
    });
  });

  describe('isRelative', () => {
    it('returns true when route is an array', () => {
      const comp = makeComp();
      expect(comp.isRelative(makeArrayLink())).toBeTrue();
    });

    it('returns false when route is a string', () => {
      const comp = makeComp();
      expect(comp.isRelative(makeStringLink())).toBeFalse();
    });

    it('returns true for empty array route', () => {
      const comp = makeComp();
      expect(comp.isRelative({ label: 'Test', route: [] })).toBeTrue();
    });

    it('returns false for absolute string route', () => {
      const comp = makeComp();
      expect(comp.isRelative({ label: 'Ext', route: 'http://example.com' })).toBeFalse();
    });
  });

  describe('doNothing', () => {
    it('is callable without error', () => {
      const comp = makeComp();
      expect(() => comp.doNothing()).not.toThrow();
    });
  });

  describe('ngOnInit', () => {
    it('does not throw', () => {
      const comp = makeComp();
      expect(() => comp.ngOnInit()).not.toThrow();
    });
  });

  describe('ngOnDestroy', () => {
    it('emits inherited destroy$ before completing', () => {
      const comp = makeComp();
      let received = false;
      comp.destroy$.subscribe(() => (received = true));
      comp.ngOnDestroy();
      expect(received).toBeTrue();
    });

    it('completes inherited destroy$ on destroy', () => {
      const comp = makeComp();
      let completed = false;
      comp.destroy$.subscribe({ complete: () => (completed = true) });
      comp.ngOnDestroy();
      expect(completed).toBeTrue();
    });
  });
});
