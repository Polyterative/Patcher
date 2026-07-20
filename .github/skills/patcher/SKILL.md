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
| Review a backend/storage/schema plan before approval or implementation | **backend-plan-reviewer** | `claude-opus-4.7` | `internaldocs/agents/backend-plan-reviewer.md` |
| Hard ambiguous problem, high-risk decision, or explicit premium-model counsel request | **advisor** | `claude-opus-4.7` | `internaldocs/agents/advisor.md` |
| Implement Angular component / service / RxJS pipeline | **frontend-dev** | `gpt-5.5` | `internaldocs/agents/frontend-dev.md` |
| Design visual / spacing / responsive direction, UI structure, or product organization | **designer** | `claude-sonnet-4.6` | `internaldocs/agents/designer.md` |
| Review a diff / branch / PR before commit | **reviewer** | `gpt-5.4-mini` | `internaldocs/agents/reviewer.md` |
| Restructure code without changing behaviour | **refactorer** | `gpt-5.5` | `internaldocs/agents/refactorer.md` |
| Add unit / E2E test coverage | **test-writer** | `gpt-5.5` | `internaldocs/agents/test-writer.md` |
| Diagnose a defect to root cause | **bug-hunter** | `gpt-5.4` | `internaldocs/agents/bug-hunter.md` |
| "Begin loop", "run the loop", "via loop", or run one/full/multiple TODO → implementation → review → documentation cleanup cycles | **coordinator-loop** | `gpt-5.5` | `internaldocs/agents/coordinator-loop.md` |
| Boot a long-running autonomous loop driven by `agent/` and `internaldocs/workflow/` (replaces pasting a 10 KB mission prompt by hand) | **autonomous-engineer** | `gpt-5.5` | `internaldocs/agents/autonomous-engineer.md` |

**Model policy:** use `gpt-5.5` for coding-heavy executors (`frontend-dev`, `refactorer`, `test-writer`, `autonomous-engineer`), `claude-sonnet-4.6` for non-coding visual/structural design work, and `claude-opus-4.7` for planning and premium counsel. Use cheaper OpenAI models for read-heavy tasks: `gpt-5.4` for root-cause diagnosis and `gpt-5.4-mini` for diff review. Escalate review/diagnosis only for hard architecture, security, or data-loss risk.

**Composition flows:**

- Idea intake: `feature-notetaker` → backlog plan → `coordinator-loop` later
- Frontend feature: `planner` → `frontend-dev` → `reviewer`
- Backend/schema feature: `planner` → `backend-plan-reviewer` → executor → `reviewer`
- Hard decision: normal investigation → `advisor` → appropriate executor
- Bug fix: `bug-hunter` → `frontend-dev` → `test-writer`
- Cleanup: `refactorer` → `reviewer`
- Visual: `designer` → `frontend-dev` → `reviewer`
- Backlog automation: foreground decision coordinator ("via loop") → `coordinator-loop` / executor persona → `reviewer` → docs cleanup → next safe task or next queued product question

### "Via loop" operating mode

When the user says **"via loop"**, resume the collaborative orchestration mode:

1. Act as the foreground decision coordinator, not the main coder.
2. Read active/completed subagent results, `git status`, `CURRENT_FEATURE.md`,
   and `TODO.md`.
3. Delegate implementation/review/recorder work to subagents.
4. Ask product-owner questions with `ask_user` while subagents run when the
   questions are independent of the running work.
5. Record approvals in workflow docs through small recorder tasks.
6. Immediately continue after each subagent completes while safe work remains.
7. Stop only when no safe work remains without product-owner answers; then ask
   the next highest-leverage queued question.

## Tooling that is configured but easy to miss

The repo has these wired up in `.github/` — **prefer them over `grep` / `find`**:

