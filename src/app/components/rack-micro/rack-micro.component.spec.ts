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
});
