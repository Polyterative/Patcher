import { ManufacturerUpdatedBadgeComponent } from './manufacturer-updated-badge.component';


describe('ManufacturerUpdatedBadgeComponent', () => {
  let component: ManufacturerUpdatedBadgeComponent;
  const NOW_MS = Date.UTC(2026, 2, 2, 12, 0, 0, 0);
  
  beforeEach(() => {
    component = new ManufacturerUpdatedBadgeComponent();
    spyOn(Date, 'now').and.returnValue(NOW_MS);
  });
  
  it('should use a hot non-black color for very recent updates', () => {
    component.updatedAt = '2026-03-02T09:00:00.000Z';
    expect(component.updatedColor).not.toBe('#111111');
    expect(component.updatedColor.startsWith('hsl(')).toBeTrue();
  });
  
  it('should use black for updates older than one week', () => {
    component.updatedAt = '2026-02-20T09:00:00.000Z';
    expect(component.updatedColor).toBe('#111111');
  });
  
  it('returns DEFAULT_COLOR when updatedAt is null', () => {
    expect(component.resolveUpdatedColor(null, NOW_MS)).toBe('rgba(36, 49, 63, 0.84)');
  });
  
  it('returns DEFAULT_COLOR for invalid date string', () => {
    expect(component.resolveUpdatedColor('not-a-date', NOW_MS)).toBe('rgba(36, 49, 63, 0.84)');
  });
  
  it('returns STALE_COLOR for age of exactly 7 days', () => {
    const sevenDaysAgo = new Date(NOW_MS - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(component.resolveUpdatedColor(sevenDaysAgo, NOW_MS)).toBe('#111111');
  });
  
  it('returns hsl string for age just under 7 days', () => {
    const almostWeek = new Date(NOW_MS - 6 * 24 * 60 * 60 * 1000).toISOString();
    expect(component.resolveUpdatedColor(almostWeek, NOW_MS).startsWith('hsl(')).toBeTrue();
  });
  
  it('updatedAt setter updates color to DEFAULT_COLOR when null', () => {
    component.updatedAt = null;
    expect(component.updatedColor).toBe('rgba(36, 49, 63, 0.84)');
  });
  
  it('updatedAt setter handles undefined input', () => {
    component.updatedAt = undefined as any;
    expect(component.updatedColor).toBe('rgba(36, 49, 63, 0.84)');
  });
  
  it('updatedAt getter returns last set value', () => {
    component.updatedAt = '2026-03-01T00:00:00.000Z';
    expect(component.updatedAt).toBe('2026-03-01T00:00:00.000Z');
  });
  
  it('hsl lightness is higher for fresher updates', () => {
    const fresh = new Date(NOW_MS - 1 * 60 * 60 * 1000).toISOString();
    const old = new Date(NOW_MS - 3 * 24 * 60 * 60 * 1000).toISOString();
    const freshL = parseInt(component.resolveUpdatedColor(fresh, NOW_MS).match(/(\d+)%\)/)?.[1] ?? '0', 10);
    const oldL = parseInt(component.resolveUpdatedColor(old, NOW_MS).match(/(\d+)%\)/)?.[1] ?? '0', 10);
    expect(freshL).toBeGreaterThanOrEqual(oldL);
  });
});