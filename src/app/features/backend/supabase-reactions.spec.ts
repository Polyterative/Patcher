import { firstValueFrom, of } from 'rxjs';
import { DbPaths } from './DatabaseStrings';
import { createAddNamespace } from './supabase-add';
import { createDeleteNamespace } from './supabase-delete';
import { createUpdateNamespace } from './supabase-update';
import { SupabaseQueriesService } from './supabase-queries';
import {
  REACTION_COUNT_COLUMNS,
  REACTION_KIND_COOL,
  REACTION_ROW_COLUMNS,
  ReactionEntityTypes
} from './supabase-reactions';
import { cacheBuster$ } from './supabase.cache';
import type { SimpleUserModel } from './supabase.types';

type QueryCall = {method: string; args: unknown[]};

type ChainableBuilder = PromiseLike<unknown> & {
  calls: QueryCall[];
  select: (...args: unknown[]) => ChainableBuilder;
  filter: (...args: unknown[]) => ChainableBuilder;
  in: (...args: unknown[]) => ChainableBuilder;
  order: (...args: unknown[]) => ChainableBuilder;
  maybeSingle: (...args: unknown[]) => ChainableBuilder;
  eq: (...args: unknown[]) => ChainableBuilder;
  upsert: (...args: unknown[]) => ChainableBuilder;
  update: (...args: unknown[]) => ChainableBuilder;
  delete: (...args: unknown[]) => ChainableBuilder;
};

function chainable(resolveValue: unknown = {data: null, error: null}): ChainableBuilder {
  const calls: QueryCall[] = [];
  const partial: Partial<ChainableBuilder> = {calls};
  const builder = partial as ChainableBuilder;
  const addCall = (method: string) => (...args: unknown[]) => {
    calls.push({method, args});
    return builder;
  };

  builder.select = addCall('select');
  builder.filter = addCall('filter');
  builder.in = addCall('in');
  builder.order = addCall('order');
  builder.maybeSingle = addCall('maybeSingle');
  builder.eq = addCall('eq');
  builder.upsert = addCall('upsert');
  builder.update = addCall('update');
  builder.delete = addCall('delete');
  builder.then = (resolve, reject) => Promise.resolve(resolveValue).then(resolve, reject);

  return builder;
}

const currentUser = {id: 'user-1'} as SimpleUserModel;

