# Golden Principles

> **Mechanical rules.** Each one is either lint-enforced today or has a tracked path to enforcement.
> If a rule lives only here, it is aspirational — promote it to a custom lint as soon as a violation hurts.
> Philosophy lives in [`product/PRINCIPLES.md`](./product/PRINCIPLES.md). This file is for the *how*.

## P1 — Layering is non-negotiable

`Component → Data Service → API Service → Supabase`. No skipping layers. Enforced by
`scripts/check-layering.cjs` (R1, R2, R3). Existing violations are grandfathered; new ones
fail `pnpm lint`.

## P2 — Files stay legible

`*.ts` files >500 lines warn, >1000 lines error (R4). Split before the warning becomes an
error. Large files are illegible to agents and humans alike.

## P3 — Backend access goes through `SupabaseService`

No component, no feature, no util reaches into Supabase directly. Register tables in
`DatabaseStrings.ts`, expose access through a backend method, bust caches on writes. See
[`patterns/BACKEND_METHODS.md`](./patterns/BACKEND_METHODS.md).

## P4 — Schema changes need a preflight

Before any migration, RLS change, or RPC change, read
[`patterns/BACKEND_METHODS.md` §"Schema-change preflight"](./patterns/BACKEND_METHODS.md#schema-change-preflight-read-before-writing-sql).
RLS / migrations require explicit human approval — the agent proposes, the human applies.

## P5 — Subscriptions clean up by construction

Components and component-scoped data services extend `SubManager`, call `super()`, and use
`takeUntil(this.destroy$)`. Prefer template `async` over manual subscriptions. Imperative
flow methods are a smell — emit through Subjects.

## P6 — Naming is mechanical

Observables / Subjects suffix `$`. Private `BehaviorSubject` prefix `_`. Data services
suffix `-data.service.ts` and live next to the component they belong to. API services live
under `src/app/features/backend/`.

## P7 — Boundaries get parsed, not validated

At every external boundary (Supabase response, URL param, form value, event payload), parse
the data into a typed shape; do not assume. Match the shape on its way in, not on its way
out.

## P8 — Caches are explicit, not implicit

Reads that hit Supabase get a cache key. Writes that change cached data bust **every**
invalidated key. Drift between read and write paths is the #1 source of "stale UI" Sentry
issues. See [`patterns/CACHE_STRATEGY.md`](./patterns/CACHE_STRATEGY.md).

## P9 — `px` is a smell in TypeScript

Use `rem`. Annotate intentional `px` (hairline borders, console styles, pixel coords) with a
trailing `// px-ok` comment. Enforced by `scripts/check-px-ts.sh` on staged files.

## P10 — Visual decisions are grounded

UI work is grounded in [`DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md). For visual fixes,
capture and inspect a real screenshot via
[`patcher-ui-debug` skill](../.github/skills/patcher-ui-debug/SKILL.md) before concluding.

## P11 — Plans carry their decision logs

Per-task detail and decision logs live in [`workflow/plans/<slug>.md`](./workflow/plans/).
Append-only timestamped one-liners for non-obvious choices, so the next agent run does not
relitigate them.

## P12 — Co-author trailers stay off

No `Co-authored-by: Copilot ...` or similar attribution lines on commits in this repo.
Commit messages follow `<type>(<scope>): <description>` in lowercase imperative.
