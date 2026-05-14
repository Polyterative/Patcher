import { BrandLogoComponent } from './brand-logo.component';
describe('BrandLogoComponent', () => {
  it('creates', () => { expect(new BrandLogoComponent()).toBeTruthy(); });
  it('is an instance of BrandLogoComponent', () => {
    expect(new BrandLogoComponent()).toBeInstanceOf(BrandLogoComponent);
  });
  it('instances are independent', () => { expect(new BrandLogoComponent()).not.toBe(new BrandLogoComponent()); });
});
