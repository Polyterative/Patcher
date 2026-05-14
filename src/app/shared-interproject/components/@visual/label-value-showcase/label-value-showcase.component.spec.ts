import { LabelValueShowcaseComponent } from './label-value-showcase.component';

describe('LabelValueShowcaseComponent', () => {
  let comp: LabelValueShowcaseComponent;

  beforeEach(() => {
    comp = new LabelValueShowcaseComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('bigText defaults to true', () => {
    expect(comp.bigText).toBeTrue();
  });

  it('pushToEnd defaults to false', () => {
    expect(comp.pushToEnd).toBeFalse();
  });

  it('valueBelow defaults to true', () => {
    expect(comp.valueBelow).toBeTrue();
  });

  it('monospace defaults to false', () => {
    expect(comp.monospace).toBeFalse();
  });

  it('icon defaults to undefined', () => {
    expect(comp.icon).toBeUndefined();
  });
});
