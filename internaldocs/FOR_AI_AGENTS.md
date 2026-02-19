# For AI Coding Agents

**This project follows strict architectural patterns. You MUST adhere to these conventions.**

## 🎯 Development Philosophy

**Build in Layers - Never Skip Steps:**

- Take time to understand requirements fully before implementing
- Verify current state before making changes (explore codebase first)
- Implement incrementally: database → backend → UI → polish
- If something needs time to make sense, take that time
- Simple is better than fast - build correctly, not quickly

**Capture Guidelines:**
When the user expresses a guideline, workflow preference, or decision principle:

1. Add it to this document in the appropriate section
2. Format it clearly and actionably
3. Cross-reference with related sections if applicable
4. Confirm the addition with the user

## 🤖 Autonomy & Tool Priority (READ FIRST)

**Maximize tool use, minimize terminal calls.**

- **Prefer file tools over terminal:** Use `read_file`, `insert_edit_into_file`, `replace_string_in_file`,
  `grep_search`, `file_search`, and `list_dir` to explore and modify the codebase directly. Terminal calls (
  `run_in_terminal`) are a last resort.
- **Terminal is only for:** Installing packages (`yarn add …`), running tests (`yarn test-headless`), or executing things that cannot be done with file tools alone.
- **Tests MUST use:** `yarn test-headless` — this is the only acceptable test command. Never `ng test`, never `npx ng test`.
- **Never use terminal to:** Read files, search for patterns, check directory structure, or apply code changes — always
  use the dedicated tools instead.
- **Batch file edits:** Group all changes to the same file into a single tool call rather than multiple sequential
  terminal + file operations.
- **Autonomous by default:** Do not ask for permission to read files or explore the codebase. Gather all necessary
  context with tools, then act.

---

## ⚡ Quick Reference (MUST READ FIRST)

**Commands:** Use `yarn` (install/add/remove) never `npm`. Testing: **always `yarn test-headless`** — never `ng test`, never `npx ng test`, never any other variant.

**🚫 NEVER run tests like this:**
```
ng test ...
npx ng test ...
npx ng test --browsers=ChromeHeadlessCI ...
```

**✅ ALWAYS run tests like this:**
```
yarn test-headless
```
For a specific test file pattern, use `--include`:
```
yarn test-headless --include="**/my-file.spec.ts"
```

**Event-Driven Architecture (CRITICAL):**
- ✅ All logic in constructor via reactive streams
- ✅ Public action Subjects (e.g., `loadData$`, `deleteItem$`)
- ✅ Components call `.next()` on Subjects, never methods
- ❌ Never create public methods for business logic

**Every Component/Service MUST:**

1. Extend `SubManager`, call `super()` in constructor
2. Use `takeUntil(this.destroy$)` on ALL subscriptions
3. Use `$` suffix on observables/subjects
4. Initialize event handlers in constructor

**Data Services:**

- `@Injectable()` (NOT root), provided in component decorator
- Private `_state$` BehaviorSubject, public `readonly state$` observable
- Public action Subjects for events

**Never:**
- Subscribe in components (use `async` pipe)
- Create dialogs (use inline UI) or direct Supabase calls (use SupabaseService)
- Create public methods that return observables (use Subjects)
- Generate markdown summary files

## 📁 File Organization & Imports

**Key Imports:**
```typescript
import { SubManager } from 'src/app/shared-interproject/directives/subscription-manager';
import { SupabaseService } from 'src/app/features/backend/supabase.service';
import { UserManagementService } from 'src/app/features/backend/user-management.service';
import { SharedConstants } from 'src/app/shared-interproject/SharedConstants';
import { AppStateService } from 'src/app/shared-interproject/app-state.service';
```

**File Locations:** Data services: `*-data.service.ts` in component directory. Components:
`src/app/components/[feature]/`. Models: `src/app/models/`. Shared: `src/app/shared-interproject/`.

## ⚠️ Critical Rules

### 1. Service Architecture & Subscription Management

**Data Services:** `@Injectable()` (component-scoped, NOT root). **API Services:**
`@Injectable({ providedIn: 'root' })`. See [ARCHITECTURE.md](./ARCHITECTURE.md).

