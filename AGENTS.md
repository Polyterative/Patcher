# AGENTS.md

Unified operating guide for AI coding agents in this repository.

## 1) Authority and scope

- This file is the canonical instruction source for agent behavior in Patcher.
- If another agent-oriented doc conflicts with this file, follow `AGENTS.md`.
- Keep repo-specific rules here; keep deeper architecture, style, and product detail in `internaldocs/`.

## 2) Start-of-session routing

Load docs lazily — only what the task needs.

- Read `internaldocs/workflow/CURRENT_FEATURE.md` only if the prompt continues in-flight feature work or references the active plan.
- For small fixes, targeted refactors, or debugging, skip planning docs.
- For more context, open `internaldocs/README.md` first, then the specific file(s) that match the task.
- During feature work: keep agreed state in `CURRENT_FEATURE.md`; on completion, archive to `COMPLETED.md` and reset `CURRENT_FEATURE.md`.

## 3) Command policy

- Package manager: `pnpm` only; use existing `package.json` scripts.
- Preferred: `pnpm lint`, `pnpm test-headless` (add `--include="**/foo.spec.ts"` to target), `pnpm test:e2e` / `pnpm test:e2e:auth`, `pnpm updateBackendTypes`. Use `pnpm start` / `start:ssr` only when needed.
- Never run `npm install`, `ng test`, `npx ng test`, or any watch/interactive variant unless the user explicitly asks.

## 4) Architecture guardrails

Stack: Angular 21 + TypeScript + RxJS + Angular Material + Supabase + SCSS.

Layering:

```text
Component -> Data Service -> API Service -> Supabase
```

Key paths:

- `src/app/components/[category]/[feature]/` - feature UI and co-located `*-data.service.ts`
- `src/app/features/backend/supabase.service.ts` - backend namespaces (`GET/get/add/update/delete`)
- `src/app/features/backend/DatabaseStrings.ts` - register tables and joins before adding backend methods
- `src/backend/database.types.ts` - generated Supabase types
- `src/app/shared-interproject/` - shared infra such as `SubManager`
- `src/app/style/tools.scss` - shared layout utilities

## 5) Engineering rules

### Injection and state

- Data services use `@Injectable()` without `providedIn` and are provided at component level.
- API services use `@Injectable({ providedIn: 'root' })`.
- Components and data services extend `SubManager`, call `super()`, and use `takeUntil(this.destroy$)` for subscriptions.
- Prefer template `async` pipes over manual component subscriptions.

### Reactive flow

- Keep business logic in reactive pipelines wired from the constructor.
- Components emit through Subjects instead of imperative public flow methods.
- Use `ReplaySubject<T>(1)` for entity identity triggers and `Subject<void>` for refresh/submit/toggle events.

### Reuse and backend access

