---
name: patcher
description: Routing and tooling guide for development work in the Patcher repository (Angular 21 + RxJS + Supabase synth-rack app). Use this skill when the user asks for non-trivial dev work — planning, implementing components/services, reviewing changes, refactoring, writing tests, polishing UI, diagnosing bugs, or says "begin loop" / "run the loop" to start the coordinator-loop backlog automation. Points to specialised agent personas in internaldocs/agents/ and surfaces the LSP / cocoindex / Sentry / Supabase MCP tools configured in this repo. Skip for trivial questions or pure doc reads.
---

# Patcher — Agent Routing & Tooling

This skill is project-scoped — it only loads when working inside the Patcher repository, so no activation guard is needed.

## Canonical sources (read these, do not duplicate)

- `AGENTS.md` — repo-wide rules, command policy, layering, git policy
- `internaldocs/README.md` — doc index
- `internaldocs/agents/README.md` — full persona specs + composition patterns

## Persona quick-routing

When the user's request matches one of these, **delegate to a sub-agent** using the `task` tool (`agent_type: general-purpose` for most, `explore` for read-only investigations). Paste the corresponding persona file content from `internaldocs/agents/` into the prompt.

| User intent | Persona | Model | File |
|---|---|---|---|
| Rough feature idea / future work intake that should become a TODO-linked plan | **feature-notetaker** | `claude-opus-4.7` | `internaldocs/agents/feature-notetaker.md` |
| "Plan X", multi-step or cross-cutting work, ambiguous scope | **planner** | `claude-opus-4.7` | `internaldocs/agents/planner.md` |
| Hard ambiguous problem, high-risk decision, or explicit premium-model counsel request | **advisor** | `claude-opus-4.7` | `internaldocs/agents/advisor.md` |
| Implement Angular component / service / RxJS pipeline | **frontend-dev** | `gpt-5.5` | `internaldocs/agents/frontend-dev.md` |
| Design visual / spacing / responsive direction, UI structure, or product organization | **designer** | `claude-sonnet-4.6` | `internaldocs/agents/designer.md` |
| Review a diff / branch / PR before commit | **reviewer** | `gpt-5.4-mini` | `internaldocs/agents/reviewer.md` |
| Restructure code without changing behaviour | **refactorer** | `gpt-5.5` | `internaldocs/agents/refactorer.md` |
| Add unit / E2E test coverage | **test-writer** | `gpt-5.5` | `internaldocs/agents/test-writer.md` |
| Diagnose a defect to root cause | **bug-hunter** | `gpt-5.4` | `internaldocs/agents/bug-hunter.md` |
| "Begin loop", "run the loop", or run one full TODO → implementation → review → documentation cleanup cycle | **coordinator-loop** | `gpt-5.5` | `internaldocs/agents/coordinator-loop.md` |
| Boot a long-running autonomous loop driven by `agent/` and `internaldocs/workflow/` (replaces pasting a 10 KB mission prompt by hand) | **autonomous-engineer** | `gpt-5.5` | `internaldocs/agents/autonomous-engineer.md` |

**Model policy:** use `gpt-5.5` for coding-heavy executors (`frontend-dev`, `refactorer`, `test-writer`, `autonomous-engineer`), `claude-sonnet-4.6` for non-coding visual/structural design work, and `claude-opus-4.7` for planning and premium counsel. Use cheaper OpenAI models for read-heavy tasks: `gpt-5.4` for root-cause diagnosis and `gpt-5.4-mini` for diff review. Escalate review/diagnosis only for hard architecture, security, or data-loss risk.

**Composition flows:**

- Idea intake: `feature-notetaker` → backlog plan → `coordinator-loop` later
- New feature: `planner` → `frontend-dev` → `reviewer`
- Hard decision: normal investigation → `advisor` → appropriate executor
- Bug fix: `bug-hunter` → `frontend-dev` → `test-writer`
- Cleanup: `refactorer` → `reviewer`
- Visual: `designer` → `frontend-dev` → `reviewer`
- Backlog automation: `coordinator-loop` → executor persona → `reviewer` → docs cleanup

## Tooling that is configured but easy to miss

The repo has these wired up in `.github/` — **prefer them over `grep` / `find`**:

1. **LSP** (TypeScript, `.github/lsp.json`) — use the `lsp` tool for known symbols: `findReferences`, `goToDefinition`, `documentSymbol`, `incomingCalls`, `hover`. Reliable for file-scoped ops; `workspaceSymbol` may need a warmup query.
2. **cocoindex-code-search** MCP (`.github/mcp.json`) — semantic search across 10.890+ TS chunks, local embeddings (zero API cost), daemon refreshes on save. Use for *concept* queries ("how is auth wired", "where do we cache rack lists"). Start with `limit: 5`.
3. **Sentry MCP** — pull issue details directly; do not ask the user to paste stack traces.
4. **Supabase MCP** — **read-only inspection only** (list tables, advisors, logs). Never apply migrations / RLS changes without explicit user approval.
5. **GitHub MCP** — PR / issue / Actions inspection.

**Search order:** LSP (named symbols) → cocoindex (concepts) → grep+glob (literals only).

## Hard rules (copy from AGENTS.md, surfaced here for visibility)

- Package manager: `pnpm` only. Prefer `pnpm test-headless`, `pnpm lint`, `pnpm test:e2e:auth`, `pnpm updateBackendTypes`. Never `npm install`, `ng test`, or watch variants unless explicitly asked.
- Layering: `Component → Data Service → API Service → Supabase`. Backend access only through `SupabaseService`.
- Data services: `@Injectable()` component-provided. API services: `@Injectable({ providedIn: 'root' })`.
- Subscriptions: extend `SubManager`, use `takeUntil(this.destroy$)`, or `async` pipe in template.
- Naming: observables/subjects suffix `$`, private `BehaviorSubject` prefix `_`.
- New Supabase queries: explicit column lists (no `select('*')`), register table in `DatabaseStrings.ts` first, bust caches on writes.
- Git: branch `develop` is primary, never run `release:*` from `develop`. Ask before committing unless the user requested commits or invoked `coordinator-loop` / "begin loop", which commits verified checkpoints by design. Never push unless explicitly requested.
- **No `Co-authored-by` trailers** on commits in this repo.
- **No Supabase RLS / migration changes** without explicit human approval.

## When NOT to delegate

For one-liner edits, doc reads, or quick questions, do the work directly. Persona delegation has overhead — only use it when the task fits the persona's full workflow.
