import {
  groupInstancesByModuleId,
  buildLinkedRackUiState,
  DEFAULT_LINKED_RACK_UI_STATE
} from './patch-detail-data.utils';
import { PatchModuleInstance } from '../../models/connection';
import { Patch } from '../../models/patch';
import { Rack } from '../../models/rack';

const makeInstance = (id: number, module_id: number): PatchModuleInstance => ({
  id, module_id
} as any);

const makePatch = (linked_rack_id: number | null = null): Patch => ({
  id: 1, name: 'P', linked_rack_id
} as any);

const makeRack = (id: number, name = 'Rack'): Rack => ({
  id, name, image: null
} as any);

describe('patch-detail-data.utils', () => {
  describe('groupInstancesByModuleId', () => {
    it('returns empty map for empty input', () => {
      expect(groupInstancesByModuleId([]).size).toBe(0);
    });

    it('groups by module_id', () => {
      const instances = [makeInstance(1, 10), makeInstance(2, 10), makeInstance(3, 20)];
      const result = groupInstancesByModuleId(instances);
      expect(result.get(10)?.length).toBe(2);
      expect(result.get(20)?.length).toBe(1);
    });
  });

  describe('buildLinkedRackUiState', () => {
    it('returns default state when patch is undefined', () => {
      expect(buildLinkedRackUiState(undefined, [])).toEqual(DEFAULT_LINKED_RACK_UI_STATE);
    });

    it('returns default when linked_rack_id is null', () => {
      expect(buildLinkedRackUiState(makePatch(null), [])).toEqual(DEFAULT_LINKED_RACK_UI_STATE);
    });

    it('returns unavailable when rack not found', () => {
      const state = buildLinkedRackUiState(makePatch(99), [], null, false, false);
      expect(state.kind).toBe('unavailable');
      expect(state.statusTone).toBe('warning');
    });

    it('returns unavailable with owner-specific description when patch owner', () => {
      const state = buildLinkedRackUiState(makePatch(99), [], null, true, true);
      expect(state.kind).toBe('unavailable');
      expect((state as any).description).toContain('another rack or clear');
    });

    it('returns unavailable with logged-in visitor description', () => {
      const state = buildLinkedRackUiState(makePatch(99), [], null, false, true);
      expect(state.kind).toBe('unavailable');
      expect((state as any).description).toContain('not publicly available');
    });
  });
});
