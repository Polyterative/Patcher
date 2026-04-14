# UI Patterns

> Canonical UI interaction and state snippets shared across features.

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

submit(): void {
  if (this.form.valid) {
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

## Shared List Search Matching

Use the shared matcher in `string-utils.ts` for list filtering instead of open-coded `normalizeForSearch(...).includes(...)`
checks in each component. Pass every user-visible field that should be searchable for that entity type.

```typescript
const searchFields = [item.name, item.description, item.manufacturer?.name];

return matchesSearchQuery(localQuery, ...searchFields)
  && matchesSearchQuery(externalQuery, ...searchFields);
```

This keeps search normalization consistent and allows the same missing/extra-character tolerance across modules, racks, and
patches.

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
