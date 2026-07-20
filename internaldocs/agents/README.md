# Specialised Agents — Index

Short, focused agent personas for delegated tasks in Patcher. Each file is a **drop-in system
prompt**: paste its contents at the top of a chat or `task` invocation when you want that
specific behaviour.

## Design rules for every persona file in this folder

1. **Single responsibility.** One agent = one job. If a task crosses lines, hand off explicitly.
2. **Reference, don't duplicate.** Always defer to `AGENTS.md` for repo-wide rules
   (commands, git policy, layering, naming). Persona files only add *role-specific* behaviour.
3. **Hard scope boundary.** Each persona has explicit "Does" / "Does NOT" sections.
   Out-of-scope work must be handed back, not silently absorbed.
4. **Tight output contract.** Each persona declares the artifact it produces and where it goes.
5. **Match model cost to task shape.** Personas reference **model tiers**, not concrete model
   IDs. The tier → model mapping lives only in the table below; update it in one place when
   models change.
6. **Token-cheap.** Keep each file under ~120 lines. Cut prose, keep checklists.
7. **Caller context first.** When a coordinator/planner passes a context packet, trust it and read
   only the named task docs/files. Do not reload `internaldocs/README.md` or the agent index unless
   the packet is missing routing context or you are blocked.

## Model tiers

Single source of truth for tier → model. Personas name a tier; resolve it here at invocation
time. When a better model ships, update **only this table**.

| Tier | Current model | Use for |
| --- | --- | --- |
| `executor` | `gpt-5.5` | Writing/refactoring production code and tests |
| `deep-reasoning` | `claude-opus-4.7` | Planning, architecture tradeoffs, hard ambiguity, product framing |
| `visual-design` | `claude-sonnet-4.6` | Visual, spatial, structural, and organizational reasoning |
| `diagnosis` | `gpt-5.4` | Read-heavy root-cause analysis needing more reasoning than review |
| `cheap-review` | `gpt-5.4-mini` | Cost-efficient read-only diff review; escalate to `executor` for risky diffs |

## Personas

| Persona | Tier | Strategy | Output |
| --- | --- | --- | --- |
| [`planner.md`](./planner.md) | `deep-reasoning` | Use premium reasoning for cross-cutting plans where bad scope is expensive. | Plan in `workflow/plans/<slug>.md` + `CURRENT_FEATURE.md` pointer |
| [`backend-plan-reviewer.md`](./backend-plan-reviewer.md) | `deep-reasoning` | Adversarially review backend/storage plans before approval so representation and migration mistakes are caught before code exists. | Plan findings + BLOCK / APPROVE verdict |
| [`feature-notetaker.md`](./feature-notetaker.md) | `deep-reasoning` | Turn rough feature ideas into researched backlog plans with priority, roadmap fit, and coordinator-loop handoff. | One plan file in `workflow/plans/` + TODO line |
| [`advisor.md`](./advisor.md) | `deep-reasoning` | Reserve premium reasoning for hard ambiguity, architecture tradeoffs, and second opinions. | Concise recommendation, no edits |
| [`frontend-dev.md`](./frontend-dev.md) | `executor` | Primary coding executor; use the model that has been strongest on implementation quality. | Code + co-located tests |
| [`designer.md`](./designer.md) | `visual-design` | Use the visual-design tier for abstract visual, spatial, structural, and organizational reasoning. | Visual/design handoff for `frontend-dev`, no code edits |
| [`reviewer.md`](./reviewer.md) | `cheap-review` | Read-only diff analysis should be cost-efficient; escalate to `executor` only for risky changes. | Inline findings, no edits |
| [`refactorer.md`](./refactorer.md) | `executor` | Behaviour-preserving code changes require strong coding and call-site reasoning. | Behaviour-preserving diffs + green tests |
| [`test-writer.md`](./test-writer.md) | `executor` | Test code is still code; prioritize robust fixtures and regression coverage over lowest cost. | New spec files, no production changes |
| [`bug-hunter.md`](./bug-hunter.md) | `diagnosis` | Diagnosis is read-heavy but can need deeper reasoning than review; hand fixes to `frontend-dev`. | Root-cause writeup + minimal fix |
| [`coordinator-loop.md`](./coordinator-loop.md) | `executor` | Triggered by "begin loop" / "run the loop"; selects one task, delegates implementation and review, validates, commits verified chunks, and archives docs. | Completed TODO → plan → implementation → review → verified commits → COMPLETED loop |
| [`autonomous-engineer.md`](./autonomous-engineer.md) | `executor` | Long-running executor that repeatedly writes and validates code; optimize for implementation quality. | Iterative commits + doc updates over a multi-hour session. Heavier than the other personas by design (full mission prompt) — load it once instead of pasting. |

## Composition patterns

- **Frontend plan → Build → Review:** `planner` → `frontend-dev` → `reviewer`
- **Backend plan → Plan review → Build → Diff review:** `planner` → `backend-plan-reviewer` → executor → `reviewer`
- **Idea intake → Backlog:** `feature-notetaker` → `coordinator-loop` later
- **Hard decision:** normal investigation → `advisor` → appropriate executor
- **Bug fix:** `bug-hunter` → `frontend-dev` (apply minimal fix) → `test-writer` (regression test)
- **Refactor sweep:** `refactorer` → `reviewer`
- **UI polish:** `designer` → `frontend-dev` → `reviewer`
- **Backlog automation loop:** `coordinator-loop` → executor persona → `reviewer` → workflow doc cleanup

## Context packet handoff

Coordinators should load repo orientation once, then pass subagents a compact packet:

- applicable `AGENTS.md` rules
- exact plan / issue / task path
- likely files or surfaces
- acceptance criteria and non-goals
- validation commands
- docs already consulted

Subagents should start from that packet, read the exact plan and touched files, and avoid broad
orientation docs unless the packet is insufficient. This prevents repeated README/index loading
across coordinator → executor → reviewer chains.

## Persona file template

```markdown
# <role-name>

## Role
<one sentence>

## When to invoke
- <trigger 1>
- <trigger 2>

## Does
- <bounded responsibilities>

## Does NOT
- <hard exclusions — hand off instead>

## Inputs expected
- <what the caller must provide>
- caller-provided context packet when delegated by another agent

## Workflow
1. Use the caller-provided context packet first; load broad docs only when context is missing
2. ...

## Quality bar (must pass before declaring done)
- [ ] ...
- [ ] ...

## Output contract
<artifact + location>

## Repo references
- `AGENTS.md` (always)
- <specific docs>
```
