# AGENTS.md

Unified operating guide for AI coding agents in this repository (Codex, Claude Code, and similar tools).

## 1) Authority and Scope

- This file is the canonical source for agent behavior in this repo.
- If this file conflicts with another agent-oriented doc, follow `AGENTS.md`.
- Keep internaldocs focused on domain knowledge (architecture, style, patterns, product), not duplicated process rules.

## 2) Session Workflow (Mandatory for Feature Work)

1. Read `internaldocs/CURRENT_FEATURE.md` first.
2. Analyze and propose an implementation plan.
3. Write/refresh the agreed plan in `internaldocs/CURRENT_FEATURE.md`.
4. Wait for explicit user approval before coding.
5. Implement in small, test-backed steps.
6. On completion: archive outcome to `internaldocs/COMPLETED.md` and reset `internaldocs/CURRENT_FEATURE.md` to template
   state.

For small, user-requested one-off fixes, the user may explicitly skip the gated planning flow.

## 3) Command Policy

Use `package.json` scripts whenever possible.

Recommended commands:

```bash
yarn test-headless                               # Unit tests (headless, no watch)
yarn test-headless --include="**/foo.spec.ts"   # Targeted spec run (if supported by runner)
yarn test:e2e                                    # Playwright e2e
yarn test:e2e:auth                               # Authenticated e2e
yarn lint                                        # ESLint
yarn updateBackendTypes                          # Regenerate Supabase types after schema changes
yarn start                                       # Dev server on :5556 (only if needed and not already running)
```

Never run directly:

- `ng test`, `npx ng test`, `npm install`
- watch/interactive commands unless the user explicitly asks
- ad hoc command variants when a script already exists

## 4) Tooling Principles (Cross-Agent)

- Prefer dedicated read/search/edit tools over generic shell for file operations.
- Use terminal commands for scripts, tests, git, and package operations.
- Use `yarn` as package manager.

Claude Code mapping (if relevant):

- Read files: `Read`
- Search: `Grep`
- Find files: `Glob`
- Edit/write: `Edit` / `Write`
- Terminal: `Bash` (for scripts/tasks only)

## 5) Architecture Guardrails

Stack: Angular 21 + TypeScript + RxJS, Angular Material, Supabase (PostgreSQL + Auth), SCSS.

Service layers:

```text
Component (presentation)
  -> Data Service (state + business logic, component-scoped)
  -> API Service (backend calls, root singleton)
  -> Supabase
```

Key paths:

- `src/app/components/[feature]/` - feature UI + co-located `*-data.service.ts`
- `src/app/features/backend/supabase.service.ts` - backend namespaces (`GET/get/add/update/delete`)
- `src/app/features/backend/DatabaseStrings.ts` - table names + select joins (register new tables first)
- `src/backend/database.types.ts` - generated Supabase schema types
- `src/app/shared-interproject/` - shared infra (`SubManager`, constants, app state)
- `src/app/style/tools.scss` - layout utility classes

## 6) Engineering Rules

### Injection scope

- Data services: `@Injectable()` (no `providedIn`) and provided at component level.
- API services: `@Injectable({ providedIn: 'root' })`.

### Subscription safety

- Components/services must extend `SubManager` and call `super()`.
- Every subscription must use `takeUntil(this.destroy$)`.
- Prefer template `async` pipe over manual component subscriptions.

### Event-driven pattern

- Keep business logic in reactive pipelines initialized from constructor wiring.
- Components emit through Subjects; avoid public imperative service methods for flows.
- Use `ReplaySubject<T>(1)` for entity-ID triggers with late subscribers.
- Use `Subject<void>` for refresh/submit/toggle events.

### Modular reusable UI logic

- For reusable UI blocks (example: Recent Activity), keep mapping/aggregation logic in a dedicated middle-layer service.
- Do not place reusable-block logic directly inside unrelated feature data services or container components.
- Host components should wire input/output streams only; reusable behavior stays self-contained in its own service +
  tests.

### Backend calls and caching

- Route all backend access through `SupabaseService`.
- New method checklist:
    1. Register table in `DatabaseStrings.ts` first.
    2. Reads: apply `@Cacheable` when appropriate.
    3. Writes: call `cacheBust([...keys])` for all invalidated keys.

### UI conventions

- Prefer inline UI state toggles (`BehaviorSubject<boolean>`) over dialog-driven flows.
- Use layout utility classes from `tools.scss`.
- Use shared notification helpers (avoid direct raw snackbar calls).

### Naming

- Observables/Subjects: `$` suffix.
- Private BehaviorSubjects: `_` prefix.

## 7) Quick Checklists

New data service:

- extends `SubManager`, calls `super()`
- `@Injectable()` without `providedIn`
- private `_` BehaviorSubjects + public readonly streams
- public action Subjects
- all subscriptions use `takeUntil(this.destroy$)`

New component:

- extends `SubManager`, calls `super()`
- provides its data service in component `providers`
- consumes data with `async` pipe
- uses layout classes (not ad hoc layout inline styles)

New backend method:

- table registered in `DatabaseStrings.ts`
- reads cacheable, writes bust cache
- run `yarn updateBackendTypes` after schema changes

Before commit:

- no dead code, commented blocks, unused imports
- naming conventions followed (`$`, `_`)
- no open `TODO`/`FIXME` left unintentionally

## 8) E2E Auth Setup

- Configure `.env` with `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` (dedicated test account).
- Auth setup writes state via `e2e/global-setup.ts` to `playwright/.auth/user.json`.
- CI must provide the same env vars for authenticated e2e.

## 9) Git and Delivery

- Primary working branch: `develop`; release branch: `production`.
- Use helper scripts when switching (`yarn switch:develop`, `yarn switch:production`).
- Commit format: `<type>(<scope>): <description>` (one line, imperative, lowercase, no trailing period).
- Ask before committing unless user explicitly requested automatic commit.
- Never push unless explicitly requested.
- Before staging, always inspect: `git status` and `git diff HEAD --stat`.

## 10) Agent Output and Context Preferences

### Test output

- Run tests with output trimmed to summary + failing file only — not full verbose logs.
- Example: `yarn test-headless 2>&1 | tail -60` or similar tight output.
- Use targeted `--include` flag when running a single spec to avoid reading unrelated results.

### Context compaction

- When compacting conversation context, keep **file references + short keywords** about future relevance — not code
  blocks.
- Prune context irrelevant to the current task (e.g., ignore CSS style rules when doing backend refactoring).

## 11) Internal Docs Ownership

- `internaldocs/CURRENT_FEATURE.md` - current in-flight implementation details
- `internaldocs/TODO.md` - backlog and active tasks
- `internaldocs/COMPLETED.md` - completed feature archive
- `internaldocs/PRODUCT_NEEDS.md` - product goals and strategy
- `internaldocs/PATTERNS.md` - canonical code templates
- `internaldocs/STYLE_GUIDE.md` - naming/HTML/SCSS conventions
- `internaldocs/ARCHITECTURE.md` - layering and structure reference
- `internaldocs/README.md` - wiki index