# Style Guide

> **Rules for AI agents using this file:**
> 1. **Naming plus HTML/SCSS conventions only** — keep implementation patterns out of this file.
> 2. **Full code templates live in the split pattern docs** — do not duplicate them here.
> 3. **Enforcement rules and checklists → [../AGENTS.md](../AGENTS.md).**

> ⚠️ These conventions are MANDATORY. AI agents must follow these patterns strictly.

## TypeScript Naming

| Type               | Convention | Example                    |
|--------------------|------------|----------------------------|
| Observable         | suffix `$` | `user$`, `isLoading$`      |
| Private Observable | `_` + `$`  | `private _state$`          |
| Action Subject     | suffix `$` | `submitForm$`, `loadData$` |

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

Implementation patterns such as reactive event wiring, backend namespace usage, inline UI toggles, and shared error
handling live in the split pattern docs.
