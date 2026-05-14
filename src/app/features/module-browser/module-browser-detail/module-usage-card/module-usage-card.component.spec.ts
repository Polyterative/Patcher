import { ModuleUsageCardComponent } from './module-usage-card.component';

describe('ModuleUsageCardComponent', () => {
  let comp: ModuleUsageCardComponent;

  beforeEach(() => {
    comp = new ModuleUsageCardComponent();
  });

  it('creates without error', () => {
    expect(comp).toBeTruthy();
  });

  it('title defaults to empty string', () => {
    expect(comp.title).toBe('');
  });

  it('entityType defaults to "rack"', () => {
    expect(comp.entityType).toBe('rack');
  });

  it('items defaults to null', () => {
    expect(comp.items).toBeNull();
  });

  it('showHiddenUsageNote defaults to false', () => {
    expect(comp.showHiddenUsageNote).toBeFalse();
  });

  it('isUsageSummaryLoaded defaults to false', () => {
    expect(comp.isUsageSummaryLoaded).toBeFalse();
  });

  it('animationDelay defaults to 0', () => {
    expect(comp.animationDelay).toBe(0);
  });

  it('accepts entityType "patch"', () => {
    comp.entityType = 'patch';
    expect(comp.entityType).toBe('patch');
  });
});
