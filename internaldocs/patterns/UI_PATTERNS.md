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

---

## Tablet / Touch Guardrails

Use these as default rules when building or refactoring UI that should work well on iPad-class devices.

### 1. Prefer visible primary actions over hover reveal

- Do not hide core actions behind `:hover`, `mouseenter`/`mouseleave`, or opacity tricks on touch-relevant surfaces.
- If desktop needs quieter chrome, use a touch-specific fallback such as always-visible actions or tap-to-expand state.

### 2. Avoid right-click-only workflows

- Context menus may exist as a secondary affordance, but important actions must have a visible tap path.
- Nested menu structures are especially poor fits for touch. Flatten tablet-critical actions where possible.

### 3. Treat floating surfaces as a coordinated system

- Do not independently pin multiple controls to bottom corners without considering the whole stack.
- Fixed FABs, floating search, selection surfaces, and teaching overlays must share safe-area and keyboard strategy.
- Prefer shared viewport logic over per-component `window.innerHeight` / `100vh` assumptions.

### 4. Make shared forms tablet-aware by default

- Add the right `inputmode` and `enterkeyhint` for common field types.
- Default important entry points to sensible first focus.
- Respect enter-key progression for multi-field flows instead of forcing repeated tap-to-submit patterns.

### 5. Be generous with repeated touch targets

- Repeated action controls should aim for comfort, not bare-minimum compliance.
- Small icon-only actions, dense chip rows, CV pins, and utility toggles need extra care because users hit them often and
  under time pressure.

### 6. Keep scroll and motion work calm

- Avoid scroll-bound recalculation unless it is throttled or otherwise bounded.
- Use backdrop blur sparingly on fixed surfaces.
- Prefer short, intentional motion over long-running decorative animation on work surfaces.
