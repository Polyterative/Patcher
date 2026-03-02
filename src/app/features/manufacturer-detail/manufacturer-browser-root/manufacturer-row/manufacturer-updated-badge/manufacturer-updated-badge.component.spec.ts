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
});