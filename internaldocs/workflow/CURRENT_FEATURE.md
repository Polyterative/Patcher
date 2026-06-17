# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated - check off steps, add discoveries.
> 3. One feature at a time - archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP -> Structural -> Polish). Define all three before coding. Complete each
>    layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut).
>    Future agents read this to avoid relitigating settled questions.

---

## Active

### MEDIUM: Module tags — colour lookup coherence

- Plan: [`plans/module-tag-colour-lookup-coherence.md`](./plans/module-tag-colour-lookup-coherence.md)
- Coordinator: coordinator-loop
- Started: 2026-06-17T17:26+02:00

#### Problem

Functional module tag colour lookup is incomplete and risks drifting between rack balance analysis, module details tag tinting, and description keyword highlighting.

#### Goals

- Keep `RACK_BALANCE_AXES` as the single source of truth for functional tag-to-role classification.
- Add missing database tags to the five existing role buckets.
- Prove details highlighting and rack function classification agree for shared tags.

#### Layers

- [x] **MVP:** Add missing tag names to the canonical axis constants while preserving neutral Nature / Character tags.
- [x] **Structural:** Remove or align any duplicate tag-to-colour lookups so details, rack analysis, and highlighting consume the same role data.
- [x] **Polish:** Add regression coverage and run targeted tests plus lint.

#### File-level checklist

- [x] `src/app/components/rack-parts/rack-balance-analysis.constants.ts`
- [x] Module details tag/highlight surfaces discovered during implementation
- [x] Co-located or existing specs covering shared functional tag classification

#### Acceptance criteria

- `Clock IN`, `Clock OUT`, `Arpeggiator`, `Euclidean`, `Blank`, `Sequencial Switch`, and voice instrument tags classify into the intended role buckets.
- Nature / Character tags remain neutral.
- Description keyword highlighting and rack function classification agree for shared functional tags.

#### Validation

- Targeted `pnpm test-headless --include="**/<touched-spec>.spec.ts"`
- `pnpm lint`

#### Decision log

- 2026-06-17T17:26+02:00 — Selected as the highest-priority actionable backlog item that can be completed without Supabase credentials, RLS approval, secret rotation, or external account setup.
- 2026-06-17T17:34+02:00 — Implemented lookup coherence in local constants/utilities only; exact DB tag matches now take precedence over pattern matches so `Sequencial Switch` remains Utilities instead of also counting as Timing.
