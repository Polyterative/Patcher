# RxJS Gotchas

> Small but important reactive edge cases that are easy to forget.

---

## Operator Ordering — `startWith` + `distinctUntilChanged`

Always place `startWith(value)` **before** `distinctUntilChanged()`, never after.

```typescript
// correct — initial value is subject to deduplication
source$.pipe(
  map(computeValue),
  startWith(false),
  distinctUntilChanged(),
  shareReplay(1)
);

// wrong — startWith emits its value after distinctUntilChanged, bypassing dedup
//   Late subscribers see a redundant extra emission
source$.pipe(
  map(computeValue),
  distinctUntilChanged(),
  startWith(false),
  shareReplay(1)
);
```

**Why it matters:** `startWith` prepends its value synchronously on subscription, after all upstream operators have
already run. Placing it after `distinctUntilChanged` means the sentinel value is never deduplicated — subscribers
receive a spurious extra emission when the computed value matches the sentinel.
