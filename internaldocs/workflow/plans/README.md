# Plans

Per-task plan files. **One file per task.** This folder is the source of truth
for backlog detail; [`../TODO.md`](../TODO.md) is just an index.

## Why

A monolithic 1500-line `TODO.md` is the "instruction manual" anti-pattern: it
crowds out the agent's context window, rots quickly, and is hard to verify
mechanically. A per-task plan stays small enough to fully load, stable enough
to track decisions against, and structured enough to lint.

See [`../../../AGENTS.md`](../../../AGENTS.md) §10 and the doc-splitting
rationale documented inline in `scripts/dev/split-todo.cjs`.

## File contract

Each plan file has:

1. **Header comment** with the section it belongs to (auto-generated).
2. **Goal** — one sentence (already present in legacy entries; keep it).
3. **Layers** (when applicable) — Patcher's MVP → Structural → Polish convention.
4. **Checklist** — `[ ]` / `[~]` / `[x]` items.
5. **Decision log** — append-only, timestamped one-liners for non-obvious
   choices made while implementing. Future agents read this to avoid relitigating.

## Lifecycle

- **Open:** plan file lives directly under `plans/`.
- **Active:** mirror the active plan into [`../CURRENT_FEATURE.md`](../CURRENT_FEATURE.md).
- **Done:** move the file to `plans/done/<slug>.md`, add a one-line entry to
  [`../COMPLETED.md`](../COMPLETED.md) with the date, and remove the index entry
  from `../TODO.md`.
- **Automated loop:** use [`../../agents/coordinator-loop.md`](../../agents/coordinator-loop.md)
  when an agent should select one TODO item, delegate implementation, run independent
  review, validate, and perform the cleanup above.

## Tooling

- `scripts/dev/split-todo.cjs` — one-shot splitter (already run; kept for repeatability).
- New plan: create a file here, then add a one-line link to `../TODO.md`.
- Rough feature intake: use [`../../agents/feature-notetaker.md`](../../agents/feature-notetaker.md)
  to research the request, assign priority/roadmap fit, create exactly one plan
  file here, and add the matching one-line TODO entry.
- Avoid editing the index by hand for batch changes — prefer a small script that
  rewrites it deterministically.
