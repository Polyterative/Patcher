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
