# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## MANDATORY: First action every session

**Read `internaldocs/CURRENT_FEATURE.md` before doing anything else.** No exceptions.

## Session Start

**Workflow is strictly gated — do not skip phases:**

1. **Read** `internaldocs/CURRENT_FEATURE.md` — understand active work before touching anything.
2. **Plan & analyse** — explore relevant files with tools, form a complete implementation plan, discuss it with the user.
3. **Update `CURRENT_FEATURE.md`** — write the agreed plan (layers, steps, gotchas) into the file. Wait for user sign-off.
4. **Code** — only after the plan is written and confirmed. Work until commit-ready; run tests after every meaningful change.
5. **On completion** — archive to `COMPLETED.md`, reset `CURRENT_FEATURE.md` to empty template.

**The user's workflow: plan → write plan into `CURRENT_FEATURE.md` → wait for explicit user confirmation → then and only then execute.**

**Never write a single line of code before the user has explicitly confirmed the plan in `CURRENT_FEATURE.md`.**

## Commands

```bash
yarn test-headless                               # Run all tests (headless, no watch)
yarn test-headless --include="**/foo.spec.ts"   # Run a single spec file
yarn test:e2e                                    # Playwright e2e (env already running — never start it yourself)
yarn lint                                        # ESLint
yarn updateBackendTypes                          # Regenerate Supabase types after schema change
yarn start                                       # Dev server on :5556 (don't start if already running)
```

**Never:** `ng test` · `npx ng test` · `npm install` · any watch/interactive command · start dev server before e2e.
Always use `package.json` scripts.

## Architecture

Angular 21 + TypeScript + RxJS · Angular Material · Supabase (PostgreSQL + Auth) · SCSS

### Service Layers

```
Component (Presentation)
    ↓
Data Service (*-data.service.ts) — state + business logic, component-scoped
    ↓
API Service (supabase.service.ts) — backend calls only, root singleton
    ↓
Supabase
```

### Key File Locations

```
src/app/components/[feature]/       # Feature components + co-located *-data.service.ts
src/app/features/backend/
  supabase.service.ts               # All backend calls (GET/get/add/update/delete namespaces)
                                    # Also defines CachedEntity union type for cache keys
  DatabaseStrings.ts                # DbPaths (table names) + QueryJoins (select joins)
                                    # — register new tables here FIRST
src/app/models/                     # TypeScript interfaces
src/app/shared-interproject/        # SubManager, SharedConstants, AppStateService
src/backend/database.types.ts       # Supabase-generated schema types
src/app/style/tools.scss            # Layout utility classes (.row, .col, .gap1 …)
```

Reference implementations: `patch-detail-data.service.ts` · `module-detail-data.service.ts` · `rack-detail-data.service.ts`

### State Management

- BehaviorSubject in data services — no NgRx
- Observables exposed as `readonly`; actions via Subjects
- Components consume via `async` pipe only

## Critical Rules

### Service Injection Scope

- Data services: `@Injectable()` — **no `providedIn`** — provided in `@Component({ providers: [...] })`
- API services: `@Injectable({ providedIn: 'root' })`

### Subscription Management

- Every component/service **must extend `SubManager`** and call `super()` in constructor
- Every subscription **must use `takeUntil(this.destroy$)`**
- Prefer `async` pipe in templates — avoid manual subscriptions in components

### Event-Driven Architecture

- All business logic in the constructor via reactive streams
- Components emit to public Subjects (`.next()`) — never call service methods
- `ReplaySubject<T>(1)` for entity-ID triggers (detail pages — late subscribers replay the ID)
- `Subject<void>` for list refreshes and form submits

### Backend Calls

Always through `SupabaseService` — never instantiate Supabase directly:

| Namespace | Use |
|-----------|-----|
| `backend.GET.*` | Paginated / filtered list queries |
| `backend.get.*` | Entity lookups, user-scoped queries |
| `backend.add.*` / `update.*` / `delete.*` | Writes |

New method checklist:
1. Register table name in `DatabaseStrings.ts` first
2. Reads: add `@Cacheable`
3. Writes: add `cacheBust([...keys])` after success — bust every invalidated key

