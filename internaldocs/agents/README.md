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
5. **No model lock-in by default.** Most personas run on the default model. Only the
   `planner` agent recommends a stronger model — see its file.
6. **Token-cheap.** Keep each file under ~120 lines. Cut prose, keep checklists.

## Personas

| Persona | When to invoke | Output |
| --- | --- | --- |
| [`planner.md`](./planner.md) | Multi-step or cross-cutting work needing a plan before code | Plan in `internaldocs/workflow/CURRENT_FEATURE.md` |
| [`frontend-dev.md`](./frontend-dev.md) | Implement Angular components, services, RxJS pipelines | Code + co-located tests |
| [`designer.md`](./designer.md) | UI/UX adjustments, visual polish, responsive layout | SCSS + template changes + screenshots |
| [`reviewer.md`](./reviewer.md) | Pre-commit / pre-PR review of staged changes | Inline findings, no edits |
| [`refactorer.md`](./refactorer.md) | Clean up code without changing behaviour | Behaviour-preserving diffs + green tests |
| [`test-writer.md`](./test-writer.md) | Add unit/E2E coverage for existing code | New spec files, no production changes |
| [`bug-hunter.md`](./bug-hunter.md) | Diagnose a reported defect to root cause | Root-cause writeup + minimal fix |

## Composition patterns

- **Plan → Build → Review:** `planner` → `frontend-dev` → `reviewer`
- **Bug fix:** `bug-hunter` → `frontend-dev` (apply minimal fix) → `test-writer` (regression test)
- **Refactor sweep:** `refactorer` → `reviewer`
- **UI polish:** `designer` → `reviewer`

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
