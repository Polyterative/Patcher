import { ProducthuntBadgeComponent } from './producthunt-badge.component';
describe('ProducthuntBadgeComponent', () => {
  it('creates', () => { expect(new ProducthuntBadgeComponent()).toBeTruthy(); });
  it('ngOnInit no-throw', () => { const c = new ProducthuntBadgeComponent(); expect(() => c.ngOnInit()).not.toThrow(); });
});