- Keep reusable UI-block logic in dedicated middle-layer services, not unrelated feature services or containers.
- Route backend access through `SupabaseService`.
- **Before any schema / migration / RPC change, read [`internaldocs/patterns/BACKEND_METHODS.md` §"Schema-change preflight"](internaldocs/patterns/BACKEND_METHODS.md#schema-change-preflight-read-before-writing-sql).** It lists past mistakes (e.g., backfill UPDATEs wiping `updated` timestamps) and the mitigations.
- Never make Supabase RLS/policy changes without explicit manual user approval. Agents may inspect and propose RLS changes, but
  must not apply them autonomously.
- Before a new backend method: register the table in `DatabaseStrings.ts`; make reads cacheable when appropriate; bust all
  invalidated cache keys after writes.
- Run `pnpm updateBackendTypes` after schema changes.

### UI and naming

- Prefer inline UI state toggles (`BehaviorSubject<boolean>`) over dialog-heavy flows.
- Use layout helpers from `tools.scss` and shared notification helpers.
- Observables/Subjects use a `$` suffix; private `BehaviorSubject`s use an `_` prefix.
- For visual UI fixes or responsive-layout tweaks, capture and inspect real screenshots with Playwright before concluding the work.
- All visual decisions must be grounded in [`internaldocs/DESIGN_LANGUAGE.md`](internaldocs/DESIGN_LANGUAGE.md) — the canonical design philosophy, character, inspirations, and anti-patterns for Patcher.

## 6) Git and delivery

- Primary branch: `develop`. Release branch: `production`.
- Use helper scripts such as `pnpm switch:develop`, `pnpm switch:production`, and `pnpm merge:dev-to-prod`.
- Commit format: `<type>(<scope>): <description>` in one line, imperative, lowercase, no trailing period.
- Do not add `Co-authored-by` trailers or Copilot attribution lines to commits in this repository.
- Ask before committing unless the user explicitly requested a commit.
- Never push unless the user explicitly requested it.
- Never run `release:*` from `develop`.

## 7) Output and context preferences

- Keep test output trimmed to the summary and failing file(s), not full verbose logs.
- Prefer targeted test runs when possible.
- When compacting context, keep file references and short keywords, not large code blocks.
- Do not preload large repo docs unless the current task needs them.

## 8) Tools beyond shell + edit

This repo has an LSP and several MCP servers wired up (`.github/lsp.json`, `.github/mcp.json`). **Prefer them over `grep` / `find` / repeated `view` reads.**

Code search order (first match wins):

1. **LSP** (TypeScript) — known symbols: `goToDefinition`, `findReferences`, `incomingCalls`, `documentSymbol`, `hover`, `rename`. `workspaceSymbol` may need a warmup query.
2. **cocoindex-code-search** MCP — concept queries ("how is auth wired", "where do we cache rack lists"). Local embeddings, zero API cost, auto-refreshes. Start with `limit: 5`; filter with `paths` / `languages`.
3. **grep + glob** — only for literals, log lines, config values, regex. Always pair `grep` with a `glob` filter.

Other MCPs:

- **Sentry** — pull issue details directly instead of asking the user for stack traces.
- **Supabase** — **read-only** inspection (tables, advisors, logs). Never migrate / change RLS / mutate without explicit user approval (see §5).
- **GitHub** — PR / issue / Actions inspection.

If any of these tools is missing from your environment, surface it to the user before falling back to `grep` — it's a config problem, not a silent fallback.

## 9) Specialised agent personas

For known roles (planning, UI polish, review, refactor, test-writing, bug diagnosis), delegate to a sub-agent using the matching persona spec from `internaldocs/agents/` as the system prompt. `internaldocs/agents/README.md` has the full index plus composition patterns (Plan → Build → Review, Bug fix, Refactor sweep, UI polish).

Project-scoped Copilot CLI skills in `.github/skills/`:

- **`patcher`** — auto-surfaces persona routing + tool preferences for normal dev work. Keep in sync with `internaldocs/agents/`.
- **`ai-dlc`** — opt-in only. Loads the AWS AI-DLC phased workflow from `.aidlc-rule-details/` on explicit request.

## 10) Internal docs map

Start at `internaldocs/README.md` (full index). Most-used:
`workflow/CURRENT_FEATURE.md`, `workflow/TODO.md` (thin index), `workflow/plans/<slug>.md` (per-task detail + decision log), `workflow/COMPLETED.md`,
`ARCHITECTURE.md`, `STYLE_GUIDE.md`, `patterns/REACTIVE_SERVICES.md`,
`patterns/BACKEND_METHODS.md`, `patterns/UI_PATTERNS.md`, `testing/UNIT_TESTING.md`,
`product/PRINCIPLES.md`, `product/ROADMAP.md`.

## 11) Mechanical guardrails (custom lints)

These run as part of `pnpm lint`. Read the error message — each lint is written
to tell you exactly how to fix the violation, and points at the canonical doc.

- `scripts/check-layering.cjs` — enforces `Component → Data Service → API Service → Supabase`.
  - **R1** Components must not import `SupabaseService` directly — use a co-located `*-data.service.ts`.
  - **R2** Files outside `features/backend/` must not import `DatabaseStrings`.
  - **R3** API services must not depend on component-scoped data services.
  - **R4** `*.ts` files >500 lines warn, >1000 lines error. Split.
  - Existing violations are grandfathered in `scripts/.layering-baseline.json`.
    Refactor to remove entries; update the baseline only with explicit justification
    (`node scripts/check-layering.cjs --update-baseline`).
- `scripts/check-route-module-imports.cjs` — `RouterModule.forRoot()` only in `app-routing.module.ts`; lazy-loaded route modules cannot be imported as shared UI.
- `scripts/check-px-ts.sh` — hardcoded `px` in `*.ts` (use `rem`; annotate intentional `px` with `// px-ok`).
