import { of } from 'rxjs';
import {
  createMergeNamespace,
  MergeModuleResult
} from '../../supabase-merge';

interface Operation {
  table: string;
  action: string;
  filters: Record<string, string | number>;
  inFilters: Record<string, (string | number)[]>;
  selectColumns?: string;
  updatePayload?: Record<string, number>;
}

interface SupabaseMockQuery extends PromiseLike<{ data: unknown[]; error: null }> {
  select(columns: string): SupabaseMockQuery;
  eq(column: string, value: string | number): SupabaseMockQuery;
  in(column: string, values: (string | number)[]): SupabaseMockQuery;
  limit(): SupabaseMockQuery;
  delete(): SupabaseMockQuery;
  update(payload: Record<string, number>): SupabaseMockQuery;
}

interface SupabaseMockClient {
  from(table: string): SupabaseMockQuery;
}

function buildSupabaseMock(options: {sourceHasPorts?: boolean; missingTarget?: boolean; rackConflict?: boolean} = {}) {
  const operations: Operation[] = [];
  const sourceId = 10;
  const targetId = 20;

  const rowsByTable = {
    modules: options.missingTarget
      ? [{id: sourceId, name: 'Source', manufacturerId: 1, hp: 8, standard: 0}]
      : [
        {id: sourceId, name: 'Source', manufacturerId: 1, hp: 8, standard: 0},
        {id: targetId, name: 'Target', manufacturerId: 1, hp: 8, standard: 0}
      ],
    module_ins: options.sourceHasPorts ? [{id: 1}] : [],
    module_outs: [],
    patch_module_instances: [],
    user_modules_source: [
      {profileid: 'profile-duplicate', kind: 'HAS'},
      {profileid: 'profile-move', kind: 'WANTS'}
    ],
    user_modules_target: [{profileid: 'profile-duplicate', kind: 'HAS'}],
    module_tags_source: [
      {id: 101, tagid: 5},
      {id: 102, tagid: 6}
    ],
    module_tags_target: [{id: 201, tagid: 5}],
    rack_modules_source: [{id: 301, rackid: 1, row: 0, column: 4}],
    rack_modules_target: options.rackConflict
      ? [{id: 401, rackid: 1, row: 0, column: 4}]
      : [{id: 401, rackid: 2, row: 0, column: 4}],
  };

  function responseFor(op: Operation) {
    if (op.table === 'modules') {
      return {data: rowsByTable.modules, error: null};
    }
    if (op.table === 'module_ins') return {data: rowsByTable.module_ins, error: null};
    if (op.table === 'module_outs') return {data: rowsByTable.module_outs, error: null};
    if (op.table === 'patch_module_instances') return {data: rowsByTable.patch_module_instances, error: null};

    if (op.table === 'user_modules' && op.action === 'select') {
      return {data: op.filters['moduleid'] === sourceId ? rowsByTable.user_modules_source : rowsByTable.user_modules_target, error: null};
    }
    if (op.table === 'module_tags' && op.action === 'select') {
      return {data: op.filters['moduleid'] === sourceId ? rowsByTable.module_tags_source : rowsByTable.module_tags_target, error: null};
    }
    if (op.table === 'rack_modules' && op.action === 'select') {
      return {data: op.filters['moduleid'] === sourceId ? rowsByTable.rack_modules_source : rowsByTable.rack_modules_target, error: null};
    }
    if (op.table === 'user_modules' && op.action === 'delete') {
      return {data: [{profileid: 'profile-duplicate'}], error: null};
    }
    if (op.table === 'module_tags' && op.action === 'delete') {
      return {data: [{id: 101}], error: null};
    }
    if (op.action === 'update') {
      const counts: Record<string, number> = {
        user_modules: 1,
        module_tags: 1,
        rack_modules: 2
      };
      return {data: Array.from({length: counts[op.table] ?? 0}, (_, id) => ({id})), error: null};
    }
    return {data: [], error: null};
  }

  const supabase = {
    from: (table: string) => {
      const op: Operation = {table, action: 'select', filters: {}, inFilters: {}};
      operations.push(op);
      const chain: SupabaseMockQuery = {
        select: (columns: string) => {
          op.selectColumns = columns;
          return chain;
        },
        eq: (column: string, value: string | number) => {
          op.filters[column] = value;
          return chain;
        },
        in: (column: string, values: (string | number)[]) => {
          op.inFilters[column] = values;
          return chain;
        },
        limit: () => chain,
        delete: () => {
          op.action = 'delete';
          return chain;
        },
        update: (payload: Record<string, number>) => {
          op.action = 'update';
          op.updatePayload = payload;
          return chain;
        },
        then: (resolve, reject) => Promise.resolve(responseFor(op)).then(resolve, reject)
      };
      return chain;
    }
  } satisfies SupabaseMockClient;

  return {supabase, operations};
}

describe('createMergeNamespace', () => {
  it('moves common duplicate-module references and deletes the source module', (done) => {
    const {supabase, operations} = buildSupabaseMock();
    const deleteModule = jasmine.createSpy('deleteModule').and.returnValue(of({deleted: true}));
    const namespace = createMergeNamespace(supabase as never, () => of({id: 'admin'} as never), deleteModule);

    namespace.moduleInto(10, 20).subscribe({
      next: (result: MergeModuleResult) => {
        expect(result).toEqual({
          sourceId: 10,
          targetId: 20,
          duplicateOwnershipRowsRemoved: 1,
          duplicateTagRowsRemoved: 1,
          ownershipRowsMoved: 1,
          tagRowsMoved: 1,
          rackModuleRowsMoved: 2
        });
        expect(deleteModule).toHaveBeenCalledWith(10);
        expect(operations.filter(op => op.action === 'update').map(op => op.table)).toEqual([
          'user_modules',
          'module_tags',
          'rack_modules'
        ]);
        expect(operations.find(op => op.table === 'modules')?.selectColumns).toBe('id,name,manufacturerId,hp,standard');
        done();
      },
      error: done.fail
    });
  });

  it('aborts before writes when source patch ports exist', (done) => {
    const {supabase, operations} = buildSupabaseMock({sourceHasPorts: true});
    const deleteModule = jasmine.createSpy('deleteModule').and.returnValue(of({deleted: true}));
    const namespace = createMergeNamespace(supabase as never, () => of({id: 'admin'} as never), deleteModule);

    namespace.moduleInto(10, 20).subscribe({
      next: () => done.fail('expected merge to abort'),
      error: error => {
        expect(error.message).toContain('Merge aborted before writes');
        expect(deleteModule).not.toHaveBeenCalled();
        expect(operations.some(op => op.action === 'delete' || op.action === 'update')).toBeFalse();
        done();
      }
    });
  });

  it('aborts before writes when target already occupies a source rack position', (done) => {
    const {supabase, operations} = buildSupabaseMock({rackConflict: true});
    const deleteModule = jasmine.createSpy('deleteModule').and.returnValue(of({deleted: true}));
    const namespace = createMergeNamespace(supabase as never, () => of({id: 'admin'} as never), deleteModule);

    namespace.moduleInto(10, 20).subscribe({
      next: () => done.fail('expected merge to abort'),
      error: error => {
        expect(error.message).toContain('rack placement');
        expect(deleteModule).not.toHaveBeenCalled();
        expect(operations.some(op => op.action === 'delete' || op.action === 'update')).toBeFalse();
        done();
      }
    });
  });
});