**Always extend SubManager and use takeUntil:**
```typescript
export class MyComponent extends SubManager {
  constructor() {
    super();
  } // REQUIRED
}

// REQUIRED on ALL subscriptions:
this.observable$.pipe(takeUntil(this.destroy$)).subscribe();

// PREFERRED: Use async pipe (no manual subscriptions)
<div * ngIf = "data$ | async as data" > {
{data}
}
</div>
```

### 2. Data Service Pattern

```typescript
@Injectable()  // NOT root!
export class MyDataService extends SubManager {
  private _data$ = new BehaviorSubject<Data[]>([]);
  public readonly data$ = this._data$.asObservable();
  public loadData$ = new Subject<void>();
  
  constructor(private backend: SupabaseService) {
    super();
    this.loadData$.pipe(
      switchMap(() => this.backend.getData()),
      tap(data => this._data$.next(data)),
      takeUntil(this.destroy$)
    ).subscribe();
  }
}
```

### 3. Naming & Component Pattern

**Names:** Observables: `data$`, `user$`. Private: `_state$`. Actions: `loadData$`, `submitForm$`. **ALL must end
with `$`**.

```typescript

@Component({providers: [MyDataService]})
export class MyComponent extends SubManager {
  data$ = this.dataService.data$;
  
  constructor(public dataService: MyDataService) {
    super();
  }
}
```

### 4. Error Handling & UI

```typescript
SharedConstants.successSave(this.snackBar);
SharedConstants.errorCustom(this.snackBar, 'Failed');

catchError(error => {
  console.error('Failed:', error);
  SharedConstants.errorCustom(this.snackBar, 'Failed');
  return EMPTY;
})
```

**UI:** Inline UI with `BehaviorSubject<boolean>` toggles, not dialogs. Use `| async` pipe. Layout: `.row`, `.col`,
`.gap1` from `tools.scss`.

### 5. Backend Calls

```typescript
// ✅ Through SupabaseService
this.backend.GET.currentUserModules()
this.backend.update.module(data)
// ❌ Never directly instantiate Supabase
```

### 6. Event-Driven Architecture with RxJS

**⚠️ CRITICAL: All logic in constructor via reactive streams.**

**✅ CORRECT - Handlers in constructor:**
```typescript
@Injectable()
export class MyDataService extends SubManager {
  private _data$ = new BehaviorSubject<Data[]>([]);
  public readonly data$ = this._data$.asObservable();
  public loadData$ = new Subject<void>();
  public deleteItem$ = new Subject<number>();
  
  constructor(private backend: SupabaseService, private snackBar: MatSnackBar) {
    super();
    this.loadData$.pipe(
      switchMap(() => this.backend.getData()),
      tap(data => this._data$.next(data)),
      takeUntil(this.destroy$)
    ).subscribe();
    
    this.deleteItem$.pipe(
      switchMap(id => this.backend.delete(id)),
      tap(() => SharedConstants.successCustom(this.snackBar, 'Deleted')),
      takeUntil(this.destroy$)
    ).subscribe(() => this.loadData$.next());
  }
}
```

**❌ WRONG - Methods from components:**
```typescript
public
deleteItem(id
:
number
):
void { /*DON'T*/}
```

**Component triggers events:**
```typescript
// ✅ Emit to Subject
onClick()
{ this.dataService.deleteItem$.next(itemId); }
// ❌ NOT call method
onClick()
{ this.dataService.deleteItem(itemId); }
```

**Event Chaining Patterns:**

**Action → Backend → State:**
```typescript
this.addItem$.pipe(
  switchMap(item => this.backend.add(item)),
  tap(result => this._items$.next([...this._items$.value, result])),
  takeUntil(this.destroy$)
).subscribe();
```

**Multiple Event Triggers:**
```typescript
merge(this.userService.loggedUser$, this.updateData$).pipe(
  switchMap(() => this.userService.loggedUser$),
  switchMap(user => user ? this.backend.getData() : of([])),
  takeUntil(this.destroy$)
).subscribe(data => this._data$.next(data));
```

