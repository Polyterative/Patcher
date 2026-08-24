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

---

## `catchError` Placement After a `switchMap` Chain Sourced From a Long-Lived Subject

Never put `catchError` **after** (outside) a chain of `switchMap`s whose source is a long-lived `Subject` used for
repeated future dispatches (e.g. a per-component action trigger). Nest `catchError` **inside** a single composed
`switchMap` projection instead.

```typescript
// wrong — an error from any inner switchMap unwinds the whole subscription,
//   including the Subject at the top of the pipe. The Subject's *future*
//   emissions are silently lost after the first failure — no amount of
//   re-emitting from the Subject will reach this pipe again without a page reload.
this.action$
  .pipe(
    switchMap((payload) => this.stepOne(payload)),
    switchMap((result) => this.stepTwo(result)),
    catchError((err) => this.handleError(err)),
    takeUntil(this.destroy$)
  )
  .subscribe();

// correct — catchError is nested inside a single composed switchMap projection,
//   so the error is caught and converted to a safe value before it can propagate
//   back up to (and kill) the Subject-sourced top of the pipe
this.action$
  .pipe(
    switchMap((payload) =>
      this.stepOne(payload).pipe(
        switchMap((result) => this.stepTwo(result)),
        catchError((err) => this.handleError(err))
      )
    ),
    takeUntil(this.destroy$)
  )
  .subscribe();
```

**Why it matters:** an outer `catchError` sits downstream of the entire operator chain, including the source
`Subject`. When any inner `switchMap` errors, RxJS unwinds the *whole* subscription to deliver the error to that
outer `catchError` — and unwinding a subscription tears down its upstream source too, even when that source is a
`Subject` normally expected to keep emitting for the rest of the component's lifetime. The practical symptom is a
mutation/action pipeline that silently stops responding to further user actions after exactly one failure, with no
error visible unless a page reload re-subscribes it from scratch. This was independently rediscovered three times in
one sweep (rack-delete, patch-delete, and the patch-connection sync chains) before being fixed at the source by
moving `catchError` inside a single composed `switchMap` projection, so an error is absorbed before it can reach the
Subject-sourced top of the pipe.

## Terminal Recovery Inside Flattening Operators

When `catchError` runs inside a flattening operator, return `EMPTY` or a terminal value after handling the error.
Do not return `NEVER`. `NEVER` permanently occupies the active inner slot and blocks later work.

Keep `exhaustMap` when the requirement is genuine in-flight duplicate suppression. The operator must release its
slot after the inner observable terminates, so the next request can retry after a failure.

For reset requests, the auth wrapper propagates the normalized error. The login data service owns inline error
state, loading settlement, and retry.