1. **LSP** (TypeScript, `.github/lsp.json`) — use the `lsp` tool for known symbols: `findReferences`, `goToDefinition`, `documentSymbol`, `incomingCalls`, `hover`. Reliable for file-scoped ops; `workspaceSymbol` may need a warmup query.
2. **cocoindex-code-search** MCP (`.github/mcp.json`) — semantic search across 10.890+ TS chunks, local embeddings (zero API cost), daemon refreshes on save. Use for *concept* queries ("how is auth wired", "where do we cache rack lists"). Start with `limit: 5`.
3. **Sentry MCP** — pull issue details directly; do not ask the user to paste stack traces.
4. **Supabase MCP** — **read-only inspection only** (list tables, advisors, logs). Never apply migrations / RLS changes without explicit user approval.
5. **GitHub MCP** — PR / issue / Actions inspection.

**Search order:** LSP (named symbols) → cocoindex (concepts) → grep+glob (literals only).

## Copilot session coordination: Orchestrate

The user-level **`orchestrate`** skill is available in the GitHub Copilot session UI. Use it when the user explicitly asks for
Orchestrate, or when the work should be split across separate sessions/branches because it is multi-repo, stacked/dependent PR work,
parallel fan-out, or an alternative exploration.

Do **not** replace ordinary Patcher persona delegation with Orchestrate. For a single change in this repo, stay in this session and use
the persona routing above. For single-repo research in this checkout, stay inline. When Orchestrate is appropriate, load the skill,
announce the session plan before spawning anything, and give each child session a standalone prompt that includes the relevant Patcher
rules from `AGENTS.md`. After consuming each child result, complete the lifecycle by archiving the session and verifying that its
worktree and local branch were removed; preserve anything dirty or not yet reconciled.

## Hard rules (copy from AGENTS.md, surfaced here for visibility)

- Package manager: `pnpm` only. Prefer `pnpm test-headless`, `pnpm lint`, `pnpm test:e2e:auth`, `pnpm updateBackendTypes`. Never `npm install`, `ng test`, or watch variants unless explicitly asked.
- Layering: `Component → Data Service → API Service → Supabase`. Backend access only through `SupabaseService`.
- Data services: `@Injectable()` component-provided. API services: `@Injectable({ providedIn: 'root' })`.
- Subscriptions: extend `SubManager`, use `takeUntil(this.destroy$)`, or `async` pipe in template.
- Naming: observables/subjects suffix `$`, private `BehaviorSubject` prefix `_`.
- New Supabase queries: explicit column lists (no `select('*')`), register table in `DatabaseStrings.ts` first, bust caches on writes.
- Git: branch `develop` is primary, never run `release:*` from `develop`. **Commit every completed, validated chunk immediately as its own isolated commit** (standing approval — do not ask): one chunk = one commit, stage only that chunk's files (never `git add -A` with unrelated changes present), never leave finished work uncommitted, leave pre-existing foreign changes untouched. Never push unless explicitly requested. Never force-push (`--force`, `--force-with-lease`, or equivalent history-rewriting ref updates) unless the user explicitly requests a force push in that turn.
- **No `Co-authored-by` trailers** on commits in this repo.
- **No Supabase RLS / migration changes** without explicit human approval.
- Work on `develop` by default. Do not switch to `production`, release, or push unless explicitly asked; the user owns production rollout.
- Avoid backend-breaking changes that could break the currently published production app unless the user explicitly approves them while present. Prefer additive/backward-compatible backend changes.
- Code execution is autonomous, but UX placement/hierarchy is co-designed: before implementing meaningful new UI surfaces, ask for a short placement approval (where it lives, visual weight, affected/excluded surfaces). Use `designer` first when visual hierarchy or information architecture is ambiguous.
- Feature flags are optional, not required for every new feature. Use them when the user wants something hidden, when production needs shielding while `develop` remains reviewable, or as a safe backend rollout switch.

## When NOT to delegate

For one-liner edits, doc reads, or quick questions, do the work directly. Persona delegation has overhead — only use it when the task fits the persona's full workflow.
