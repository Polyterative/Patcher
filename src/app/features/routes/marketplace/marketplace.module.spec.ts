import { marketplaceChildRoutes } from './marketplace.module';
import { MarketplaceBrowserComponent } from './marketplace-browser/marketplace-browser.component';
import { MarketplaceDetailComponent } from './marketplace-detail/marketplace-detail.component';

describe('MarketplaceModule routes', () => {
  it('keeps browse and detail in the lazy marketplace boundary', () => {
    expect(marketplaceChildRoutes).toEqual([
      jasmine.objectContaining({
        component: MarketplaceBrowserComponent,
        path: ''
      }),
      jasmine.objectContaining({
        component: MarketplaceDetailComponent,
        path: ':publicId'
      })
    ]);
  });
});
