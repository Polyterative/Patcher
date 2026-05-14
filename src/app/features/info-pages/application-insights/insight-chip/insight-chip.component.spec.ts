import { InsightChipComponent } from './insight-chip.component';

describe('InsightChipComponent', () => {
  let comp: InsightChipComponent;

  beforeEach(() => { comp = new InsightChipComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('icon defaults to empty string', () => {
    expect(comp.icon).toBe('');
  });

  it('label defaults to empty string', () => {
    expect(comp.label).toBe('');
  });

  it('compact defaults to false', () => {
    expect(comp.compact).toBeFalse();
  });

  it('featured defaults to false', () => {
    expect(comp.featured).toBeFalse();
  });
});