**Conditional Execution:**
```typescript
this.deleteModule$.pipe(
  filter(id => id > 0),
  switchMap(id => this.backend.delete.module(id)),
  takeUntil(this.destroy$)
).subscribe(() => SharedConstants.successCustom(this.snackBar, 'Deleted'));
```

**State-Dependent Actions:**
```typescript
this.updateItem$.pipe(
  withLatestFrom(this.singleItemData$),
  map(([partial, original]) => ({...original, ...partial})),
  switchMap(merged => this.backend.update(merged)),
  takeUntil(this.destroy$)
).subscribe(() => this.refreshData$.next());
```

**Optimistic UI:**
```typescript
this.togglePrivacy$.pipe(
  withLatestFrom(this.rackData$),
  tap(([_, rack]) => this.isPrivate$.next(!rack.public)),
  map(([_, rack]) => ({...rack, public: !rack.public})),
  switchMap(rack => this.backend.update.rack(rack)),
  takeUntil(this.destroy$)
).subscribe();
```

**Debounced Search:**
```typescript
this.fields.search.control.valueChanges.pipe(
  debounceTime(750),
  takeUntil(this.destroy$)
).subscribe(text => this.onFilterEvent(text));
```

**Server-Side Pagination:**
```typescript
private
dataPackage$ = combineLatest([
  this.skip$, this.take$, this.filter$, this.sort$
]);

this.updateList$.pipe(
  withLatestFrom(this.dataPackage$),
  switchMap(([_, [skip, take, filter, sort]]) =>
    this.backend.GET.items(skip, take, filter, sort)
  ),
  takeUntil(this.destroy$)
).subscribe(result => {
  this.itemCount$.next(result.count);
  this.items$.next(result.data);
});
```

**Key RxJS Operators:**

- `switchMap` - Backend calls (cancels previous)
- `tap` - Side effects (state, logging, UI)
- `map` - Transform data
- `filter` - Conditional execution
- `withLatestFrom` - Combine with latest from another stream
- `combineLatest` - React to multiple streams
- `merge` - Trigger on any event
- `debounceTime` - Delay (search, forms)
- `distinctUntilChanged` - Only emit on change
- `catchError` - Error handling (return EMPTY or of(fallback))
- `takeUntil(this.destroy$)` - **ALWAYS REQUIRED**

## 🚫 Common Mistakes

❌ `@Injectable({ providedIn: 'root' })` on data services | ❌ No `takeUntil(this.destroy$)` | ❌ Not extending
`SubManager` or calling `super()` | ❌ Missing `$` suffix | ❌ Using dialogs vs inline UI | ❌ Subscribing in components (
use async pipe) | ❌ Not using `readonly` on public observables | ❌ Using `npm` not `yarn` | ❌ Running `ng test` not
`yarn test-headless` | ❌ Direct Supabase calls | ❌ **Public methods for logic (use Subjects)** | ❌ **Components calling
methods (emit to Subjects)** | ❌ **Subscribing outside constructor** | ❌ **Creating markdown summaries** | ❌ **Using
terminal to read files or search code (use file tools)** | ❌ **Asking permission to explore the codebase (just do it)
** | ❌ **Vague commit messages (`fix stuff`, `WIP`)** | ❌ **Non-conventional commit format**

## 📚 Reference & Checklists

**Read:** [ARCHITECTURE.md](./ARCHITECTURE.md), [STYLE_GUIDE.md](./STYLE_GUIDE.md), [PATTERNS.md](./PATTERNS.md)

**Product Status:** [PRODUCT_NEEDS.md](./PRODUCT_NEEDS.md) - Current planned features and work in progress

**Data Service Checklist:**

- [ ] Extends `SubManager`, calls `super()`
- [ ] `@Injectable()` no `providedIn`
- [ ] Private BehaviorSubjects (`_`), public readonly observables, public action Subjects
- [ ] All subscriptions have `takeUntil(this.destroy$)`

**Component Checklist:**

- [ ] Extends `SubManager`, calls `super()`
- [ ] Provides data service in decorator
- [ ] Uses `async` pipe and layout classes from `tools.scss`

