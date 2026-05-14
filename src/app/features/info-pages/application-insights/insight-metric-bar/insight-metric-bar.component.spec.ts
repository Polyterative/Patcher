import { InsightMetricBarComponent } from './insight-metric-bar.component';

describe('InsightMetricBarComponent', () => {
  let comp: InsightMetricBarComponent;

  beforeEach(() => { comp = new InsightMetricBarComponent(); });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('label defaults to empty string', () => {
    expect(comp.label).toBe('');
  });

  it('valueLabel defaults to empty string', () => {
    expect(comp.valueLabel).toBe('');
  });

  it('widthPercent defaults to 0', () => {
    expect(comp.widthPercent).toBe(0);
  });

  it('tone defaults to "brand"', () => {
    expect(comp.tone).toBe('brand');
  });
});
