import { appRoutes } from './app-routing.module';

describe('AppRoutingModule routes', () => {
  it('keeps low-traffic error/retired-link pages lazy-loaded', () => {
    const retiredRoute = appRoutes.find(route => route.path === 'links/retired');
    const notFoundRoute = appRoutes.find(route => route.path === '404');

    expect(retiredRoute?.loadComponent).toEqual(jasmine.any(Function));
    expect(retiredRoute?.component).toBeUndefined();
    expect(notFoundRoute?.loadComponent).toEqual(jasmine.any(Function));
    expect(notFoundRoute?.component).toBeUndefined();
  });
});
