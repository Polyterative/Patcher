import { isLinkedRackSchemaMissingError } from './linked-rack-rollout';

describe('linked-rack-rollout', () => {
  describe('isLinkedRackSchemaMissingError', () => {
    it('returns false for null', () => {
      expect(isLinkedRackSchemaMissingError(null)).toBe(false);
    });

    it('returns false for wrong error code', () => {
      expect(isLinkedRackSchemaMissingError({ code: 'PGRST100', message: 'linked_rack_id patches' })).toBe(false);
    });

    it('returns false when message lacks linked_rack_id', () => {
      expect(isLinkedRackSchemaMissingError({ code: 'PGRST204', message: 'patches', details: '' })).toBe(false);
    });

    it('returns false when message lacks patches', () => {
      expect(isLinkedRackSchemaMissingError({ code: 'PGRST204', message: 'linked_rack_id only' })).toBe(false);
    });

    it('returns true for matching PGRST204 with linked_rack_id and patches', () => {
      expect(isLinkedRackSchemaMissingError({
        code: 'PGRST204',
        message: 'Column linked_rack_id',
        details: 'patches table'
      })).toBe(true);
    });

    it('returns true when keywords are split across message/details/hint', () => {
      expect(isLinkedRackSchemaMissingError({
        code: 'PGRST204',
        message: 'linked_rack_id not found',
        hint: 'in patches'
      })).toBe(true);
    });
  });
});
