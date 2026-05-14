import { RackMicroComponent } from './rack-micro.component';

describe('RackMicroComponent', () => {
  let comp: RackMicroComponent;

  beforeEach(() => {
    comp = new RackMicroComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });

  it('data input can be assigned', () => {
    comp.data = {id: 5, name: 'Test Rack'} as any;
    expect(comp.data.id).toBe(5);
  });

  it('viewConfig input can be assigned', () => {
    comp.viewConfig = {showStats: true} as any;
    expect((comp.viewConfig as any).showStats).toBeTrue();
  });
});
