import { IconTogglerBooleanComponent } from './icon-toggler-boolean.component';

describe('IconTogglerBooleanComponent', () => {
  let comp: IconTogglerBooleanComponent;

  beforeEach(() => { comp = new IconTogglerBooleanComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('disabled defaults to false', () => {
    expect(comp.disabled).toBeFalse();
  });

  it('icon defaults to undefined', () => {
    expect(comp.icon).toBeUndefined();
  });

  it('iconOff defaults to undefined', () => {
    expect(comp.iconOff).toBeUndefined();
  });

  it('ngOnInit runs without error', () => {
    expect(() => comp.ngOnInit()).not.toThrow();
  });
});
