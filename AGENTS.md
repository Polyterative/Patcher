# AGENTS.md

Unified operating guide for AI coding agents in this repository.

## 1) Authority and scope

- This file is the canonical instruction source for agent behavior in Patcher.
- If another agent-oriented doc conflicts with this file, follow `AGENTS.md`.
- Keep repo-specific rules here; keep deeper architecture, style, and product detail in `internaldocs/`.

## 2) Start-of-session routing

Start with this file, then load only the docs the task actually needs.

1. Read `internaldocs/workflow/CURRENT_FEATURE.md` only when the prompt is clearly about the current in-flight feature, asks to
   continue existing work, or references the active plan/task list.
2. For small one-off fixes, targeted refactors, or debugging, do not preload large planning docs unless they become relevant.
3. If more repo context is needed, open `internaldocs/README.md` first and then only the specific doc(s) that match the task.
4. When feature work does need planning, keep the agreed implementation state in `internaldocs/workflow/CURRENT_FEATURE.md`,
   archive the outcome to `internaldocs/workflow/COMPLETED.md`, and reset `CURRENT_FEATURE.md` when the feature is done.

## 3) Command policy

- Use `pnpm` and existing `package.json` scripts whenever possible.
- Prefer:
  - `pnpm test-headless`
  - `pnpm test-headless --include="**/foo.spec.ts"` for targeted runs
  - `pnpm test:e2e`
  - `pnpm test:e2e:auth`
  - `pnpm lint`
  - `pnpm updateBackendTypes`
  - `pnpm start` / `pnpm start:ssr` only when needed
- Do not use `npm install`, `ng test`, `npx ng test`, or watch/interactive variants unless the user explicitly asks.

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

## 8) Tools available beyond shell + edit

Agents in this repo have access to several MCP servers and an LSP. **Prefer these over
shelling out to `grep` / `find` / repeated `view` reads** — they are faster, more accurate,
and cheaper in tokens.

### Code search preference order

When you need to find code, use tools in this order (first match wins):

1. **LSP** (`typescript` server, configured in `.github/lsp.json`) — for *known symbols*:
   `goToDefinition`, `findReferences`, `incomingCalls`, `hover`, `documentSymbol`.
   Use this for "where is `SubManager` defined?", "who calls `addPatch`?",
   "rename `userId` → `userID`". File-scoped ops are reliable; `workspaceSymbol` may need
   a warmup query.
2. **cocoindex-code-search** (MCP, configured in `.github/mcp.json`) — for *concepts*:
   "find code that does X", "how is auth wired", "where do we cache rack lists".
   Indexed across 10.890+ TS chunks + 1.900 HTML/CSS/SQL/JS, embeddings are local
   (`snowflake-arctic-embed-xs`), daemon refreshes on save, zero API cost.
   Start with `limit: 5`, expand if needed. Use `paths` / `languages` filters to narrow.
3. **grep / glob** — only when 1 and 2 don't apply (e.g., literal string, log line, config
   value, regex). Always pair `grep` with a `glob` filter to keep it cheap.

### Other MCP servers

- **Sentry MCP** — use it instead of asking the user for stack traces. Trigger it whenever
  a bug report comes in or when working on `internaldocs/workflow/TODO.md` § Sentry.
- **Supabase MCP** — read-only inspection of the live DB (list tables, advisors, logs).
  **Never** use it to apply migrations, change RLS, or mutate data without explicit
  user approval (see §5 "Reuse and backend access").
- **GitHub MCP** — for PR / issue / Actions inspection without leaving the chat.

### When the tool list looks wrong

If you don't see one of the tools above in your environment, **say so to the user before
falling back to grep**. The MCP/LSP setup is intentional and a missing tool is a config
problem worth surfacing, not a silent fallback.

## 9) Specialised agent personas

When a task fits a known role (planning, UI polish, review, refactor, test-writing, bug
diagnosis), delegate to a sub-agent using the matching persona spec from
`internaldocs/agents/` as the system prompt. The index at `internaldocs/agents/README.md`
lists composition patterns (Plan → Build → Review, Bug fix, Refactor sweep, UI polish).

Two project-scoped Copilot CLI skills live in `.github/skills/`:

- **`patcher`** — auto-surfaces persona routing + tool preferences for normal dev work in this
  repo. Keep it in sync with `internaldocs/agents/`.
- **`ai-dlc`** — opt-in only. Loads the formal AWS AI-DLC phased workflow from
  `.aidlc-rule-details/` when the user explicitly asks for it.

## 10) Internal docs map

- `internaldocs/README.md` - doc index and routing
- `internaldocs/workflow/CURRENT_FEATURE.md` - active implementation details
- `internaldocs/workflow/TODO.md` - backlog and active tasks
- `internaldocs/workflow/COMPLETED.md` - completed feature archive
- `internaldocs/ARCHITECTURE.md`, `internaldocs/STYLE_GUIDE.md`, `internaldocs/product/PRINCIPLES.md`,
  `internaldocs/product/ROADMAP.md`, `internaldocs/patterns/REACTIVE_SERVICES.md`,
  `internaldocs/patterns/BACKEND_METHODS.md`, `internaldocs/patterns/UI_PATTERNS.md`,
  `internaldocs/testing/UNIT_TESTING.md` - deeper reference material
