# Backend Method Patterns

> Canonical patterns for backend namespace usage and new SupabaseService methods.

---

## API Calls (backend namespace guide)

`SupabaseService` has **two namespaces** — use the right one:

| Namespace          | When to use                                                | Examples                                                                                               |
|--------------------|------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| `backend.GET.*`    | Paginated / filtered list queries exposed via `GET` object | `backend.GET.modules(...)`, `backend.GET.manufacturers(...)`, `backend.GET.patches(...)`               |
| `backend.get.*`    | Simple entity lookups and user-scoped queries              | `backend.get.patchWithId(id)`, `backend.get.currentUserPatches()`, `backend.get.rackedModules(rackId)` |
| `backend.add.*`    | Create new records                                         | `backend.add.patch(data)`, `backend.add.manufacturers(data)`                                           |
| `backend.update.*` | Update existing records                                    | `backend.update.patch(data)`, `backend.update.module(data)`                                            |
| `backend.delete.*` | Delete records                                             | `backend.delete.userPatch(id)`, `backend.delete.modulePanel(panel)`                                    |

### Simple Load

```typescript
this.loadData$.pipe(
  switchMap(() => this.backend.get.currentUserPatches()),
  tap(data => this._data$.next(data)),
  takeUntil(this.destroy$)
).subscribe();
```

### With Loading State

```typescript
this.loadData$.pipe(
  tap(() => this._isLoading$.next(true)),
  switchMap(() => this.backend.get.currentUserPatches()),
  tap(data => this._data$.next(data)),
  catchError(error => {
    console.error('Error:', error);
    SharedConstants.errorCustom(this.snackBar, 'Failed to load');
    return EMPTY;
  }),
  finalize(() => this._isLoading$.next(false)),
  takeUntil(this.destroy$)
).subscribe();
```

### Sequential Operations

```typescript
this.submit$.pipe(
  switchMap(data => this.backend.add.patch(data)),
  switchMap(created => this.backend.update.patch({...created, extra: 'data'})),
  tap(() => SharedConstants.successSave(this.snackBar)),
  takeUntil(this.destroy$)
).subscribe();
```

### Parallel Operations

```typescript
this.loadAll$.pipe(
  switchMap(() => forkJoin({
    patches: this.backend.get.currentUserPatches(),
    racks: this.backend.get.currentUserRacks()
  })),
  tap(({patches, racks}) => {
    this._patches$.next(patches);
    this._racks$.next(racks);
  }),
  takeUntil(this.destroy$)
).subscribe();
```

---

## Adding a New Backend Method to SupabaseService

When a new feature requires a new query or mutation, follow this checklist inside `supabase.service.ts`:

1. **Register the table name** in `DatabaseStrings.ts` (`DbPaths`) before writing the method.
2. **Read-only methods (in `GET` or `get` namespace):** Add `@Cacheable({ maxAge, cacheBusterObserver })` if the data
   changes infrequently. Register the cache key in the `CachedEntity` union type.
3. **Write methods (add/update/delete):** Always include a `cacheBust([...keys])` pipe operator after the write
   succeeds. Bust every entity key that the write could invalidate.
4. **Use the internal pipe helpers** already defined in the file:
    - `cacheBust(keys)` — emits to `cacheBuster$` after success
    - `catchErrors(this.snackBar)` — logs + shows error snackbar, returns `NEVER`
    - `showSuccessMessage(this.snackBar)` — shows success snackbar

```typescript
// Example: adding a new write method to backend.add
addNewThing: (data: NewThingInsert) =>
  rxFrom(
    this.supabase.from(DbPaths.new_things).insert(data).select('id, name')
  ).pipe(
    remapErrors(),
    map(x => x.data),
    cacheBust(['new_things', 'relatedEntity']),  // bust anything stale
    catchErrors(this.snackBar)
  ),
```

---

## Selecting Columns in Embedded Joins

When defining a `QueryJoins` entry in `DatabaseStrings.ts`, select only the
columns callers actually consume. Do not default to `(*)` for convenience,
especially for joined/embedded tables: the primary table of a query may
reasonably need a broader selection, but every embedded row is additional
response data that is fetched and shipped on each request.

Before trimming an existing over-broad join, verify safety exhaustively:

1. Grep all of `src/` for every field access on the joined type, including
   production code, spec files, and `.html` templates. Angular bindings such
   as `{{ x.field }}` and `[prop]="x.field"` are consumers too and will not
   necessarily appear in a plain multi-line source grep.
2. Confirm that no fields outside the proposed selection are read before
   changing the join.
3. Narrow the TypeScript type to match the returned shape. This makes a missed
   consumer a compile error, but manual grep remains the primary safety net:
   TypeScript excess-property checking catches literal-position construction,
   not arbitrary variable assignment.

Add a regression test for the exact select shape. Follow the established
`spyOn(mockChain, 'select')` convention:

```typescript
const selectSpy = spyOn(mockChain, 'select').and.returnValue(mockChain);
expect(selectSpy).toHaveBeenCalledWith(
  jasmine.stringContaining('<expected substring>')
);
expect(selectSpy).not.toHaveBeenCalledWith(
  jasmine.stringContaining('<old, wider substring>')
);
```

