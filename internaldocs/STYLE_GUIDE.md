# Style Guide

> **⚠️ These conventions are MANDATORY.** AI agents must follow these patterns strictly.

## TypeScript Naming

| Type               | Convention | Example                    |
|--------------------|------------|----------------------------|
| Observable         | suffix `$` | `user$`, `isLoading$`      |
| Private Observable | `_` + `$`  | `private _state$`          |
| Action Subject     | suffix `$` | `submitForm$`, `loadData$` |

## Data Service Pattern

```typescript
@Injectable()  // NOT root
export class MyDataService extends SubManager {
  // Private state
  private _data$ = new BehaviorSubject<Data[]>([]);
  
  // Public observables (readonly)
  public readonly data$ = this._data$.asObservable();
  
  // Actions
  public loadData$ = new Subject<void>();
  
  constructor(private backend: SupabaseService) {
    super();
    this.loadData$.pipe(
      switchMap(() => this.backend.getData()),
      tap(data => this._data$.next(data)),
      takeUntil(this.destroy$)  // Required
    ).subscribe();
  }
}
```

## Component Pattern

```typescript
export class MyComponent extends SubManager {
  data$ = this.dataService.data$;
  
  constructor(public dataService: MyDataService) {
    super();
  }
}
```

## HTML

### Material Icons

```html

<mat-icon>edit</mat-icon>
<mat-icon>{{ isLocked ? 'lock' : 'lock_open' }}</mat-icon>
```

Common: `edit`, `delete_forever`, `close`, `add`, `save`, `check_circle`, `error`, `warning`, `lock`

### Async Pipe (Required)

```html
<div *ngIf="data$ | async as data">
  {{ data.name }}
</div>
```

## SCSS

### Layout Classes (from `tools.scss`)

```scss
.row // Flex row
.rowwrap // Flex row wrap
.col // Flex column
.col-lt-MD // Column < 960px
.col-lt-LG // Column < 1280px
.gap0 .gap1 .gap2 .gap3 // 0.25rem, 0.5rem, 1rem, 1.5rem
.center // align-items: center
.auto-left // margin-left: auto
.auto-right

// margin-right: auto
```

### Inline vs SCSS

✅ **Inline**: Single properties, dynamic values  
❌ **SCSS**: Multiple properties, hover states, repeated patterns

## Error Handling

### SharedConstants (user messages)

```typescript
SharedConstants.successSave(snackBar);
SharedConstants.errorCustom(snackBar, 'Failed');
```

All messages in `SharedConstants.ts`

### Error State Pattern

```typescript
// Service
private
_errorMessage$ = new BehaviorSubject<string>('');
public readonly
errorMessage$ = this._errorMessage$.asObservable();

// Handler
catchError(error => {
  console.error('Error:', error);
  this._errorMessage$.next(error.message || 'Unknown error');
  return EMPTY;
})
```

```html
<!-- Template -->
<div *ngIf="errorMessage$ | async as error" class="error">
  {{ error }}
</div>
```

## Project Conventions

### Inline UI over Dialogs

```typescript
// ❌ Don't
this.dialog.open(FormDialogComponent);

// ✅ Do
this.showForm$.next(true);
```

### Backend Calls via SupabaseService

```typescript
this.backend.GET.currentUserModules()
this.backend.update.module(data)
this.backend.delete.modulePanel(panel)
```

### Always

- ✅ Extend `SubManager`
- ✅ Use `takeUntil(this.destroy$)`
- ✅ Use `async` pipe
- ❌ Never subscribe without cleanup