Internal pipe helpers in `supabase.service.ts`: `cacheBust(keys)` · `catchErrors(snackBar)` · `showSuccessMessage(snackBar)`

### UI Rules

- Inline UI with `BehaviorSubject<boolean>` toggles — no dialogs (`this.dialog.open(...)` is wrong)
- Layout via `.row`, `.col`, `.gap1` etc. from `tools.scss` — no inline styles for layout
- Never call `snackBar.open()` directly — use `SharedConstants` methods

### Naming

| Type | Convention |
|------|------------|
| Observable / Subject | `$` suffix — `data$`, `loadData$` |
| Private BehaviorSubject | `_` prefix — `private _state$` |

## Checklists

**New Data Service:**
- `extends SubManager`, `super()` in constructor · `@Injectable()` no `providedIn`
- Private `_` BehaviorSubjects · public `readonly` observables · public action Subjects
- All subscriptions `takeUntil(this.destroy$)` · `ReplaySubject` for entity-ID triggers

**New Component:**
- `extends SubManager`, `super()` · provides data service in `@Component({ providers: [...] })`
- `async` pipe in template · layout classes from `tools.scss` · no inline styles

**New Backend Method:**
- Table in `DatabaseStrings.ts` · write has `cacheBust([...keys])` · read has `@Cacheable`
- Run `yarn updateBackendTypes` if schema changed

**Pre-finish (before every commit):**
- No dead code / unused imports / commented-out blocks
- `$` suffix all observables · `_` prefix all private BehaviorSubjects
- All subscriptions `takeUntil(this.destroy$)` · no `destroyEvent$` · no open `TODO`/`FIXME`

## Common Mistakes

- `@Injectable({ providedIn: 'root' })` on a data service
- `Subject` instead of `ReplaySubject` for entity-ID triggers — late subscribers miss the emit
- New backend write without `cacheBust([...keys])` — stale cache
- New backend method without registering table in `DatabaseStrings.ts` first
- `destroyEvent$` — legacy; use `destroy$` from `SubManager`
- Staging files without checking `git status` first — user commits between sessions; always verify what is actually
  uncommitted before `git add`

## Git

**Branching:** work on `develop`; `production` is the release branch. Use `yarn switch:develop` / `yarn switch:production` to switch.

**Commit style:** one line only — no body. Format: `<type>(<scope>): <description>` — lowercase, imperative, no trailing period, one concern per commit. Scope must be the user-facing area affected (e.g. `module-browser`, `patch-editor`, `rack-details`).

Examples:
- `feat(module-browser): add sidebar layout with filters and reset button`
- `fix(patch-editor): resolve unsaved changes warning by implementing auto-save`

Types: `feat` · `fix` · `docs` · `style` · `refactor` · `perf` · `test` · `chore`

**Always ask before committing** unless the user has explicitly said to commit. **Never push** — the user handles that.

**Before staging:** always run `git status` + `git diff HEAD --stat` first. The user commits between context switches —
files you modified may already be in HEAD. Only stage files that are actually modified. Staging already-committed files
wastes time and produces empty commits.

**When explicitly told to commit (e.g. "commit automatically if tests pass"):** do it immediately without asking again.
Run tests, then stage only the relevant new files and commit.

## Communication

- Explain changes directly and concisely
- No markdown summaries, reports, or reference guides unless explicitly requested

## Internal Docs

| File | Purpose |
|------|---------|
| `internaldocs/FOR_AI_AGENTS.md` | Workflow rules — read first |
| `internaldocs/ARCHITECTURE.md` | Layer and structure reference |
| `internaldocs/PATTERNS.md` | Canonical code templates — copy exactly |
| `internaldocs/STYLE_GUIDE.md` | Naming, HTML, SCSS conventions |
| `internaldocs/CURRENT_FEATURE.md` | Active feature — update as you work |
| `internaldocs/TODO.md` / `COMPLETED.md` | Backlog and archive |
| `internaldocs/PRODUCT_NEEDS.md` | Product goals and strategy |