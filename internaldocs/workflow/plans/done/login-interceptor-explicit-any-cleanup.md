<!-- Section: INFRA (independent; pick any time a product task is blocked) -->

# Login interceptor explicit-any cleanup

## Goal

Remove the small explicit-`any` cluster in the login HTTP interceptors without changing request handling, authentication behavior, or error propagation.

## Layers

### MVP

- [x] Replace untyped interceptor request and event generics with safe `unknown` equivalents.
- [x] Preserve current successful, unauthenticated, and authorization-error behavior in focused specs.

### Structural

- [x] Re-baseline the explicit-`any` tracker only after the targeted reduction is verified.

### Polish

- [x] Archive this maintenance slice with validation evidence and no public documentation change.

## Acceptance criteria

- Both interceptors expose `HttpRequest<unknown>` and `Observable<HttpEvent<unknown>>` contracts.
- Existing request pass-through and authorization-error handling retain their behavior.
- The explicit-`any` baseline drops by at least four without adding new entries.
- Focused interceptor specs and `pnpm lint` pass.

## Documentation impact

- Classification: internal-only
- Production visibility: immediate
- Public docs paths: none
- Screenshot targets: none
- Changelog summary: N/A

## Decision log

- 2026-07-25: Chose the two login interceptors as the smallest independently safe explicit-`any` fallback cluster identified by `pnpm loop:health`; the active Public Open API release remains owner-gated and unchanged.
- 2026-07-25: The generated baseline fell from 648 to 642: the intended interceptor cleanup removed four occurrences, and the script also removed two stale entries for an already-clean screenshot spec. The tracker is generated mechanically, so the full verified decrease is retained.
- 2026-07-25: Focused interceptor specs passed (11 assertions), the independent reviewer approved with no findings, and `pnpm lint` passed with only pre-existing warnings.
