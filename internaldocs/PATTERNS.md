# Common Patterns

> **Rules for AI agents using this file:**
> 1. **This is the canonical pattern source.** When you need a code template, copy from here — do not invent new
     patterns.
> 2. **Do not add patterns that duplicate what is here** — extend by adding a new section only when a genuinely new
     pattern is needed and confirmed by the user.
> 3. **Naming conventions → [STYLE_GUIDE.md](./STYLE_GUIDE.md). Architecture
     layers → [ARCHITECTURE.md](./ARCHITECTURE.md). Enforcement rules → [FOR_AI_AGENTS.md](./FOR_AI_AGENTS.md).**

> ⚠️ Copy these patterns exactly when creating new components/services.

---

## Data Service Template

```typescript
@Injectable()
export class FeatureDataService extends SubManager {
  // STATE
  private _data$ = new BehaviorSubject<Data[]>([]);
  private _isLoading$ = new BehaviorSubject<boolean>(false);

  // PUBLIC
  public readonly data$ = this._data$.asObservable();
  public readonly isLoading$ = this._isLoading$.asObservable();

  // ACTIONS
  public loadData$ = new Subject<void>();
  public submitForm$ = new Subject<FormData>();

  constructor(
    private backend: SupabaseService,
    private snackBar: MatSnackBar
  ) {
    super();
    this.initializeLoadHandler();
    this.initializeSubmitHandler();
  }

  private initializeLoadHandler(): void {
    this.loadData$.pipe(
      tap(() => this._isLoading$.next(true)),
      switchMap(() => this.backend.get.someData()),
      tap(data => this._data$.next(data)),
      catchError(error => {
        console.error('Load error:', error);
        SharedConstants.errorCustom(this.snackBar, 'Failed to load');
        return EMPTY;
      }),
      finalize(() => this._isLoading$.next(false)),
      takeUntil(this.destroy$)
    ).subscribe();
  }
}
```

---

## Component with Data Service

```typescript
@Component({
  selector: 'app-feature',
  providers: [FeatureDataService]  // Provide here, not in module
})
export class FeatureComponent extends SubManager {
  data$ = this.dataService.data$;

  constructor(public dataService: FeatureDataService) {
    super();
    dataService.loadData$.next();
  }
}
```

---

## ReplaySubject Trigger Pattern

Use `ReplaySubject<ID>` (not `Subject`) when a handler must fire immediately for late subscribers — e.g. loading a
specific entity by ID when the component initialises.

```typescript
// Service
updateSingleItem$ = new ReplaySubject<number>(); // replays last emitted ID to new subscribers
singleItemData$ = new BehaviorSubject<Item | null>(null);

// In constructor:
this.updateSingleItem$.pipe(
  tap(() => this.singleItemData$.next(null)),    // clear stale data while loading
  switchMap(id => this.backend.get.itemWithId(id)),
  tap(result => this.singleItemData$.next(result.data)),
  takeUntil(this.destroy$)
).subscribe();

// Component triggers it:
this.dataService.updateSingleItem$.next(itemId);
```

**When to use ReplaySubject vs Subject:**

- `ReplaySubject<T>(1)` — entity detail pages (patch, module, rack); the ID must replay to graph/editor sub-components
  that subscribe after the initial emit.
- `Subject<void>` — list refreshes, form submits, toggle actions.

---

## Toggle Pattern (Inline UI)

```typescript
// Service
private _showForm$ = new BehaviorSubject<boolean>(false);
public readonly showForm$ = this._showForm$.asObservable();
public toggleForm$ = new Subject<boolean>();

private initializeToggleHandler(): void {
  this.toggleForm$.pipe(
    tap(show => this._showForm$.next(show)),
    takeUntil(this.destroy$)
  ).subscribe();
}
```

```html
<button *ngIf="!(showForm$ | async)" (click)="dataService.toggleForm$.next(true)">
  Show Form
</button>
<div *ngIf="showForm$ | async">
  <button (click)="dataService.toggleForm$.next(false)">
    <mat-icon>arrow_back</mat-icon>
    Back
  </button>
  <app-form></app-form>
</div>
```

---

## Form with Validation

```typescript
form = new FormGroup({
  name: new FormControl('', [Validators.required]),
  email: new FormControl('', [Validators.required, Validators.email])
});

submit()
:
void {
  if(this.form.valid
)
{
  this.dataService.submitForm$.next(this.form.value);
}
}
```

```html
<form [formGroup]="form" (ngSubmit)="submit()">
  <mat-form-field appearance="outline">
    <mat-label>Name</mat-label>
    <input matInput formControlName="name">
    <mat-error *ngIf="form.get('name')?.hasError('required')">Name is required</mat-error>
  </mat-form-field>
  <button mat-raised-button color="primary" [disabled]="form.invalid || (isSubmitting$ | async)">
    Submit
  </button>
</form>
```

---

## Error & Success Messages

