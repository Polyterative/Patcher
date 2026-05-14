import { AdminPanelRootComponent } from './admin-panel-root.component';
describe('AdminPanelRootComponent', () => {
  let mockBackend: any;
  beforeEach(() => { mockBackend = {}; });
  it('creates', () => { expect(new AdminPanelRootComponent(mockBackend)).toBeTruthy(); });
  it('exposes backend', () => {
    const comp = new AdminPanelRootComponent(mockBackend);
    expect(comp.backend).toBe(mockBackend);
  });
});
