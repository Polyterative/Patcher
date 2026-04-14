# Reactive Service Patterns

> Canonical reactive component/data-service patterns. Use these when building feature state and event wiring.

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