```typescript
// In a pipe handler:
tap(() => SharedConstants.successCustom(this.snackBar, 'Saved!')),
catchError(error => {
  console.error('Error:', error);
  SharedConstants.errorCustom(this.snackBar, error.message || 'Unknown error');
  return EMPTY;
})
```

```html
<div *ngIf="errorMessage$ | async as error" class="message error">
  <mat-icon>error</mat-icon>
  <span>{{ error }}</span>
</div>
```

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

## Multiple Triggers (merge)

```typescript
merge(
  this.userService.loggedUser$,
  this.updateData$
).pipe(
  switchMap(() => this.backend.get.currentUserPatches()),
  tap(data => this._data$.next(data)),
  takeUntil(this.destroy$)
).subscribe();
```

---

## Copy to Clipboard

```typescript
public copyToClipboard$ = new Subject<void>();

private initializeCopyHandler(): void {
  this.copyToClipboard$.pipe(
    withLatestFrom(this.data$),
    tap(([_, data]) => {
      if (data) {
        const text = `${data.name} by ${data.manufacturer}`;
        navigator.clipboard.writeText(text);
        SharedConstants.successCustom(this.snackBar, `Copied: ${text}`);
      }
    }),
    takeUntil(this.destroy$)
  ).subscribe();
}
```

---

## Writing Tests

All tests use **Jasmine + Karma** via `yarn test-headless`. Follow the shared `test-setup.ts` pattern used throughout
the codebase.

### Spec file location

Co-locate simple specs with the file being tested:

```
src/app/components/patch-parts/patch-connection-stats.spec.ts   ← unit test next to the pipe
```

For service suites with multiple concerns, use a `__tests__/<service-name>/` subdirectory with a shared `test-setup.ts`:

```
src/app/features/backend/__tests__/supabase-service/
  test-setup.ts          ← shared setup/teardown + mock data
  api-surface.spec.ts    ← method existence checks
  caching.spec.ts        ← cache behaviour
  pattern-compliance.spec.ts
```

### Shared test-setup pattern

```typescript
// test-setup.ts
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { MyService } from './my.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';


export function setupMyServiceTest() {
  const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
  const mockBackend = {
    get: {
      someData: jasmine.createSpy().and.returnValue(of([]))
    },
    add: {
      item: jasmine.createSpy().and.returnValue(of({data: {id: 1}, error: null}))
    }
  };
  
  TestBed.configureTestingModule({
    providers: [
      MyService,
      {provide: MatSnackBar, useValue: mockSnackBar},
      {provide: SupabaseService, useValue: mockBackend}
    ]
  });
  
  return {
    service: TestBed.inject(MyService),
    mockSnackBar,
    mockBackend
  };
}

export function cleanupMyServiceTest() {
  TestBed.resetTestingModule();
}
```

### Spec file structure

```typescript
import {
  setupMyServiceTest,
  cleanupMyServiceTest
} from './test-setup';
import { MyService } from './my.service';


describe('MyService', () => {
  let service: MyService;
  
  beforeEach(() => {
    const setup = setupMyServiceTest();
    service = setup.service;
  });
  
  afterEach(() => cleanupMyServiceTest());
  
  describe('API surface', () => {
    it('should expose loadData$ Subject', () => {
      expect(service.loadData$).toBeDefined();
      expect(typeof service.loadData$.next).toBe('function');
    });
    
    it('should expose data$ Observable', () => {
      expect(service.data$).toBeDefined();
      expect(typeof service.data$.subscribe).toBe('function');
    });
  });
  
  describe('loadData$ handler', () => {
    it('should call backend.get.someData when triggered', () => {
      // trigger
      service.loadData$.next();
      // assert
      expect(/* mockBackend.get.someData */).toHaveBeenCalled();
    });
  });
});
```

### What to test (minimum bar)

1. **API surface** — every public Subject and Observable exists and has the right type (`next` for Subjects, `subscribe`
   for Observables).
2. **Handler wiring** — triggering the action Subject causes the expected backend call.
3. **State update** — after a backend call resolves, the BehaviorSubject has the correct value.
4. **Error path** — if the backend returns an error, the service doesn't crash and shows the right snackbar.

### Run a single spec file

```
yarn test-headless --include="**/my-service.spec.ts"
yarn test-headless --include="**/__tests__/supabase-service/*.spec.ts"
```

---

## Loading / Deleting State Indicators

```typescript
private _isLoadingList$ = new BehaviorSubject<boolean>(false);
private _isSubmitting$ = new BehaviorSubject<boolean>(false);
private _isDeletingId$ = new BehaviorSubject<number | null>(null);
```

```html
<button
  [disabled]="(isDeletingId$ | async) === item.id"
  (click)="dataService.deleteItem$.next(item.id)">
  {{ (isDeletingId$ | async) === item.id ? 'Deleting...' : 'Delete' }}
</button>
```