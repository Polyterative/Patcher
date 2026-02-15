# Common Patterns

> **⚠️ Use these templates.** Copy these patterns exactly when creating new components/services.

## Data Service Template

```typescript
@Injectable()
export class FeatureDataService extends SubManager {
  // STATE
  private _data$ = new BehaviorSubject<Data[]>([]);
  private _isLoading$ = new BehaviorSubject<boolean>(false);
  private _errorMessage$ = new BehaviorSubject<string>('');
  
  // PUBLIC
  public readonly data$ = this._data$.asObservable();
  public readonly isLoading$ = this._isLoading$.asObservable();
  public readonly errorMessage$ = this._errorMessage$.asObservable();
  
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
      switchMap(() => this.backend.getData()),
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

## Component with Data Service

```typescript
@Component({
  selector: 'app-feature',
  providers: [FeatureDataService]  // Provide here
})
export class FeatureComponent extends SubManager {
  data$ = this.dataService.data$;
  
  constructor(public dataService: FeatureDataService) {
    super();
    dataService.loadData$.next();
  }
}
```

## Toggle Pattern (Inline UI)

```typescript
// Service
private _showForm$ = new BehaviorSubject<boolean>(false);
public readonly showForm$ = this._showForm$.asObservable();
public toggleForm$ = new Subject<boolean>();

private initializeToggleHandler(): void {
  this.toggleForm$.pipe(
    tap(show => {
      this._showForm$.next(show);
      if (!show) this._errorMessage$.next('');
    }),
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
    <mat-error *ngIf="form.get('name')?.hasError('required')">
      Name is required
    </mat-error>
  </mat-form-field>
  
  <button
    mat-raised-button
    color="primary"
    [disabled]="form.invalid || (isSubmitting$ | async)">
    Submit
  </button>
</form>
```

## Error & Success Messages

```typescript
// Service
private
_errorMessage$ = new BehaviorSubject<string>('');
private
_successMessage$ = new BehaviorSubject<string>('');

// Handler
tap(() => {
  this._successMessage$.next('Saved!');
  this._errorMessage$.next('');
}),
  catchError(error => {
    this._errorMessage$.next(error.message || 'Unknown error');
    this._successMessage$.next('');
    return EMPTY;
  })
```

```html

<div *ngIf="errorMessage$ | async as error" class="message error">
  <mat-icon>error</mat-icon>
  <span>{{ error }}</span>
</div>

<div *ngIf="successMessage$ | async as success" class="message success">
  <mat-icon>check_circle</mat-icon>
  <span>{{ success }}</span>
</div>
```

## API Calls

### Simple Load

```typescript
this.loadData$.pipe(
  switchMap(() => this.backend.GET.data()),
  tap(data => this._data$.next(data)),
  takeUntil(this.destroy$)
).subscribe();
```

### With Loading State

```typescript
this.loadData$.pipe(
  tap(() => this._isLoading$.next(true)),
  switchMap(() => this.backend.GET.data()),
  tap(data => this._data$.next(data)),
  catchError(error => {
    console.error('Error:', error);
    return EMPTY;
  }),
  finalize(() => this._isLoading$.next(false)),
  takeUntil(this.destroy$)
).subscribe();
```

### Sequential Operations

```typescript
this.submit$.pipe(
  switchMap(() => this.backend.create(data)),
  switchMap(created => this.backend.update(created.id, moreData)),
  tap(() => SharedConstants.successSave(this.snackBar)),
  takeUntil(this.destroy$)
).subscribe();
```

### Parallel Operations

```typescript
this.loadAll$.pipe(
  switchMap(() => forkJoin({
    modules: this.backend.GET.modules(),
    racks: this.backend.GET.racks()
  })),
  tap(({modules, racks}) => {
    this._modules$.next(modules);
    this._racks$.next(racks);
  }),
  takeUntil(this.destroy$)
).subscribe();
```

## Copy to Clipboard

```typescript
public
copyToClipboard$ = new Subject<void>();

private
initializeCopyHandler()
:
void {
  this.copyToClipboard$.pipe(
    withLatestFrom(this.data$),
    tap(([_, data]) => {
      if (data) {
        const text = `${ data.name } by ${ data.manufacturer }`;
        navigator.clipboard.writeText(text);
        SharedConstants.successCustom(this.snackBar, `Copied: ${ text }`);
      }
    }),
    takeUntil(this.destroy$)
  ).subscribe();
}
```

## Multiple Triggers (merge)

```typescript
merge(
  this.userService.loggedUser$,
  this.updateData$
).pipe(
  switchMap(() => this.backend.GET.data()),
  tap(data => this._data$.next(data)),
  takeUntil(this.destroy$)
).subscribe();
```

## Multiple Loading States

```typescript
private
_isLoadingList$ = new BehaviorSubject<boolean>(false);
private
_isSubmitting$ = new BehaviorSubject<boolean>(false);
private
_isDeletingId$ = new BehaviorSubject<string | null>(null);
```

```html

<button
  [disabled]="(isDeletingId$ | async) === item.id"
  (click)="delete(item.id)">
  {{ (isDeletingId$ | async) === item.id ? 'Deleting...' : 'Delete' }}
</button>
```