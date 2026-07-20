import { MergeModuleResult } from '../../features/backend/supabase-merge';
import { formatMarketplaceMinorUnits } from '../../features/marketplace/marketplace-money.utils';
import { DbModule } from '../../models/module';
import { UserModuleAcquisition } from '../../models/user-module-acquisition';
import {
  formatDeleteModuleSuccessMessage,
  formatLatestAcquisitionValue,
  formatMergeResultMessage,
  getCurrentModulePossession,
  getMeaningfulAcquisitionDraft,
  getPossessionRequestKind,
  possessionKindLabel,
  shouldDeleteManufacturerWithModule
} from './module-detail-data.helpers';

describe('module detail data helpers', () => {
  it('maps the current module possession from the user module list', () => {
    const userModules = [
      {id: 10, possessionKind: 'WANTS'} as DbModule,
      {id: 11, possessionKind: 'HAS'} as DbModule
    ];

    expect(getCurrentModulePossession(userModules, {id: 10} as DbModule)).toBe('WANTS');
    expect(getCurrentModulePossession(userModules, {id: 12} as DbModule)).toBeNull();
    expect(getCurrentModulePossession(userModules, null)).toBeNull();
  });

  it('formats the latest acquisition value from the first row', () => {
    const rows: UserModuleAcquisition[] = [
      {
        id: 1,
        profileid: 'profile-1',
        moduleid: 10,
        acquired_at: '2026-07-01',
        price_amount_minor: 12345,
        currency: 'EUR',
        source: 'used',
        note: null,
        created_at: '2026-07-01T00:00:00.000Z',
        updated_at: '2026-07-01T00:00:00.000Z'
      }
    ];

    expect(formatLatestAcquisitionValue(rows)).toBe(formatMarketplaceMinorUnits(12345, 'EUR'));
    expect(formatLatestAcquisitionValue([{...rows[0], price_amount_minor: null, currency: null}]))
      .toBe('Acquired 2026-07-01');
    expect(formatLatestAcquisitionValue(undefined)).toBeNull();
  });

  it('normalizes possession requests and acquisition drafts', () => {
    expect(getPossessionRequestKind(null)).toBeNull();
    expect(getPossessionRequestKind('SELLS')).toBe('SELLS');
    expect(getPossessionRequestKind({kind: 'HAS'})).toBe('HAS');

    expect(getMeaningfulAcquisitionDraft('HAS')).toBeUndefined();
    expect(getMeaningfulAcquisitionDraft({kind: 'WANTS', acquisition: {note: 'ignored'}})).toBeUndefined();
    expect(getMeaningfulAcquisitionDraft({
      kind: 'HAS',
      acquisition: {
        acquired_at: '2026-07-01',
        note: '  from a friend  '
      }
    })).toEqual({
      acquired_at: '2026-07-01',
      note: 'from a friend'
    });
  });

  it('formats possession, delete, and merge messages', () => {
    const module = {
      id: 10,
      name: 'Main Module',
      manufacturerId: 7,
      manufacturer: {name: 'Maker'}
    } as DbModule;
    const mergeResult: MergeModuleResult = {
      sourceId: 10,
      targetId: 20,
      duplicateOwnershipRowsRemoved: 1,
      duplicateTagRowsRemoved: 2,
      ownershipRowsMoved: 3,
      tagRowsMoved: 4,
      rackModuleRowsMoved: 5
    };

    expect(possessionKindLabel('HAS')).toBe('owned');
    expect(possessionKindLabel('WANTS')).toBe('wanted');
    expect(possessionKindLabel('SELLS')).toBe('for sale');
    expect(formatDeleteModuleSuccessMessage(module, false)).toBe('"Main Module" deleted from the database.');
    expect(formatDeleteModuleSuccessMessage(module, true))
      .toBe('"Main Module" and orphan manufacturer "Maker" deleted from the database.');
    expect(formatMergeResultMessage(mergeResult))
      .toBe('Merged module 10 into 20: moved 3 ownership, 4 tag, 5 rack rows; removed 1 duplicate ownership and 2 duplicate tag rows.');
  });

  it('detects when deleting a module should also delete its orphan manufacturer', () => {
    expect(shouldDeleteManufacturerWithModule({id: 10, manufacturerId: 7}, [{id: 10}])).toBeTrue();
    expect(shouldDeleteManufacturerWithModule({id: 10, manufacturerId: 7}, [{id: 10}, {id: 11}])).toBeFalse();
    expect(shouldDeleteManufacturerWithModule({id: 10, manufacturerId: null}, [{id: 10}])).toBeFalse();
  });
});
