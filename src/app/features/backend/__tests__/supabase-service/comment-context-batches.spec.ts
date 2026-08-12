import type { PostgrestError } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { SupabaseService } from '../../supabase.service';
import {
  cleanupSupabaseServiceTest,
  setupSupabaseServiceTest,
  TEST_TIMEOUT
} from './test-setup';
import {
  chainable,
  getSupabaseClientDouble,
  type QueryListRowsResult
} from './supabase-query-test-doubles';

interface ModuleContextRow {
  id: number;
  name: string;
  manufacturer: { name: string };
}

interface EntityContextRow {
  id: number;
  name: string;
  public_id: string | null;
}

/**
 * Coverage for the batched comment-context lookups (getModuleCommentContexts,
 * getPatchCommentContexts, getRackCommentContexts). These back the N+1 fix in
 * CommentContextDataService — a comments page previously issued one context
 * request per visible row; these methods let it issue one request per entity
 * type instead, via `.in('id', ids)`.
 */
describe('SupabaseService - batched comment context lookups', () => {
  let service: SupabaseService;

  beforeEach(() => {
    const setup = setupSupabaseServiceTest();
    service = setup.service;
  });

  afterEach(() => {
    cleanupSupabaseServiceTest();
  });

  describe('GET.moduleCommentContexts', () => {
    it('returns an empty array without querying when given no ids', async () => {
      const supabaseClient = getSupabaseClientDouble(service);
      const fromSpy = spyOn(supabaseClient, 'from');

      const result = await firstValueFrom(service.GET.moduleCommentContexts([]));

      expect(result).toEqual([]);
      expect(fromSpy).not.toHaveBeenCalled();
    });

    it('queries with .in(id, uniqueIds) and returns the row array', async () => {
      const rows: ModuleContextRow[] = [
        { id: 1, name: 'Module One', manufacturer: { name: 'MFR A' } },
        { id: 5, name: 'Module Five', manufacturer: { name: 'MFR B' } }
      ];
      const supabaseClient = getSupabaseClientDouble(service);
      const query = chainable<ModuleContextRow>({
        data: rows,
        error: null
      } satisfies QueryListRowsResult<ModuleContextRow>);
      const inSpy = spyOn(query, 'in').and.callThrough();
      spyOn(supabaseClient, 'from').and.returnValue(query);

      const result = await firstValueFrom(service.GET.moduleCommentContexts([1, 5, 1]));

      expect(inSpy).toHaveBeenCalledWith('id', [1, 5]);
      expect(result).toEqual(rows);
    }, TEST_TIMEOUT);

    it('propagates a real Supabase error instead of silently returning an empty array', async () => {
      const dbError: PostgrestError = {
        code: 'PGRST003',
        details: null,
        hint: null,
        message: 'Service temporarily unavailable',
        name: 'PostgrestError'
      };
      const supabaseClient = getSupabaseClientDouble(service);
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<ModuleContextRow>({ data: null, error: dbError } as unknown as QueryListRowsResult<ModuleContextRow>)
      );

      await expectAsync(firstValueFrom(service.GET.moduleCommentContexts([1]))).toBeRejectedWith(dbError);
    }, TEST_TIMEOUT);
  });

  describe('GET.patchCommentContexts', () => {
    it('returns an empty array without querying when given no ids', async () => {
      const supabaseClient = getSupabaseClientDouble(service);
      const fromSpy = spyOn(supabaseClient, 'from');

      const result = await firstValueFrom(service.GET.patchCommentContexts([]));

      expect(result).toEqual([]);
      expect(fromSpy).not.toHaveBeenCalled();
    });

    it('queries with .in(id, uniqueIds) and returns the row array', async () => {
      const rows: EntityContextRow[] = [{ id: 3, name: 'Test Patch', public_id: null }];
      const supabaseClient = getSupabaseClientDouble(service);
      const query = chainable<EntityContextRow>({
        data: rows,
        error: null
      } satisfies QueryListRowsResult<EntityContextRow>);
      const inSpy = spyOn(query, 'in').and.callThrough();
      spyOn(supabaseClient, 'from').and.returnValue(query);

      const result = await firstValueFrom(service.GET.patchCommentContexts([3]));

      expect(inSpy).toHaveBeenCalledWith('id', [3]);
      expect(result).toEqual(rows);
    }, TEST_TIMEOUT);

    it('propagates a real Supabase error instead of silently returning an empty array', async () => {
      const dbError: PostgrestError = {
        code: 'PGRST003',
        details: null,
        hint: null,
        message: 'Service temporarily unavailable',
        name: 'PostgrestError'
      };
      const supabaseClient = getSupabaseClientDouble(service);
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<EntityContextRow>({ data: null, error: dbError } as unknown as QueryListRowsResult<EntityContextRow>)
      );

      await expectAsync(firstValueFrom(service.GET.patchCommentContexts([3]))).toBeRejectedWith(dbError);
    }, TEST_TIMEOUT);
  });

  describe('GET.rackCommentContexts', () => {
    it('returns an empty array without querying when given no ids', async () => {
      const supabaseClient = getSupabaseClientDouble(service);
      const fromSpy = spyOn(supabaseClient, 'from');

      const result = await firstValueFrom(service.GET.rackCommentContexts([]));

      expect(result).toEqual([]);
      expect(fromSpy).not.toHaveBeenCalled();
    });

    it('queries with .in(id, uniqueIds) and returns the row array', async () => {
      const rows: EntityContextRow[] = [{ id: 2, name: 'Test Rack', public_id: null }];
      const supabaseClient = getSupabaseClientDouble(service);
      const query = chainable<EntityContextRow>({
        data: rows,
        error: null
      } satisfies QueryListRowsResult<EntityContextRow>);
      const inSpy = spyOn(query, 'in').and.callThrough();
      spyOn(supabaseClient, 'from').and.returnValue(query);

      const result = await firstValueFrom(service.GET.rackCommentContexts([2]));

      expect(inSpy).toHaveBeenCalledWith('id', [2]);
      expect(result).toEqual(rows);
    }, TEST_TIMEOUT);

    it('propagates a real Supabase error instead of silently returning an empty array', async () => {
      const dbError: PostgrestError = {
        code: 'PGRST003',
        details: null,
        hint: null,
        message: 'Service temporarily unavailable',
        name: 'PostgrestError'
      };
      const supabaseClient = getSupabaseClientDouble(service);
      spyOn(supabaseClient, 'from').and.returnValue(
        chainable<EntityContextRow>({ data: null, error: dbError } as unknown as QueryListRowsResult<EntityContextRow>)
      );

      await expectAsync(firstValueFrom(service.GET.rackCommentContexts([2]))).toBeRejectedWith(dbError);
    }, TEST_TIMEOUT);
  });
});