The positive assertion verifies the intended projection; the negative
assertion prevents a later change from silently restoring over-fetching. See
the `GET.patchConnections` tests in
`src/app/features/backend/__tests__/supabase-service/get-cached-delegates.spec.ts`
for the worked example.

For example, `QueryJoins.patch` was trimmed from
`patch:patches!patch_connections_patchid_fkey(*)` to
`patch:patches!patch_connections_patchid_fkey(id)`. The companion change in
`src/app/models/connection.ts` narrows `PatchConnection.patch` from `Patch` to
`Pick<Patch, 'id'>`, keeping the type honest.

This applies only to live, referenced joins with over-broad column lists. A
genuinely unreferenced or dead `QueryJoins` entry is a separate dead-code
concern, not an egress concern: a join that is never queried costs nothing.

---

## Schema-change preflight (READ BEFORE WRITING SQL)

Before touching `supabase/migrations/`, RPCs, columns, indexes, or policies — even via the Supabase MCP — walk through this list. Past mistakes live here so we don't repeat them.

### 0. Did the plan pass backend plan review?

Before product approval or implementation, run the draft through
`internaldocs/agents/backend-plan-reviewer.md`. This is a separate gate from the
post-implementation diff review.

The review must explicitly compare:

- semantic domain type vs physical database representation;
- boolean, integer/smallint, text, enum, JSON, normalized relation, and no-new-column
  alternatives where relevant;
- cardinality, future states, storage/wire/index cost, query ergonomics, and invalid
  state prevention;
- migration rewrite/lock/backfill/trigger cost and rollback strategy;
- old/new client compatibility, RLS, cache invalidation, type generation, and data
  retention.

Record the chosen representation and rejected alternatives in the plan Decision log.
No SQL should be written from an unreviewed backend plan.

### 1. Will my migration trigger `updated`/`modified` timestamps on existing rows?

`racks` and `patches` (and likely other tables) have **`BEFORE UPDATE` triggers that auto-set `updated = now()`**. Any `UPDATE ... WHERE ...` you run as part of a backfill will reset `updated` on every touched row — wiping the real edit history visible to users.

**Past incident (2026-05-15):** the `public_id` backfill ran one `UPDATE` per row across all 438 racks + 94 patches. Every row's `updated` is now the migration timestamp. Information is unrecoverable without PITR.

**Mitigations, in order of preference:**

- **Use a column DEFAULT instead of a backfill loop** when possible:
  ```sql
  alter table public.racks
    add column public_id text default public.generate_public_id();
  ```
  PostgreSQL fills existing rows at `ADD COLUMN` time without firing `BEFORE UPDATE`. Caveat: doesn't work cleanly when you need retry-on-collision logic (e.g., random unique tokens) — in that case, see next option.

- **Disable the trigger for the backfill window:**
  ```sql
  alter table public.racks disable trigger user;  -- or the specific trigger name
  -- ... backfill ...
  alter table public.racks enable trigger user;
  ```
  `disable trigger user` skips user-defined triggers but leaves FK/constraint triggers intact. Safest for batch backfills.

- **Force-restore `updated` in the same statement:**
  ```sql
  update public.racks
  set public_id = candidate, updated = updated
  where id = r.id;
  ```
  Works only if the trigger guards against no-op writes (`NEW.updated IS DISTINCT FROM OLD.updated`). Check the trigger source before relying on this.

### 2. Am I about to change RLS / policies / GRANTs?

**Stop and ask the user** (AGENTS.md §5). RLS changes require explicit manual approval. SECURITY DEFINER RPCs that bypass RLS are also a security boundary — review the function body for SQL injection (`format()` + `%I`/`%L`) and least-privilege return shape.

### 3. Did I regenerate `src/backend/database.types.ts`?

- Run `pnpm updateBackendTypes` (or use the Supabase MCP `generate_typescript_types` tool if the CLI auth hangs).
- After regen, **double-check Insert/Update generic types for columns with DB-side defaults** (triggers, `DEFAULT now()`, sequences). The generator often marks them `required: true` even when they're filled server-side — flip them to optional manually or callers won't compile.

### 4. Did I bust the right caches?

Every `cacheBust([...])` call after a write must cover all `@Cacheable` reads whose results could be stale. New RPC-backed reads (e.g., `get_rack_by_public_id`) should reuse the same cache keys as the equivalent table read (`'rackWithId'`) so existing write paths invalidate them.

### 5. Did I run advisors?

After any non-trivial schema change use the Supabase MCP `get_advisors` (lint + security) tool against the project. Address `error` and `warn` items or document why they're acceptable.

### 6. Did I record the migration in `internaldocs/workflow/CURRENT_FEATURE.md`?

Every backend change in active feature work belongs in `CURRENT_FEATURE.md` (with the applied-on date) and, on completion, archived to `COMPLETED.md`.

---

## Schema-change incident log

| Date       | Change                                                               | Tables affected                                                          |
|------------|----------------------------------------------------------------------|--------------------------------------------------------------------------|
| 2026-05-15 | add touch-parent triggers on rack_modules and patch child tables | rack_modules, patches, racks |
