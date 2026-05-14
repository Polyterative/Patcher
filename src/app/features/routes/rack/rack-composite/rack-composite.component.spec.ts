import { RackCompositeComponent } from './rack-composite.component';
describe('RackCompositeComponent', () => {
  it('creates', () => { expect(new RackCompositeComponent()).toBeTruthy(); });
  it('data input can be assigned', () => {
    const comp = new RackCompositeComponent();
    comp.data = {id: 1, name: 'My Rack'} as any;
    expect(comp.data.id).toBe(1);
  });
  it('data name is preserved after assignment', () => {
    const comp = new RackCompositeComponent();
    comp.data = {id: 5, name: 'Studio Rack'} as any;
    expect(comp.data.name).toBe('Studio Rack');
  });
});
