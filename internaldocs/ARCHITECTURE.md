# Architecture

> **⚠️ These patterns are MANDATORY.** If you're an AI agent, read [FOR_AI_AGENTS.md](./FOR_AI_AGENTS.md) for
> enforcement rules.

## Stack

- Angular 18 + TypeScript + RxJS
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

```typescript

@Injectable()  // Component-scoped
export class MyDataService extends SubManager {
  private _data$ = new BehaviorSubject<Data[]>([]);
  public readonly data$ = this._data$.asObservable();
  public loadData$ = new Subject<void>();
  
  constructor(private backend: SupabaseService) {
    super();
    this.loadData$.pipe(
      switchMap(() => this.backend.getData()),
      tap(data => this._data$.next(data)),
      takeUntil(this.destroy$)  // Always
    ).subscribe();
  }
}
```

## SubManager

- All components/services extend it
- Provides `destroy$` for cleanup
- Use `takeUntil(this.destroy$)` on all subscriptions

## File Structure

```
src/app/
├── components/          # Reusable UI
├── features/            # Feature modules
│   ├── backbone/        # Auth, core
│   ├── backend/         # Backend services
│   └── [features]/
├── models/              # TypeScript interfaces
├── shared-interproject/ # Shared utils
└── style/               # Global SCSS
```

## State Management

- BehaviorSubject in data services (no NgRx)
- Observables as `readonly`
- Actions via Subjects
- Components use `async` pipe