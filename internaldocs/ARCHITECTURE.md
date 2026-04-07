# Architecture

> **Rules for AI agents using this file:**
> 1. **Structural reference only** — layers, service types, file layout, and state strategy.
> 2. **Code patterns belong in [PATTERNS.md](./PATTERNS.md)** — do not add code examples here.
> 3. **Enforcement rules → [../AGENTS.md](../AGENTS.md).**

> ⚠️ Architectural patterns are MANDATORY. See [../AGENTS.md](../AGENTS.md) for enforcement rules.

## Stack

- Angular 21 + TypeScript + RxJS
- Angular Material
- Supabase (PostgreSQL + Auth)
- SCSS

## Service Layers

```
Component (Presentation)
    ↓
Data Service (State + Logic)
    ↓
API Service (Backend)
    ↓
Supabase
```

### Data Services (`*-data.service.ts`)

- **Scoped to component**: `@Injectable()` (no `providedIn`)
- Manage BehaviorSubject state
- Handle business logic
- Extend `SubManager`
- Examples: `module-detail-data.service.ts`, `user-login-data.service.ts`

### API Services

- **Root singletons**: `@Injectable({ providedIn: 'root' })`
- Backend calls only
- Examples: `supabase.service.ts`, `user-management.service.ts`

## Key Pattern

> Full template with code → [PATTERNS.md — Data Service Template](./PATTERNS.md)

Summary:

- Private `_data$` BehaviorSubject, public `readonly data$` observable, public action Subjects (`loadData$`, etc.)
- All subscriptions initialized in constructor with `takeUntil(this.destroy$)`

## SubManager

- All components/services extend it
- Provides `destroy$` for cleanup
- Use `takeUntil(this.destroy$)` on all subscriptions

## File Structure

```
src/app/
├── components/          # Feature UI, grouped by category (module-parts, rack-parts, patch-parts, …)
├── features/            # Feature modules
│   ├── backbone/        # Auth, core
│   ├── backend/
│   │   ├── supabase.service.ts    # All backend calls (GET/get/add/update/delete namespaces)
│   │   └── DatabaseStrings.ts     # DbPaths (table names), QueryJoins (select joins) — register new tables here first
│   └── [features]/
├── models/              # TypeScript interfaces
├── shared-interproject/ # Shared utils
└── style/               # Global SCSS
```

```
src/backend/
└── database.types.ts    # Supabase-generated schema types — update when adding new tables
```

## State Management

- BehaviorSubject in data services (no NgRx)
- Observables as `readonly`
- Actions via Subjects
- Components use `async` pipe
