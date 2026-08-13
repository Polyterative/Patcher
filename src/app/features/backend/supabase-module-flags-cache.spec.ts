import { firstValueFrom, of } from 'rxjs';
import { DbPaths } from './DatabaseStrings';
import { createAddNamespace } from './supabase-add';
import { createDeleteNamespace } from './supabase-delete';
import { createUpdateNamespace } from './supabase-update';
import { cacheBuster$ } from './supabase.cache';
import type { SimpleUserModel } from './supabase.types';

type QueryCall = {method: string; args: unknown[]};

type ChainableBuilder = PromiseLike<unknown> & {
  calls: QueryCall[];
  select: (...args: unknown[]) => ChainableBuilder;
  filter: (...args: unknown[]) => ChainableBuilder;
  eq: (...args: unknown[]) => ChainableBuilder;
  insert: (...args: unknown[]) => ChainableBuilder;
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
  builder.eq = addCall('eq');
  builder.insert = addCall('insert');
  builder.update = addCall('update');
  builder.delete = addCall('delete');
  builder.then = (resolve, reject) => Promise.resolve(resolveValue).then(resolve, reject);

  return builder;
}

const currentUser = {id: 'user-1'} as SimpleUserModel;

describe('module-flag cache busting', () => {
  it('add.moduleFlag busts the module_flags cache key on success', async () => {
    const builder = chainable({data: null, error: null});
    const fromSpy = jasmine.createSpy('from').and.returnValue(builder);
    const add = createAddNamespace(
      {from: fromSpy} as never,
      {} as never,
      () => of(currentUser)
    );
    const cacheEmissions: string[][] = [];
    const sub = cacheBuster$.subscribe(keys => cacheEmissions.push(keys as string[]));

    await firstValueFrom(add.moduleFlag({module_id: 42, category: 'incorrect_info'}));
    sub.unsubscribe();

    expect(fromSpy).toHaveBeenCalledWith(DbPaths.module_flags);
    expect(cacheEmissions.some(keys => keys.includes('module_flags'))).toBeTrue();
  });

  it('update.moduleFlagResolved busts the module_flags cache key on success', async () => {
    const builder = chainable({data: null, error: null});
    const fromSpy = jasmine.createSpy('from').and.returnValue(builder);
    const update = createUpdateNamespace(
      {from: fromSpy} as never,
      jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']) as never,
      () => of(currentUser),
      () => of(null),
      () => of(false)
    );
    const cacheEmissions: string[][] = [];
    const sub = cacheBuster$.subscribe(keys => cacheEmissions.push(keys as string[]));

    await firstValueFrom(update.moduleFlagResolved(7, true));
    sub.unsubscribe();

    expect(fromSpy).toHaveBeenCalledWith(DbPaths.module_flags);
    expect(cacheEmissions.some(keys => keys.includes('module_flags'))).toBeTrue();
  });

  it('delete.moduleFlag busts the module_flags cache key on success', async () => {
    const builder = chainable({data: null, error: null});
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

    await firstValueFrom(del.moduleFlag(7));
    sub.unsubscribe();

    expect(fromSpy).toHaveBeenCalledWith(DbPaths.module_flags);
    expect(cacheEmissions.some(keys => keys.includes('module_flags'))).toBeTrue();
  });

  it('does not bust module_flags when the backend call errors', async () => {
    const transientError = {
      code: 'PGRST003',
      details: null,
      hint: null,
      message: 'Service temporarily unavailable'
    };
    const addBuilder = chainable({data: null, error: transientError});
    const updateBuilder = chainable({data: null, error: transientError});
    const deleteBuilder = chainable({data: null, error: transientError});
    const addFromSpy = jasmine.createSpy('from').and.returnValue(addBuilder);
    const updateFromSpy = jasmine.createSpy('from').and.returnValue(updateBuilder);
    const deleteFromSpy = jasmine.createSpy('from').and.returnValue(deleteBuilder);

    const add = createAddNamespace(
      {from: addFromSpy} as never,
      {} as never,
      () => of(currentUser)
    );
    const update = createUpdateNamespace(
      {from: updateFromSpy} as never,
      jasmine.createSpyObj('MatSnackBar', ['open', 'openFromComponent', 'dismiss']) as never,
      () => of(currentUser),
      () => of(null),
      () => of(false)
    );
    const del = createDeleteNamespace(
      {from: deleteFromSpy} as never,
      {} as never,
      () => of(currentUser),
      () => of(null),
      20
    );

    const cacheEmissions: string[][] = [];
    const sub = cacheBuster$.subscribe(keys => cacheEmissions.push(keys as string[]));

    await expectAsync(firstValueFrom(add.moduleFlag({module_id: 42, category: 'incorrect_info'}))).toBeRejected();
    await expectAsync(firstValueFrom(update.moduleFlagResolved(7, true))).toBeRejected();
    await expectAsync(firstValueFrom(del.moduleFlag(7))).toBeRejected();
    sub.unsubscribe();

    expect(cacheEmissions.some(keys => keys.includes('module_flags'))).toBeFalse();
  });
});
