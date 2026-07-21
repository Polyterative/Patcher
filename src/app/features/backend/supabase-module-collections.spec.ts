import { SupabaseClient } from '@supabase/supabase-js';
import { firstValueFrom } from 'rxjs';
import { Database } from 'src/backend/database.types';
import {
  buildModuleCollectionEntries,
  validatePublicModuleCollectionModuleIds
} from './supabase-module-collections';
import { DbPaths } from './DatabaseStrings';

type ModuleRow = Pick<Database['public']['Tables']['modules']['Row'], 'id' | 'public'>;
type ModuleRowsResponse = {data: ModuleRow[]; error: null};
type ModuleIdFilter = {
  in: jasmine.Spy<(column: 'id', values: number[]) => Promise<ModuleRowsResponse>>;
};
type ModuleSelectQuery = {
  select: jasmine.Spy<(columns: 'id,public') => ModuleIdFilter>;
};
type ModuleCollectionValidationClient = SupabaseClient<Database> & {
  from: jasmine.Spy<(table: typeof DbPaths.modules) => ModuleSelectQuery>;
};

function buildSupabaseWithModuleRows(rows: ModuleRow[]) {
  const response: ModuleRowsResponse = {data: rows, error: null};
  const inSpy = jasmine.createSpy<(column: 'id', values: number[]) => Promise<ModuleRowsResponse>>('in')
    .and.resolveTo(response);
  const selectSpy = jasmine.createSpy<(columns: 'id,public') => ModuleIdFilter>('select')
    .and.returnValue({in: inSpy});
  const fromSpy = jasmine.createSpy<(table: typeof DbPaths.modules) => ModuleSelectQuery>('from')
    .and.returnValue({select: selectSpy});
  const supabase = {from: fromSpy} as ModuleCollectionValidationClient;

  return {
    supabase,
    fromSpy,
    selectSpy,
    inSpy
  };
}

describe('module collection backend helpers', () => {
  it('builds ordered entry inserts from selected module IDs', () => {
    expect(buildModuleCollectionEntries(12, [9, 4])).toEqual([
      {collection_id: 12, module_id: 9, ordinal: 0},
      {collection_id: 12, module_id: 4, ordinal: 1}
    ]);
  });

  it('skips validation queries when no modules are selected', async () => {
    const {supabase, fromSpy} = buildSupabaseWithModuleRows([]);

    await expectAsync(firstValueFrom(validatePublicModuleCollectionModuleIds(supabase, [])))
      .toBeResolvedTo([]);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('allows only selected modules that exist and are public', async () => {
    const {supabase, fromSpy, selectSpy, inSpy} = buildSupabaseWithModuleRows([
      {id: 2, public: true},
      {id: 3, public: true}
    ]);

    await expectAsync(firstValueFrom(validatePublicModuleCollectionModuleIds(supabase, [2, 3, 2])))
      .toBeResolvedTo([2, 3, 2]);
    expect(fromSpy).toHaveBeenCalledWith(DbPaths.modules);
    expect(selectSpy).toHaveBeenCalledWith('id,public');
    expect(inSpy).toHaveBeenCalledWith('id', [2, 3]);
  });

  it('rejects missing or non-public selected modules before collection mutation', async () => {
    const {supabase} = buildSupabaseWithModuleRows([
      {id: 2, public: true},
      {id: 3, public: false}
    ]);

    await expectAsync(firstValueFrom(validatePublicModuleCollectionModuleIds(supabase, [2, 3, 4])))
      .toBeRejectedWithError('Collections can only contain public modules.');
  });
});
