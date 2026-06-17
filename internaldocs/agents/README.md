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
5. **Match model cost to task shape.** Coding-heavy executors mostly use `gpt-5.5`; visual design
   uses Sonnet; deep planning/advice uses Opus; read-only review starts on cheaper OpenAI models.
6. **Token-cheap.** Keep each file under ~120 lines. Cut prose, keep checklists.

## Personas

| Persona | Model | Strategy | Output |
| --- | --- | --- | --- |
| [`planner.md`](./planner.md) | `claude-opus-4.7` | Use premium reasoning for cross-cutting plans where bad scope is expensive. | Plan in `internaldocs/workflow/CURRENT_FEATURE.md` |
| [`feature-notetaker.md`](./feature-notetaker.md) | `claude-opus-4.7` | Turn rough feature ideas into researched backlog plans with priority, roadmap fit, and coordinator-loop handoff. | One plan file in `workflow/plans/` + TODO line |
| [`advisor.md`](./advisor.md) | `claude-opus-4.7` | Reserve Opus for hard ambiguity, architecture tradeoffs, and second opinions. | Concise recommendation, no edits |
| [`frontend-dev.md`](./frontend-dev.md) | `gpt-5.5` | Primary coding executor; use the model that has been strongest on implementation quality. | Code + co-located tests |
| [`designer.md`](./designer.md) | `claude-sonnet-4.6` | Use Sonnet for abstract visual, spatial, structural, and organizational reasoning. | Visual/design handoff for `frontend-dev`, no code edits |
| [`reviewer.md`](./reviewer.md) | `gpt-5.4-mini` | Read-only diff analysis should be cost-efficient; escalate to `gpt-5.5` only for risky changes. | Inline findings, no edits |
| [`refactorer.md`](./refactorer.md) | `gpt-5.5` | Behaviour-preserving code changes require strong coding and call-site reasoning. | Behaviour-preserving diffs + green tests |
| [`test-writer.md`](./test-writer.md) | `gpt-5.5` | Test code is still code; prioritize robust fixtures and regression coverage over lowest cost. | New spec files, no production changes |
| [`bug-hunter.md`](./bug-hunter.md) | `gpt-5.4` | Diagnosis is read-heavy but can need deeper reasoning than review; hand fixes to `frontend-dev`. | Root-cause writeup + minimal fix |
| [`coordinator-loop.md`](./coordinator-loop.md) | `gpt-5.5` | Triggered by "begin loop" / "run the loop"; selects one task, delegates implementation and review, validates, commits verified chunks, and archives docs. | Completed TODO → plan → implementation → review → verified commits → COMPLETED loop |
| [`autonomous-engineer.md`](./autonomous-engineer.md) | `gpt-5.5` | Long-running executor that repeatedly writes and validates code; optimize for implementation quality. | Iterative commits + doc updates over a multi-hour session. Heavier than the other personas by design (full mission prompt) — load it once instead of pasting. |

## Composition patterns

- **Plan → Build → Review:** `planner` → `frontend-dev` → `reviewer`
- **Idea intake → Backlog:** `feature-notetaker` → `coordinator-loop` later
- **Hard decision:** normal investigation → `advisor` → appropriate executor
- **Bug fix:** `bug-hunter` → `frontend-dev` (apply minimal fix) → `test-writer` (regression test)
- **Refactor sweep:** `refactorer` → `reviewer`
- **UI polish:** `designer` → `frontend-dev` → `reviewer`
- **Backlog automation loop:** `coordinator-loop` → executor persona → `reviewer` → workflow doc cleanup

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

## Workflow
1. ...
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
