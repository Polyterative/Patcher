# Auth resilience

## Goal

Restore reliable authentication retries and session-bound recovery flows without changing the production backend contract.

## Layers

### MVP

- [x] S1 auth-request retry implemented and committed as `dc6afca6`.
- [x] S2 recovery-session integrity implemented and independently QA-PASS.
- [x] S3 OAuth callback settlement committed as `83227c2c`.
- [ ] S4 destructive-action retry.

### Structural

- [x] Preserve `Component → Data Service → API Service → Supabase` layering.
- [x] Keep recovery proof browser-only and fail closed.

### Polish

- [ ] Complete remaining slices and archive the plan after coordinator commits each validated slice.

## S2 status

S2 — Recovery session integrity is implemented, independently reviewed, QA-PASS, and committed as `083b549a`. No production publication or public availability is claimed.

### Durable decisions

- The recovery marker is tab-scoped `sessionStorage` and contains only `{ userId, sessionId, createdAt }`; its TTL is 30 minutes. Corrupt, inaccessible, mismatched, or expired markers fail closed and never throw.
- `session_id` is extracted from the access-token JWT payload without verification and is the stable live-session binding; it remains valid across access-token refreshes. Missing, empty, or malformed claims fail closed.
- Centralized recovery events use a 15-second freshness bound. Stale replay cannot restart the marker TTL or restore an unrelated later visit.
- The initial `BehaviorSubject(null)` state is not treated as sign-out. Only a later observed `null`/`SIGNED_OUT` clears the durable marker.
- Invalid-link settlement is lifecycle-aware: it waits for SDK auth initialization to settle plus one deterministic macrotask tick, rather than racing with a fixed wall-clock timeout.
- Successful verification scrubs query credentials only from the current attempt's own successful result via `history.replaceState`; it does not navigate or scrub on aggregate/replayed state.
- Verification, restore, and recovery listeners are browser-only at both component and data-service boundaries; SSR has no recovery side effects.
- Sign-out and successful password update clear the durable marker; failed or expired verification never writes one.

## Validation evidence

- Focused S2: 80 passing.
- Broader auth validation: 773 passing.
- Final `pnpm test-headless`: 5,325 passing, 5,326 total, one pre-existing skip.
- `pnpm lint`, `pnpm lint:styles`, production SSR `pnpm build`, reduced-motion Chromium E2E, and `git diff --check` are green.
- No real recovery token was available; valid-token, reload, back/forward, scrub, SSR, and timing-sensitive behavior are covered by deterministic unit/component tests and bounded runtime evidence.

## Non-blocking follow-ups

- `supabase-auth.ts` has a soft file-size warning; do not fix in S2.
- The already-committed S1 `login-page.component.scss` reduced-motion gap remains; do not fix in S2.

## S3 status

S3 — OAuth callback settlement is implemented, independently reviewed,
QA-PASS, and committed as `83227c2c`.
S4 — destructive-action retry is next. No production publication or public
availability is claimed.

### Durable S3 behavior

- OAuth callback settlement has a total callback timeout, so a callback that
  never produces an auth session reaches a deterministic terminal outcome.
- Failure is published through the typed failure stream and rendered as an
  explicit `Failed` terminal state.
- Once `AuthCallbackComponent` observes `Failed`, a late session/profile event
  cannot navigate away from the terminal failure UI.
- Duplicate callback actions emitted while one attempt is active are suppressed
  with `exhaustMap`; the slot reopens after success, failure, null-session, or
  timeout terminal outcomes so the next distinct action can run.

## Decision log

- 2026-08-24 — Adopt the tab-scoped non-secret marker, stable JWT `session_id` binding, freshness/TTL bounds, lifecycle-aware settlement, own-result URL scrub, browser-only SSR boundary, and durable clear behavior described above.
- 2026-08-24 — Commit S2 as `083b549a` after independent review and QA PASS.
- 2026-08-24 — Repair S3 review findings: latch terminal Failed in
  `AuthCallbackComponent` (component-side, guards `loggedUserFullProfile$`
  navigation on `!hasSettledToFailed`) and switch
  `UserManagementAuthFlowService`'s OAuth callback handler from `switchMap` to
  `exhaustMap` so duplicate in-flight actions are suppressed instead of
  cancelling/restarting the backend call. Added 10 regression tests across
  the component and service specs, all written failing-first.
- 2026-08-24 — Commit S3 as `83227c2c` after independent review and QA PASS.
  The durable contract includes total callback timeout,
  explicit Failed terminal state, late-session navigation latch,
  exhaustMap duplicate suppression, slot reopening after every terminal
  outcome, and typed failure publication.

## S3 validation evidence

- Focused S3: 56 passing.
- Broader auth validation: 505 passing.
- Full `pnpm test-headless`: 5,339 passing, 5,340 total, one pre-existing skip.
- `pnpm lint`, `pnpm lint:styles`, production SSR `pnpm build`, auth smoke E2E,
  and `git diff --check` are green.

## Documentation impact

- Classification: internal-only
- Production visibility: operator-gated
- Public docs paths: none
- Screenshot targets: none
- Changelog summary: N/A
