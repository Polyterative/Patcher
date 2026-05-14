import { BuildInfoComponent } from './build-info.component';
describe('BuildInfoComponent', () => {
  it('creates', () => { expect(new BuildInfoComponent()).toBeTruthy(); });
  it('ngOnInit no-throw', () => { const c = new BuildInfoComponent(); expect(() => c.ngOnInit()).not.toThrow(); });
});
