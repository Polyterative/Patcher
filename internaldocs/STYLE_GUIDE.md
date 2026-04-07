# Style Guide

> **Rules for AI agents using this file:**
> 1. **Naming, HTML conventions, SCSS layout, and project conventions** — that is the scope of this file.
> 2. **Full code templates (data service, toggle, form, error, API calls) → [PATTERNS.md](./PATTERNS.md).** Do not
     duplicate them here.
> 3. **Enforcement rules and checklists → [../AGENTS.md](../AGENTS.md).**

> ⚠️ These conventions are MANDATORY. AI agents must follow these patterns strictly.

## TypeScript Naming

| Type               | Convention | Example                    |
|--------------------|------------|----------------------------|
| Observable         | suffix `$` | `user$`, `isLoading$`      |
| Private Observable | `_` + `$`  | `private _state$`          |
| Action Subject     | suffix `$` | `submitForm$`, `loadData$` |

## Event-Driven Architecture

**All business logic happens through reactive event handlers in the constructor.**

Core principles (code examples in [PATTERNS.md](./PATTERNS.md)):

1. **Public Subjects for Actions** — Components emit events to Subjects
2. **Constructor-Based Handlers** — All subscriptions initialized in constructor
3. **No Public Methods** — Use event Subjects instead of methods
4. **Declarative Streams** — Chain operators to describe behavior

```typescript
// ✅ Component emits to Subject
onClick(): void {
  this.dataService.deleteItem$.next(itemId);
}

// ❌ Component calls method
onClick(): void {
  this.dataService.deleteItem(itemId); // WRONG
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
.auto-right // margin-right: auto
```

### Inline vs SCSS

✅ **Inline**: Single properties, dynamic values  
❌ **SCSS**: Multiple properties, hover states, repeated patterns

## Error Handling

```typescript
SharedConstants.successSave(snackBar);
SharedConstants.errorCustom(snackBar, 'Failed');
```

All messages in `SharedConstants.ts`. Full error state pattern → [PATTERNS.md](./PATTERNS.md).

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
// Paginated/filtered list queries → backend.GET namespace
this.backend.GET.modules(skip, take, name, orderBy)
this.backend.GET.manufacturers(0, 9999, 'id,name')

// Entity lookups and user-scoped queries → backend.get namespace
this.backend.get.patchWithId(id)
this.backend.get.currentUserPatches()
this.backend.get.rackedModules(rackId)

// Writes
this.backend.add.patch(data)
this.backend.update.module(data)
this.backend.delete.modulePanel(panel)
```

Full namespace table and new method guide → [PATTERNS.md — API Calls](./PATTERNS.md).

### Always

- ✅ Extend `SubManager`
- ✅ Use `takeUntil(this.destroy$)`
- ✅ Use `async` pipe
- ❌ Never subscribe without cleanup