describe('cool reaction backend API', () => {
  it('adds a reaction with explicit columns and busts reaction caches', async () => {
    const builder = chainable({data: null, error: null});
    const fromSpy = jasmine.createSpy('from').and.returnValue(builder);
    const add = createAddNamespace(
      {from: fromSpy} as never,
      {} as never,
      () => of(currentUser)
    );
    const cacheEmissions: string[][] = [];
    const sub = cacheBuster$.subscribe(keys => cacheEmissions.push(keys as string[]));

    await firstValueFrom(add.reaction(ReactionEntityTypes.MODULE, 42));
    sub.unsubscribe();

    expect(fromSpy).toHaveBeenCalledWith(DbPaths.reactions);
    expect(builder.calls).toContain(jasmine.objectContaining({
      method: 'upsert',
      args: [
        {
          user_id: 'user-1',
          entity_type: ReactionEntityTypes.MODULE,
          entity_id: 42,
          kind: REACTION_KIND_COOL
        },
        {
          onConflict: 'user_id,entity_type,entity_id,kind',
          ignoreDuplicates: true
        }
      ]
    }));
    expect(builder.calls).toContain(jasmine.objectContaining({
      method: 'select',
      args: [REACTION_ROW_COLUMNS]
    }));
    expect(cacheEmissions[0]).toEqual(['currentUserReactions', 'reactionCounts', 'reactionDiscovery']);
  });

  it('deletes only the current user reaction and busts reaction caches', async () => {
    const builder = chainable({data: [], error: null});
    const fromSpy = jasmine.createSpy('from').and.returnValue(builder);
    const del = createDeleteNamespace(
      {from: fromSpy} as never,
      {} as never,
      () => of(currentUser),
      () => of(null),
      20
    );
    const cacheEmissions: string[][] = [];
    const sub = cacheBuster$.subscribe(keys => cacheEmissions.push(keys as string[]));

    await firstValueFrom(del.reaction(ReactionEntityTypes.RACK, 7));
    sub.unsubscribe();

    expect(fromSpy).toHaveBeenCalledWith(DbPaths.reactions);
    expect(builder.calls.map(call => call.method)).toContain('delete');
    expect(builder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['user_id', 'eq', 'user-1']}));
    expect(builder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['entity_type', 'eq', ReactionEntityTypes.RACK]}));
    expect(builder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['entity_id', 'eq', 7]}));
    expect(builder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['kind', 'eq', REACTION_KIND_COOL]}));
    expect(builder.calls).toContain(jasmine.objectContaining({method: 'select', args: [REACTION_ROW_COLUMNS]}));
    expect(cacheEmissions[0]).toEqual(['currentUserReactions', 'reactionCounts', 'reactionDiscovery']);
  });

  it('busts reaction counts when module or rack eligibility can change', async () => {
    const moduleBuilder = chainable({data: {id: 42, updated: 'now', created: 'then'}, error: null});
    const rackBuilder = chainable({data: {id: 7}, error: null});
    const deleteRackBuilder = chainable({data: null, error: null});
    const fromSpy = jasmine.createSpy('from').and.returnValues(moduleBuilder, rackBuilder, deleteRackBuilder);
    const update = createUpdateNamespace(
      {from: fromSpy} as never,
      jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']) as never,
      () => of(currentUser),
      () => of(null),
      () => of(false)
    );
    const del = createDeleteNamespace(
      {from: fromSpy} as never,
      {} as never,
      () => of(currentUser),
      () => of(null),
      20
    );
    const cacheEmissions: string[][] = [];
    const sub = cacheBuster$.subscribe(keys => cacheEmissions.push(keys as string[]));

    await firstValueFrom(update.module({id: 42, name: 'Public Module', public: false} as never));
    await firstValueFrom(update.rack({id: 7, name: 'Rack', description: '', rows: 1, hp: 84, locked: false, public: false} as never));
    await firstValueFrom(del.userRack(7));
    sub.unsubscribe();

    expect(cacheEmissions.every(keys => keys.includes('reactionCounts'))).toBeTrue();
  });

  it('reads current user reactions with explicit columns and optional entity filtering', async () => {
    const builder = chainable({data: [{user_id: 'user-1', entity_type: 1, entity_id: 42, kind: 'COOL', created_at: 'now'}], error: null});
    const fromSpy = jasmine.createSpy('from').and.returnValue(builder);
    const queries = new SupabaseQueriesService(
      {from: fromSpy} as never,
      () => of(currentUser),
      20
    );

    const rows = await firstValueFrom(queries.getCurrentUserReactions(ReactionEntityTypes.MODULE));

    expect(rows.length).toBe(1);
    expect(fromSpy).toHaveBeenCalledWith(DbPaths.reactions);
    expect(builder.calls).toContain(jasmine.objectContaining({method: 'select', args: [REACTION_ROW_COLUMNS]}));
    expect(builder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['user_id', 'eq', 'user-1']}));
    expect(builder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['kind', 'eq', REACTION_KIND_COOL]}));
    expect(builder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['entity_type', 'eq', ReactionEntityTypes.MODULE]}));
  });

  it('falls back by default and throws in strict mode when Supabase returns an error response for current user reactions', async () => {
    const transientError = {
      code: 'PGRST003',
      details: null,
      hint: null,
      message: 'Service temporarily unavailable'
    };
    const builder = chainable({data: null, error: transientError});
    const fromSpy = jasmine.createSpy('from').and.returnValue(builder);
    const queries = new SupabaseQueriesService(
      {from: fromSpy} as never,
      () => of(currentUser),
      20
    );

    await expectAsync(firstValueFrom(
      queries.getCurrentUserReactions(ReactionEntityTypes.MODULE)
    )).toBeResolvedTo([]);

    await expectAsync(firstValueFrom(
      queries.getCurrentUserReactions(ReactionEntityTypes.MODULE, REACTION_KIND_COOL, true)
    )).toBeRejectedWith(transientError);
  });

  it('returns an empty array for successful empty current user reaction responses', async () => {
    const builder = chainable({data: [], error: null});
    const fromSpy = jasmine.createSpy('from').and.returnValue(builder);
    const queries = new SupabaseQueriesService(
      {from: fromSpy} as never,
      () => of(currentUser),
      20
    );

    await expectAsync(firstValueFrom(
      queries.getCurrentUserReactions(ReactionEntityTypes.PATCH)
    )).toBeResolvedTo([]);
  });

  it('returns no current user reactions without querying when signed out', async () => {
    const fromSpy = jasmine.createSpy('from');
    const queries = new SupabaseQueriesService(
      {from: fromSpy} as never,
      () => of(null),
      20
    );

    await expectAsync(firstValueFrom(queries.getCurrentUserReactions())).toBeResolvedTo([]);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('does not cache current user reactions across auth user changes', async () => {
    const firstBuilder = chainable({data: [{user_id: 'user-1', entity_type: 1, entity_id: 42, kind: 'COOL', created_at: 'now'}], error: null});
    const secondBuilder = chainable({data: [{user_id: 'user-2', entity_type: 1, entity_id: 43, kind: 'COOL', created_at: 'now'}], error: null});
    const fromSpy = jasmine.createSpy('from').and.returnValues(firstBuilder, secondBuilder);
    let activeUser = {id: 'user-1'} as SimpleUserModel;
    const queries = new SupabaseQueriesService(
      {from: fromSpy} as never,
      () => of(activeUser),
      20
    );

    await expectAsync(firstValueFrom(queries.getCurrentUserReactions())).toBeResolvedTo([
      {user_id: 'user-1', entity_type: 1, entity_id: 42, kind: 'COOL', created_at: 'now'}
    ]);
    activeUser = {id: 'user-2'} as SimpleUserModel;
    await expectAsync(firstValueFrom(queries.getCurrentUserReactions())).toBeResolvedTo([
      {user_id: 'user-2', entity_type: 1, entity_id: 43, kind: 'COOL', created_at: 'now'}
    ]);

    expect(fromSpy).toHaveBeenCalledTimes(2);
    expect(firstBuilder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['user_id', 'eq', 'user-1']}));
    expect(secondBuilder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['user_id', 'eq', 'user-2']}));
  });

  it('reads reaction counts individually and in batches with explicit columns', async () => {
    const countBuilder = chainable({data: {entity_type: 1, entity_id: 42, kind: 'COOL', total: 3, updated_at: 'now'}, error: null});
    const batchBuilder = chainable({data: [{entity_type: 1, entity_id: 42, kind: 'COOL', total: 3, updated_at: 'now'}], error: null});
    const fromSpy = jasmine.createSpy('from').and.returnValues(countBuilder, batchBuilder);
    const queries = new SupabaseQueriesService(
      {from: fromSpy} as never,
      () => of(currentUser),
      20
    );

    await expectAsync(firstValueFrom(queries.getReactionCount(ReactionEntityTypes.MODULE, 42))).toBeResolvedTo(3);
    await firstValueFrom(queries.getReactionCountsForEntities(ReactionEntityTypes.MODULE, [42, 42, 43]));

    expect(fromSpy).toHaveBeenCalledWith(DbPaths.reaction_counts);
    expect(countBuilder.calls).toContain(jasmine.objectContaining({method: 'select', args: [REACTION_COUNT_COLUMNS]}));
    expect(countBuilder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['entity_type', 'eq', ReactionEntityTypes.MODULE]}));
    expect(countBuilder.calls).toContain(jasmine.objectContaining({method: 'filter', args: ['entity_id', 'eq', 42]}));
    expect(batchBuilder.calls).toContain(jasmine.objectContaining({method: 'in', args: ['entity_id', [42, 43]]}));
  });
});
