import type { PostgrestError } from '@supabase/supabase-js';
import {
  of,
  type Observable
} from 'rxjs';
import type {
  SimpleUserModel,
  SupabaseService
} from '../../supabase.service';


type QueryFilterValue = boolean | number | string | null;
type PasswordUpdateAttributes = {
  password: string;
};

export interface PasswordResetProviderError {
  code?: string | number;
  error_code?: string;
  error_description?: string;
  message?: string;
  msg?: string;
  name?: string;
}

export interface PasswordUpdateResult {
  data: null;
  error: PasswordResetProviderError | null;
}

interface SelectOptions {
  count?: 'exact';
  head?: boolean;
}

interface OrderOptions {
  ascending: boolean;
  foreignTable?: string;
  referencedTable?: string;
}

interface LimitOptions {
  foreignTable?: string;
  referencedTable?: string;
}

export interface QueryChainResult<Row = unknown> {
  data?: Row[] | Row | null;
  count?: number | null;
  error: PostgrestError | null;
}

export type QuerySingleRowResult<Row> = QueryChainResult<Row> & {
  data: Row;
  error: null;
};

export type QueryListRowsResult<Row> = QueryChainResult<Row> & {
  data: Row[] | null;
  error: null;
};

export type QueryCountRowsResult<Row> = QueryListRowsResult<Row> & {
  count: number | null;
};

export class SupabaseQueryChain<Row = unknown> implements PromiseLike<QueryChainResult<Row>> {
  constructor(private readonly resolveValue: QueryChainResult<Row> = {data: null, error: null}) {}

  select(_columns: string, _options?: SelectOptions): this {
    return this;
  }

  filter(_column: string, _operator: string, _value: QueryFilterValue): this {
    return this;
  }

  eq(_column: string, _value: QueryFilterValue): this {
    return this;
  }

  neq(_column: string, _value: QueryFilterValue): this {
    return this;
  }

  is(_column: string, _value: QueryFilterValue): this {
    return this;
  }

  in(_column: string, _values: readonly QueryFilterValue[]): this {
    return this;
  }

  range(_from: number, _to: number): this {
    return this;
  }

  order(_column: string, _options: OrderOptions): this {
    return this;
  }

  limit(_count: number, _options?: LimitOptions): this {
    return this;
  }

  single(): this {
    return this;
  }

  maybeSingle(): this {
    return this;
  }

  ilike(_column: string, _pattern: string): this {
    return this;
  }

  insert(_values: Record<string, unknown> | readonly Record<string, unknown>[]): this {
    return this;
  }

  update(_values: Record<string, unknown>): this {
    return this;
  }

  delete(): this {
    return this;
  }

  upsert(_values: Record<string, unknown> | readonly Record<string, unknown>[]): this {
    return this;
  }

  then<TResult1 = QueryChainResult<Row>, TResult2 = never>(
    onfulfilled?: ((value: QueryChainResult<Row>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.resolveValue).then(onfulfilled, onrejected);
  }
}

export interface SupabaseClientDouble {
  readonly supabaseKey: string;
  readonly supabaseUrl: string;
  auth: {
    updateUser(attributes: PasswordUpdateAttributes): Promise<PasswordUpdateResult>;
  };
  from(table: string): unknown;
}

export function chainable<Row = unknown>(resolveValue: QueryChainResult<Row> = {data: null, error: null}) {
  return new SupabaseQueryChain(resolveValue);
}

export function getSupabaseClientDouble(service: SupabaseService): SupabaseClientDouble {
  const client = Reflect.get(service, 'supabase');
  if (!isSupabaseClientDouble(client)) {
    throw new Error('Supabase test setup did not expose a chainable client double.');
  }

  return client;
}

export function authUserFixture(id: string): SimpleUserModel {
  return {
    created_at: '2026-07-21T00:00:00Z',
    email: `${ id }@example.test`,
    id,
    updated_at: '2026-07-21T00:00:00Z'
  };
}

export function mockUserSession(
  service: SupabaseService,
  user: SimpleUserModel | null
): jasmine.Spy<() => Observable<SimpleUserModel | null>> {
  return spyOn(service.auth, 'getUserSession$').and.returnValue(of(user));
}

export function formatUnknownError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isSupabaseClientDouble(value: unknown): value is SupabaseClientDouble {
  if (typeof value !== 'object' || value === null || !('from' in value)) {
    return false;
  }

  const auth = Reflect.get(value, 'auth');

  return typeof Reflect.get(value, 'from') === 'function'
    && typeof auth === 'object'
    && auth !== null
    && typeof Reflect.get(auth, 'updateUser') === 'function'
    && typeof Reflect.get(value, 'supabaseKey') === 'string'
    && typeof Reflect.get(value, 'supabaseUrl') === 'string';
}
