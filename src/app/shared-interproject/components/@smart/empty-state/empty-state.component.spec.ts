import { EmptyStateComponent } from './empty-state.component';
import { ActivatedRoute, Router } from '@angular/router';

function makeRouteMock(backgroundImage?: string): ActivatedRoute {
  return {
    snapshot: {
      data: backgroundImage !== undefined ? { backgroundImage } : {}
    }
  } as ActivatedRoute;
}

function makeRouterMock(): jasmine.SpyObj<Router> {
  return jasmine.createSpyObj<Router>('Router', ['navigate']);
}

function makeComp(route = makeRouteMock(), router = makeRouterMock()): EmptyStateComponent {
  return new EmptyStateComponent(route, router);
}

describe('EmptyStateComponent', () => {
  describe('construction', () => {
    it('creates without error', () => {
      expect(() => makeComp()).not.toThrow();
    });

    it('backgroundImage starts as undefined', () => {
      expect(makeComp().backgroundImage).toBeUndefined();
    });

    it('uses professional default empty-state copy', () => {
      const comp = makeComp();
      expect(comp.icon).toBe('search_off');
      expect(comp.title).toBe('No results found');
      expect(comp.copy).toBe('Try adjusting the filters or clearing the current search.');
    });
  });

  describe('ngOnInit — backgroundImage resolution', () => {
    it('uses @Input backgroundImage when provided', () => {
      const comp = makeComp(makeRouteMock('/some/image.jpg'));
      comp.backgroundImage = '/input/override.jpg';
      comp.ngOnInit();
      expect(comp.backgroundImage).toBe('/input/override.jpg');
    });

    it('uses route snapshot backgroundImage when @Input is absent', () => {
      const comp = makeComp(makeRouteMock('/route/image.jpg'));
      comp.ngOnInit();
      expect(comp.backgroundImage).toBe('/route/image.jpg');
    });

    it('does not override @Input when route data also has backgroundImage', () => {
      const comp = makeComp(makeRouteMock('/route/image.jpg'));
      comp.backgroundImage = '/my-input.jpg';
      comp.ngOnInit();
      // @Input wins over route data
      expect(comp.backgroundImage).toBe('/my-input.jpg');
    });

    it('supports no backgroundImage when neither @Input nor route data has it', () => {
      const comp = makeComp(makeRouteMock()); // no route data
      const warnSpy = spyOn(console, 'warn');
      comp.ngOnInit();
      expect(comp.backgroundImage).toBeUndefined();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('stays quiet when both @Input and route data are absent', () => {
      const comp = makeComp(makeRouteMock());
      const warnSpy = spyOn(console, 'warn');
      comp.ngOnInit();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does NOT warn when @Input is provided', () => {
      const comp = makeComp(makeRouteMock());
      comp.backgroundImage = '/provided.jpg';
      const warnSpy = spyOn(console, 'warn');
      comp.ngOnInit();
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does NOT warn when route data is provided', () => {
      const comp = makeComp(makeRouteMock('/route.jpg'));
      const warnSpy = spyOn(console, 'warn');
      comp.ngOnInit();
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
