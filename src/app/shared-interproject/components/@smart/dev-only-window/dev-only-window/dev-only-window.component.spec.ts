import { DevOnlyWindowComponent } from './dev-only-window.component';

describe('DevOnlyWindowComponent', () => {
  let comp: DevOnlyWindowComponent;

  beforeEach(() => {
    comp = new DevOnlyWindowComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('pre defaults to false', () => {
    expect(comp.pre).toBeFalse();
  });

  it('show is a boolean', () => {
    expect(typeof comp.show).toBe('boolean');
  });

});
