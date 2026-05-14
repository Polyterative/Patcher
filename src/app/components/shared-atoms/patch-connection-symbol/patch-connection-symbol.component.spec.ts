import { PatchConnectionSymbolComponent } from './patch-connection-symbol.component';
describe('PatchConnectionSymbolComponent', () => {
  it('creates', () => { expect(new PatchConnectionSymbolComponent()).toBeTruthy(); });
  it('ngOnInit no-throw', () => { const c = new PatchConnectionSymbolComponent(); expect(() => c.ngOnInit()).not.toThrow(); });
  it('instances are independent', () => { expect(new PatchConnectionSymbolComponent()).not.toBe(new PatchConnectionSymbolComponent()); });
});
