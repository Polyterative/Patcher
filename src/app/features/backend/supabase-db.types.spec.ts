import {
  responseData,
  responseCount,
  responseList,
  type SupabaseFunctionArgs,
  type SupabaseFunctionReturns,
  type SupabaseTableInsert,
  type SupabaseTableRow,
  type SupabaseTableUpdate
} from './supabase-db.types';


describe('supabase-db typed helpers', () => {
  it('exposes generated table row, insert, and update shapes', () => {
    const rackRow: SupabaseTableRow<'racks'> = {
      id: 1,
      authorid: 'user-1',
      created: '2026-06-14T00:00:00Z',
      updated: '2026-06-14T00:00:00Z',
      name: 'Typed Rack',
      description: null,
      hp: 104,
      rows: 2,
      locked: false,
      public: true,
      image: null,
      public_id: 'rack_public'
    };
    const rackInsert: SupabaseTableInsert<'racks'> = {
      authorid: rackRow.authorid,
      name: rackRow.name
    };
    const rackUpdate: SupabaseTableUpdate<'racks'> = {
      name: 'Updated Rack'
    };

    expect(rackInsert.authorid).toBe('user-1');
    expect(rackUpdate.name).toBe('Updated Rack');
  });

  it('exposes generated RPC args and return shapes', () => {
    const args: SupabaseFunctionArgs<'get_module_usage_summary_bucketed'> = {
      p_module_id: 1
    };
    const returns: SupabaseFunctionReturns<'get_module_usage_summary_bucketed'> = [{
      public_rack_count: 2,
      hidden_rack_bucket: 'some',
      public_patch_count: 3,
      hidden_patch_bucket: 'none'
    }];

    expect(args.p_module_id).toBe(1);
    expect(returns[0].public_patch_count).toBe(3);
  });

  it('normalizes nullable response data without changing rows', () => {
    const row = {id: 1, name: 'Mutable'};

    expect(responseData({data: row})).toBe(row);
    expect(responseData<{id: number}>({data: null})).toBeNull();
    expect(responseList({data: [row]})).toEqual([row]);
    expect(responseList<{id: number}>({data: null})).toEqual([]);
    expect(responseCount({count: 7})).toBe(7);
    expect(responseCount({count: null})).toBeNull();
  });
});
