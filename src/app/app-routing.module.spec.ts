import { environment } from 'src/environments/environment';
import {
  appRoutes,
  marketplaceRoutes
} from './app-routing.module';

describe('AppRoutingModule routes', () => {
  it('keeps low-traffic error/retired-link pages lazy-loaded', () => {
    const retiredRoute = appRoutes.find(route => route.path === 'links/retired');
    const notFoundRoute = appRoutes.find(route => route.path === '404');

    expect(retiredRoute?.loadComponent).toEqual(jasmine.any(Function));
    expect(retiredRoute?.component).toBeUndefined();
    expect(notFoundRoute?.loadComponent).toEqual(jasmine.any(Function));
    expect(notFoundRoute?.component).toBeUndefined();
  });

  it('gates the marketplace lazy route behind the marketplace feature flag', () => {
    const marketplaceRoute = appRoutes.find(route => route.path === 'marketplace');

    expect(marketplaceRoutes.length).toBe(environment.features.marketplaceEnabled ? 1 : 0);
    if (environment.features.marketplaceEnabled) {
      expect(marketplaceRoute?.loadChildren).toEqual(jasmine.any(Function));
      expect(marketplaceRoute?.component).toBeUndefined();
      return;
    }

    expect(marketplaceRoute).toBeUndefined();
  });
});
