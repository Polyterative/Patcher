# Unit Testing Guide

> Shared test conventions and examples for this codebase.

---

## Writing Tests

All tests use **Jasmine + Karma** via `pnpm test-headless`. Follow the shared `test-setup.ts` pattern used throughout
the codebase.

### Spec file location

Co-locate simple specs with the file being tested:

```
src/app/components/patch-parts/patch-connection-stats.spec.ts   ← unit test next to the pipe
```

For service suites with multiple concerns, use a `__tests__/<service-name>/` subdirectory with a shared `test-setup.ts`:

```
src/app/features/backend/__tests__/supabase-service/
  test-setup.ts          ← shared setup/teardown + mock data
  api-surface.spec.ts    ← method existence checks
  caching.spec.ts        ← cache behaviour
  pattern-compliance.spec.ts
```

### Shared test-setup pattern

```typescript
// test-setup.ts
import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { MyService } from './my.service';
import { SupabaseService } from 'src/app/features/backend/supabase.service';


export function setupMyServiceTest() {
  const mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
  const mockBackend = {
    get: {
      someData: jasmine.createSpy().and.returnValue(of([]))
    },
    add: {
      item: jasmine.createSpy().and.returnValue(of({data: {id: 1}, error: null}))
    }
  };
  
  TestBed.configureTestingModule({
    providers: [
      MyService,
      {provide: MatSnackBar, useValue: mockSnackBar},
      {provide: SupabaseService, useValue: mockBackend}
    ]
  });
  
  return {
    service: TestBed.inject(MyService),
    mockSnackBar,
    mockBackend
  };
}

export function cleanupMyServiceTest() {
  TestBed.resetTestingModule();
}
```

### Spec file structure

```typescript
import {
  setupMyServiceTest,
  cleanupMyServiceTest
} from './test-setup';
import { MyService } from './my.service';


describe('MyService', () => {
  let service: MyService;
  
  beforeEach(() => {
    const setup = setupMyServiceTest();
    service = setup.service;
  });
  
  afterEach(() => cleanupMyServiceTest());
  
  describe('API surface', () => {
    it('should expose loadData$ Subject', () => {
      expect(service.loadData$).toBeDefined();
      expect(typeof service.loadData$.next).toBe('function');
    });
    
    it('should expose data$ Observable', () => {
      expect(service.data$).toBeDefined();
      expect(typeof service.data$.subscribe).toBe('function');
    });
  });
  
  describe('loadData$ handler', () => {
    it('should call backend.get.someData when triggered', () => {
      // trigger
      service.loadData$.next();
      // assert
      expect(/* mockBackend.get.someData */).toHaveBeenCalled();
    });
  });
});
```

### What to test (minimum bar)

1. **API surface** — every public Subject and Observable exists and has the right type (`next` for Subjects, `subscribe`
   for Observables).
2. **Handler wiring** — triggering the action Subject causes the expected backend call.
3. **State update** — after a backend call resolves, the BehaviorSubject has the correct value.
4. **Error path** — if the backend returns an error, the service doesn't crash and shows the right snackbar.

### Run a single spec file

```
pnpm test-headless --include="**/my-service.spec.ts"
pnpm test-headless --include="**/__tests__/supabase-service/*.spec.ts"
```

## Transition regression contracts

Test asynchronous UI transitions at the state boundaries that users can observe.

- Control pending backend work with a `Subject`, then assert optimistic state before persistence resolves.
- Resolve the backend response, then assert persisted identity and any refetched state.
- Seed existing state before testing rollback, so a failed mutation cannot pass by wiping the state.
- For queued writes, assert call order, per-call arguments, state reconciliation, and recovery after a failed earlier write.
- Record characterization tests when the implementation already satisfies the contract and the slice changes no production code.
