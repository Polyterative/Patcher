# For AI Coding Agents

**This project follows strict architectural patterns. You MUST adhere to these conventions.**

## ⚠️ Critical Rules

### 1. Service Architecture

- **Data Services**: Always `@Injectable()` (component-scoped, NOT root)
- **API Services**: `@Injectable({ providedIn: 'root' })`
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for details

### 2. Subscription Management

```typescript
// ✅ REQUIRED: Extend SubManager
export class MyComponent extends SubManager {
  constructor() {
    super();  // REQUIRED
  }
}

// ✅ REQUIRED: Use takeUntil(this.destroy$) on ALL subscriptions
this.observable$.pipe(
  // ... operators
  takeUntil(this.destroy$)  // MUST HAVE
).subscribe();

// ✅ PREFERRED: Use async pipe in templates (no manual subscriptions)
<div * ngIf = "data$ | async as data" > {
{ data }
}
</div>
```

### 3. Data Service Pattern

**Always follow this structure:**

```typescript

@Injectable()  // NOT root!
export class MyDataService extends SubManager {
  // Private BehaviorSubjects
  private _data$ = new BehaviorSubject<Data[]>([]);
  
  // Public readonly observables
  public readonly data$ = this._data$.asObservable();
  
  // Public action Subjects
  public loadData$ = new Subject<void>();
  
  constructor(private backend: SupabaseService) {
    super();
    // Initialize handlers
  }
  
  private initializeHandler(): void {
    this.loadData$.pipe(
      switchMap(() => this.backend.getData()),
      tap(data => this._data$.next(data)),
      takeUntil(this.destroy$)  // REQUIRED!
    ).subscribe();
  }
}
```

### 4. Naming Conventions

- Observables: `data$`, `user$`, `isLoading$`
- Private observables: `private _state$`
- Action subjects: `loadData$`, `submitForm$`
- **ALL observables/subjects MUST end with `$`**

### 5. Component Pattern

```typescript

@Component({
  providers: [MyDataService]  // Provide data service here
})
export class MyComponent extends SubManager {
  data$ = this.dataService.data$;  // Expose for template
  
  constructor(public dataService: MyDataService) {
    super();  // REQUIRED
  }
}
```

### 6. Error Handling

```typescript
// ✅ Use SharedConstants for user messages
SharedConstants.successSave(this.snackBar);
SharedConstants.errorCustom(this.snackBar, 'Failed to load');

// ✅ Log errors to console
catchError(error => {
  console.error('Operation failed:', error);
  SharedConstants.errorCustom(this.snackBar, 'Failed');
  return EMPTY;
})
```

### 7. UI Patterns

- **Prefer inline UI over dialogs**: Use `BehaviorSubject<boolean>` for toggles
- **Use Angular Material icons**: `<mat-icon>edit</mat-icon>`
- **Use async pipe**: Always use `| async` in templates
- **Use layout classes**: `.row`, `.col`, `.gap1` from `tools.scss`

### 8. Backend Calls

```typescript
// ✅ Always through SupabaseService
this.backend.GET.currentUserModules()
this.backend.update.module(data)
this.backend.delete.modulePanel(panel)

// ❌ Never directly instantiate Supabase client
```

## 🚫 Common Mistakes to Avoid

❌ `@Injectable({ providedIn: 'root' })` on data services  
❌ Manual subscriptions without `takeUntil(this.destroy$)`  
❌ Forgetting to extend `SubManager`  
❌ Forgetting to call `super()` in constructor  
❌ Not using `$` suffix on observables  
❌ Using dialogs instead of inline UI  
❌ Subscribing in components (use async pipe instead)  
❌ Not using `readonly` on public observables  
❌ **Creating markdown summary/report files** - Just do the work, don't generate documentation about what you did

## 📚 Required Reading

Before making changes:

1. [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand the service layers
2. [STYLE_GUIDE.md](./STYLE_GUIDE.md) - Follow naming and patterns
3. [PATTERNS.md](./PATTERNS.md) - Use these templates

## ✅ Checklist for New Components/Services

**Data Service:**

- [ ] Extends `SubManager`
- [ ] `@Injectable()` with no `providedIn`
- [ ] Private BehaviorSubjects with `_` prefix
- [ ] Public readonly observables
- [ ] Public action Subjects
- [ ] All subscriptions have `takeUntil(this.destroy$)`
- [ ] Calls `super()` in constructor

**Component:**

- [ ] Extends `SubManager`
- [ ] Calls `super()` in constructor
- [ ] Provides data service in `@Component` decorator
- [ ] Uses `async` pipe in template
- [ ] Uses layout classes from `tools.scss`

**Any Observable/Subject:**

- [ ] Has `$` suffix
- [ ] Uses `takeUntil(this.destroy$)` if subscribed

## 🔍 Code Review Points

When reviewing your changes, verify:

1. All new services extend `SubManager`
2. All subscriptions use `takeUntil(this.destroy$)`
3. Data services are component-scoped
4. Observable naming follows conventions
5. Templates use `async` pipe
6. Error messages use `SharedConstants`
7. Layout uses existing SCSS classes

## 💡 When in Doubt

**Copy existing patterns** from these files:

- `module-detail-data.service.ts`
- `user-login-data.service.ts`
- `patch-detail-data.service.ts`

These are reference implementations of the correct patterns.

## 📣 Communication Guidelines

- ❌ **DO NOT** generate markdown files summarizing your work or changes
- ✅ Simply explain what you did in your response
- ✅ Make the changes directly using the tools
- ✅ Verify your changes with error checking
- ❌ Do not create reports, summaries, or review documents as files without explicit instructions to do so