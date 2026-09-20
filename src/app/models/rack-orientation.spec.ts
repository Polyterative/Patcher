import {
  DEFAULT_RACK_MODULE_ORIENTATION,
  nextRackModuleOrientation,
  normalizeRackModuleOrientation,
  RACK_MODULE_ORIENTATION_DB_VALUES,
  RACK_MODULE_ORIENTATIONS
} from 'src/app/models/rack';


describe('rack module orientation storage compat (GitHub #145 Phase 1)', () => {
  it('exposes the smallint database values alongside semantic names', () => {
    expect(RACK_MODULE_ORIENTATION_DB_VALUES.normal).toBe(0);
    expect(RACK_MODULE_ORIENTATION_DB_VALUES.rot180).toBe(1);
    expect(DEFAULT_RACK_MODULE_ORIENTATION).toBe(RACK_MODULE_ORIENTATIONS.normal);
  });

  it('normalizes legacy text values', () => {
    expect(normalizeRackModuleOrientation('normal')).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(normalizeRackModuleOrientation('rot180')).toBe(RACK_MODULE_ORIENTATIONS.rot180);
  });

  it('normalizes post-migration numeric values', () => {
    expect(normalizeRackModuleOrientation(0)).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(normalizeRackModuleOrientation(1)).toBe(RACK_MODULE_ORIENTATIONS.rot180);
  });

  it('falls back to normal for null, undefined, malformed, and reserved values', () => {
    expect(normalizeRackModuleOrientation(null)).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(normalizeRackModuleOrientation(undefined)).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(normalizeRackModuleOrientation('')).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(normalizeRackModuleOrientation('upside-down')).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(normalizeRackModuleOrientation(2)).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(normalizeRackModuleOrientation(-1)).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(normalizeRackModuleOrientation({})).toBe(RACK_MODULE_ORIENTATIONS.normal);
  });

  it('flips text and numeric inputs symmetrically', () => {
    expect(nextRackModuleOrientation('normal')).toBe(RACK_MODULE_ORIENTATIONS.rot180);
    expect(nextRackModuleOrientation('rot180')).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(nextRackModuleOrientation(0)).toBe(RACK_MODULE_ORIENTATIONS.rot180);
    expect(nextRackModuleOrientation(1)).toBe(RACK_MODULE_ORIENTATIONS.normal);
    expect(nextRackModuleOrientation(null)).toBe(RACK_MODULE_ORIENTATIONS.rot180);
  });
});
