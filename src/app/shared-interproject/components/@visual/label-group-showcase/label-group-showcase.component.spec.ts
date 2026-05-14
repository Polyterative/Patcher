import { LabelGroupShowcaseComponent } from './label-group-showcase.component';

describe('LabelGroupShowcaseComponent', () => {
  let comp: LabelGroupShowcaseComponent;

  beforeEach(() => { comp = new LabelGroupShowcaseComponent(); });

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
});