**Copy patterns from:** `module-detail-data.service.ts`, `user-login-data.service.ts`, `patch-detail-data.service.ts`

## 🔄 Development Workflow

### Work Completion Standard (REQUIRED)

**Every session MUST follow this cycle — do not stop early:**

1. **Work until commit-ready** — Keep going until all changes are complete, tested, and ready to commit. Never hand back
   to the user with half-finished work.
2. **Run tests after every change** — After each meaningful edit, run the most specific test available (
   `yarn test-headless -- --include="..."`) to confirm nothing is broken before continuing.
3. **Cleanup pass before finishing** — Before declaring work done, do one auto-review pass:
  - Remove dead code, unused imports, commented-out blocks
  - Verify naming conventions (`$` suffix, `_` private prefix)
  - Check all subscriptions have `takeUntil(this.destroy$)`
  - Ensure no `TODO`/`FIXME` left unaddressed from the current session
  - Confirm templates use `async` pipe and layout classes (no inline styles)

---

### Git Commits — Conventional Commits (REQUIRED)

**Every commit MUST follow the Conventional Commits spec.**

Format: `<type>(<scope>): <description>`

**Types:**

| Type       | When to use                                             |
|------------|---------------------------------------------------------|
| `feat`     | New feature or user-visible capability                  |
| `fix`      | Bug fix                                                 |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf`     | Performance improvement                                 |
| `style`    | Formatting, whitespace — no logic change                |
| `test`     | Adding or updating tests                                |
| `docs`     | Documentation only (`.md` files, comments)              |
| `chore`    | Build process, tooling, dependency updates              |
| `revert`   | Reverting a previous commit                             |

**Scope:** Angular module or feature name in kebab-case (e.g. `module-editor`, `rack-parts`, `supabase`, `auth`). Omit
only if the change is truly cross-cutting.

**Rules:**

- Lowercase, imperative mood, no trailing period — `fix(auth): handle missing session token`
- One concern per commit — split unrelated changes across multiple commits
- Group by type in multi-change sessions: fixes together, refactors together, docs together
- Breaking changes: append `!` after type/scope and add `BREAKING CHANGE:` footer

**Examples:**

```
feat(module-browser): add "Others by manufacturer" section
fix(module-editor): remove duplicate backend call in savePhysical$
fix(components): remove readonly from @Input() causing TS2540 errors
refactor(module-browser): replace deprecated fxLayout with CSS classes
docs(product-needs): record Feb 19 autonomous bug fix sweep
chore(deps): upgrade Angular to 17.3
test(patch-detail): add privacy toggle integration tests
```

**Never:** ❌ Vague messages (`fix stuff`, `updates`, `WIP`) | ❌ Mix unrelated changes in one commit | ❌ Commit to `main`
directly | ❌ Stop before changes are commit-ready | ❌ Skip test run after a change | ❌ Skip cleanup pass before
finishing

---

### Code Quick Reference

```typescript
// Add observable stream
_newData$ = new BehaviorSubject<Type[]>([]);
public readonly
newData$ = this._newData$.asObservable();

// Add action
public
performAction$ = new Subject<Payload>();
// In constructor:
this.performAction$.pipe(
  switchMap(p => this.backend.call(p)),
  tap(r => this._newData$.next(r)),
  takeUntil(this.destroy$)
).subscribe();

// Success/error
SharedConstants.successSave(this.snackBar);
SharedConstants.errorCustom(this.snackBar, 'Failed');

// Template
<div class="col gap2" *ngIf="dataService.data$ | async as data">
  {
{data.name}
}
</div>
```

**Troubleshooting:**

- Observable not updating? Check `.next()` on BehaviorSubject, verify `takeUntil(this.destroy$)`
- Memory leaks? Verify extends `SubManager`, calls `super()`, all subscriptions have `takeUntil`
- Data not loading? Check action Subject triggered, backend call correct, user authenticated
- Styling issues? Use classes from `tools.scss`, avoid `!important`

## 📣 Communication

✅ Explain changes directly | ✅ Verify with error checking | ❌ **NO markdown summaries/reports**