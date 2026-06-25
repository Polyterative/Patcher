# Current Feature / AI RAM

> **Rules for AI agents:**
> 1. Read this file when the task is about the active in-flight feature or explicitly references the current plan.
> 2. Keep it updated — check off steps, add discoveries.
> 3. One feature at a time — archive to [COMPLETED.md](./COMPLETED.md) when done, then reset.
> 4. This file owns implementation detail; `TODO.md` owns the backlog index, `plans/` owns per-task detail.
> 5. **Every feature uses three layers** (MVP → Structural → Polish). Define all three before coding. Complete each layer before starting the next. Layout before interactions.
> 6. **Append to the Decision log** for any non-obvious choice (library pick, data shape, fallback policy, scope cut). Future agents read this to avoid relitigating settled questions.

---

## Active

Module I/O — bidirectional and passive port planning

Plan: [module-io-bidirectional-passive-port-support.md](./plans/module-io-bidirectional-passive-port-support.md)
Status: **Planning/approval gate active. The user selected separate `bidirectional` and `passive` direction values. Current implementation uses split `module_ins` / `module_outs` tables and `backend.update.moduleINsOUTs`, so the next checkpoint must be a backward-compatible local schema proposal only. No SQL, backend type generation, RLS, or remote Supabase changes are approved yet.**
Staged: 2026-06-25T16:21+02:00

#### Why this is next

- Cross-entity Cool patch support is checkpointed; remaining Cool alignment work is gated on runtime screenshot approval, and the user chose to skip visual validation for now.
- Manufacturer Accounts remains blocked behind local type generation/backend-access dependencies.
- Module I/O is the next non-held backlog item, but it has schema semantics that must be decided before implementation.

#### Safety gate

- Before any schema / migration / RPC work, read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight.
- No Supabase migration, RLS, or backend type-generation changes before explicit user approval.
- Any migration proposal must be additive/backward-compatible with existing `module_ins` and `module_outs` data.
- Do not rewrite existing port rows, alter production behavior, switch branches, release, or push.
- If typegen is evaluated later, treat it as a local candidate diff and revert unrelated regressions.

#### Layer checklist

- [x] Select Module I/O as the next non-held, non-visual backlog item.
- [x] Record the product-owner decision to use separate `bidirectional` and `passive` direction values.
- [x] Inspect the current implementation shape: split `module_ins` / `module_outs` tables, `DbModule.ins` / `DbModule.outs`, and `backend.update.moduleINsOUTs`.
- [x] Record a schema/RLS approval question for the next checkpoint.
- [ ] After approval, draft a local-only additive migration proposal.

#### Approval queue

- **Approval requested 2026-06-25T16:21+02:00:** May the next checkpoint draft a local-only, additive schema migration proposal for separate bidirectional and passive module port directions, with no remote Supabase apply and no production-breaking rewrite of existing `module_ins` / `module_outs` data? Default if not approved: keep this task planning/docs-only.

#### Validation strategy

- Docs-only gate: `node scripts/checks/check-docs.cjs` and `git diff --check`.
- Migration proposal checkpoint: schema preflight read, focused backend type/mapping tests if code changes occur, and `pnpm lint`.
- UI/editor checkpoint: focused module-editor I/O tests and patch-connection tests.

#### Decision log

- 2026-06-25T16:21+02:00 — User chose separate `bidirectional` and `passive` direction values for Module I/O support.
- 2026-06-25T16:21+02:00 — Current implementation inspection found split `module_ins` / `module_outs` persistence rather than a unified direction column. The next checkpoint is therefore approval-gated planning/schema work, not immediate UI implementation.
