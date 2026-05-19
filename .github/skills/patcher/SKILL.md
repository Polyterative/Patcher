---
name: patcher
description: Routing and tooling guide for development work in the Patcher repository (Angular 21 + RxJS + Supabase synth-rack app). Use this skill when the user asks for non-trivial dev work — planning, implementing components/services, reviewing changes, refactoring, writing tests, polishing UI, or diagnosing bugs. Points to specialised agent personas in internaldocs/agents/ and surfaces the LSP / cocoindex / Sentry / Supabase MCP tools configured in this repo. Skip for trivial questions or pure doc reads.
---

# Patcher — Agent Routing & Tooling

This skill is project-scoped — it only loads when working inside the Patcher repository, so no activation guard is needed.

## Canonical sources (read these, do not duplicate)

- `AGENTS.md` — repo-wide rules, command policy, layering, git policy
- `internaldocs/README.md` — doc index
- `internaldocs/agents/README.md` — full persona specs + composition patterns

## Persona quick-routing

When the user's request matches one of these, **delegate to a sub-agent** using the `task` tool (`agent_type: general-purpose` for most, `explore` for read-only investigations). Paste the corresponding persona file content from `internaldocs/agents/` into the prompt.

| User intent | Persona | File |
|---|---|---|
| "Plan X", multi-step or cross-cutting work, ambiguous scope | **planner** | `internaldocs/agents/planner.md` |
| Hard ambiguous problem, high-risk decision, or explicit premium-model counsel request | **advisor** | `internaldocs/agents/advisor.md` |
| Implement Angular component / service / RxJS pipeline | **frontend-dev** | `internaldocs/agents/frontend-dev.md` |
| Fix visual / spacing / responsive issue, UI polish | **designer** | `internaldocs/agents/designer.md` |
| Review a diff / branch / PR before commit | **reviewer** | `internaldocs/agents/reviewer.md` |
| Restructure code without changing behaviour | **refactorer** | `internaldocs/agents/refactorer.md` |
| Add unit / E2E test coverage | **test-writer** | `internaldocs/agents/test-writer.md` |
| Diagnose a defect to root cause | **bug-hunter** | `internaldocs/agents/bug-hunter.md` |

**Model policy:** operational personas, including `planner`, run on default/Sonnet-class models (`planner`: `claude-sonnet-4.6`). The only premium-model persona is `advisor`, used as a fast general counselor for hard problems; it must not edit files or execute implementation work.

**Composition flows:**

- New feature: `planner` → `frontend-dev` → `reviewer`
- Hard decision: normal investigation → `advisor` → appropriate executor
- Bug fix: `bug-hunter` → `frontend-dev` → `test-writer`
- Cleanup: `refactorer` → `reviewer`
- Visual: `designer` → `reviewer`

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
- Git: branch `develop` is primary, never run `release:*` from `develop`. Ask before committing. Never push unless explicitly requested.
- **No `Co-authored-by` trailers** on commits in this repo.
- **No Supabase RLS / migration changes** without explicit human approval.

## When NOT to delegate

For one-liner edits, doc reads, or quick questions, do the work directly. Persona delegation has overhead — only use it when the task fits the persona's full workflow.
