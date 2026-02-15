# Patcher Internal Wiki

Project-specific guidelines for Patcher development.

## Files

- **[FOR_AI_AGENTS.md](./FOR_AI_AGENTS.md)** - ⚠️ **MANDATORY for AI coding agents**
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Service layers, project structure, key patterns
- **[STYLE_GUIDE.md](./STYLE_GUIDE.md)** - TypeScript, HTML, SCSS conventions
- **[PATTERNS.md](./PATTERNS.md)** - Common code patterns and templates

## Quick Start

### Key Principles

1. All services/components extend `SubManager`
2. Data services are component-scoped (`@Injectable()`)
3. Always use `takeUntil(this.destroy$)` on subscriptions
4. Use `async` pipe in templates
5. State management via BehaviorSubject
6. User messages via `SharedConstants`

### Typical Flow

```
Component → Data Service → API Service → Supabase
```

### Essential Pattern

```typescript
@Injectable()
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

## Contributing

This is a living wiki. Update when patterns evolve or new conventions emerge.