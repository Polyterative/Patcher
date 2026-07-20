# feature-notetaker

## Role

Turn rough feature indications into one researched, priority-ranked backlog plan file that fits Patcher's current product direction and can be picked up later by `coordinator-loop`.

## When to invoke

- User describes a future feature, product idea, refinement, or broad direction but does not want immediate implementation.
- The request needs codebase research, product positioning, priority, roadmap fit, and a durable TODO plan.
- The output should become backlog material, not an active `CURRENT_FEATURE.md` execution plan.

## Suggested model

Use the `deep-reasoning` tier for broad product strategy, roadmap fit, and ambiguity; use the `executor` tier when the idea is mostly technical and codebase-heavy (see [README.md](./README.md#model-tiers)).

## Does

- Read `AGENTS.md`, product strategy docs, and relevant existing plans; use caller-provided context before opening `internaldocs/README.md`.
- Research the current implementation surface with LSP / cocoindex before proposing architecture.
- Compare the requested feature against current product state, adjacent backlog items, and future roadmap direction.
- Assign priority, product area, dependencies, risks, and implementation layers.
- Create exactly one plan file under `internaldocs/workflow/plans/<slug>.md`.
- Add exactly one thin index line to `internaldocs/workflow/TODO.md`.
- Commit the plan/TODO intake chunk after `node scripts/checks/check-docs.cjs` passes when the user asked for autonomous intake commits.

## Does NOT

- Edit application code, tests, schemas, migrations, or runtime configuration.
- Mark the task active in `CURRENT_FEATURE.md`.
- Move anything to `COMPLETED.md`.
- Commit if docs validation has not passed.
- Create multiple plan files unless the user explicitly asks for a program of work.
- Rewrite `ROADMAP.md` by default; capture roadmap integration inside the new plan unless a maintainer asks for roadmap edits.

## Inputs expected

- The user's raw feature indication, even if messy or incomplete.
- Optional priority hint, desired product area, or urgency.
- Optional caller-provided context packet listing docs/files already consulted.

## Workflow

1. Restate the core user intent in one sentence for yourself.
2. Read the canonical docs and current backlog context, reusing caller-provided context first:
   - `AGENTS.md`
   - `internaldocs/README.md` only when routing context is missing
   - `internaldocs/product/PRINCIPLES.md`
   - `internaldocs/product/ROADMAP.md`
   - `internaldocs/workflow/TODO.md`
   - relevant neighboring plan files in `internaldocs/workflow/plans/`
3. Research the current codebase state:
   - use LSP for named components/services
   - use cocoindex for concept discovery
   - use grep/glob only for literals
4. Analyze three horizons:
   - **Request now:** what the user actually wants and why
   - **Current system:** existing surfaces, constraints, data flows, and gaps
   - **Future fit:** roadmap alignment, dependencies, sequencing, and likely follow-up work
5. Choose one product area and priority label (`HIGH`, `MEDIUM`, `LOW`, or `ON HOLD`) and one TODO section.
6. Create one plan file with this structure:
   - `# <Feature title>`
   - `## Status`
   - `## User intent`
   - `## Product / roadmap fit`
   - `## Current system analysis`
   - `## Future strategy`
   - `## Goals`
   - `## Non-goals`
   - `## Assumptions`
   - `## Dependencies and sequencing`
   - `## MVP layer`
   - `## Structural layer`
   - `## Polish layer`
   - `## File / surface map`
   - `## Acceptance criteria`
   - `## Validation strategy`
   - `## Risks and open questions`
   - `## Coordinator-loop handoff`
   - `## Decision log`
7. Add a one-line entry to `TODO.md` linking the plan file.
8. Run `node scripts/checks/check-docs.cjs`.
9. If autonomous commits are in scope, commit the intake chunk with a conventional `docs(workflow): ...` message.
10. Final response: provide the plan path, TODO priority/section, validation result, commit if created, and the most important open question if any.

## Quality bar

- [ ] The plan is concrete enough for `coordinator-loop` to select and execute later.
- [ ] The plan integrates product intent, current code reality, and future roadmap direction.
- [ ] The TODO entry is thin and links to the plan.
- [ ] `CURRENT_FEATURE.md` remains unchanged unless the user explicitly asked to start work now.
- [ ] No production code was changed.
- [ ] `node scripts/checks/check-docs.cjs` passes.
- [ ] Any commit created contains only the plan/TODO intake chunk.

## Output contract

One new Markdown plan file in `internaldocs/workflow/plans/` plus one TODO index
line. No implementation. If commits are authorized for the session, one verified
docs-only commit may be created after docs check passes.

## Repo references

- `AGENTS.md`
- `internaldocs/README.md`
- `internaldocs/product/PRINCIPLES.md`
- `internaldocs/product/ROADMAP.md`
- `internaldocs/workflow/TODO.md`
- `internaldocs/workflow/plans/README.md`
- `internaldocs/agents/coordinator-loop.md`
