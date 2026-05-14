import {
  buildCardLinkRoute,
  buildCardAbsoluteRoute,
  cleanCardlinkModelObject
} from './clickable-list-card-base';

describe('clickable-list-card-base', () => {
  describe('buildCardLinkRoute', () => {
    it('builds a card link with route array', () => {
      const link = buildCardLinkRoute('Home', ['/home'], 'home');
      expect(link.label).toBe('Home');
      expect(link.route).toEqual(['/home']);
      expect(link.icon).toBe('home');
    });

    it('sets disabled and hidden observables', () => {
      const disabled$ = {} as any;
      const hidden$ = {} as any;
      const link = buildCardLinkRoute('x', ['/x'], undefined, disabled$, hidden$);
      expect(link.disabled).toBe(disabled$);
      expect(link.hidden).toBe(hidden$);
    });

    it('icon is undefined when not provided', () => {
      const link = buildCardLinkRoute('Test', ['/test']);
      expect(link.icon).toBeUndefined();
    });
  });

  describe('buildCardAbsoluteRoute', () => {
    it('builds a card link with absolute route string', () => {
      const link = buildCardAbsoluteRoute('Profile', '/profile', 'person');
      expect(link.label).toBe('Profile');
      expect(link.route).toBe('/profile');
      expect(link.icon).toBe('person');
    });
  });

  describe('cleanCardlinkModelObject', () => {
    it('starts with empty links array', () => {
      expect(cleanCardlinkModelObject.links).toEqual([]);
    });

    it('has selected$ ReplaySubject', () => {
      expect(cleanCardlinkModelObject.selected$).toBeTruthy();
    });

    it('has click$ EventEmitter', () => {
      expect(cleanCardlinkModelObject.click$).toBeTruthy();
    });
  });
});
