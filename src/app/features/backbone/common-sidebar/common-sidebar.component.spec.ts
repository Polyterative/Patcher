import { CommonSidebarComponent } from './common-sidebar.component';
describe('CommonSidebarComponent', () => {
  it('creates', () => { expect(new CommonSidebarComponent()).toBeTruthy(); });
  it('ngOnInit no-throw', () => { const c = new CommonSidebarComponent(); expect(() => c.ngOnInit()).not.toThrow(); });
  it('instances are independent', () => { expect(new CommonSidebarComponent()).not.toBe(new CommonSidebarComponent()); });
});
