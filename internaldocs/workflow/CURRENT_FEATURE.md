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

Cross-entity Cool reactions — planning/approval gate

Plan: [module-cool-appreciation-button.md](./plans/module-cool-appreciation-button.md)
Status: **Approval recorded for the next implementation checkpoint only if it remains non-breaking for the current production build. The approved path is additive/narrow Cool reactions schema/RLS planning and application for modules + public racks initially; stop before any breaking change, unrelated RLS/policy change, risky production behavior, or broader entity scope.**
Staged: 2026-06-19T09:21+02:00

#### Why this is next

- Patch SVG preview backend/storage and timestamp-preservation checkpoints exist locally, but read-only Supabase MCP inspection still shows the linked remote lacks `patches.image`, lacks the `patches` bucket, and has divergent migration history.
- The remaining Patch SVG preview UI/data-service work depends on remote migration/typegen reconciliation and must stay blocked.
- Cross-entity Cool reactions is the next highest-priority non-held INFRA item with a plan; only planning/approval-gate work is safe before schema/RLS approval.

#### Safety gate

- Read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight before any SQL draft.
- Do not apply migrations, RLS/policies, grants, RPCs, generated types, or Supabase mutations for Cool until explicit approval is recorded.
- Initial implementation scope should be narrow: modules and public racks first, patches in the structural layer after the data path is proven.

#### Layer checklist

- [x] Re-read the existing Cool plan and stage it as the active safe task.
- [x] Record the explicit schema/RLS approval question in the plan.
- [x] Record conditional user approval for the narrow, non-breaking schema/RLS checkpoint.
- [ ] Draft the narrow schema/RLS/RPC checkpoint for reactions and reaction counts.
- [ ] Implement backend methods through `SupabaseService` only, with cache keys and focused tests.
- [ ] Add shared Cool UI/data-service wiring for the approved MVP surfaces.

#### Approval queue

- **Approval requested 2026-06-19T09:21+02:00:** May the next implementation checkpoint draft and apply a narrow Cool reactions schema/RLS plan for a polymorphic `reactions` table plus aggregate `reaction_counts` support, limited initially to modules and public racks? Default if not approved: keep work planning/docs-only and do not create migrations, policies, RPCs, or generated type changes.
- **Approval recorded 2026-06-19T09:20+02:00:** User approved “as usual” only if the checkpoint is not a breaking change to the current production build. Treat this as conditional approval for additive/narrow schema/RLS work only: modules + public racks initially, no unrelated RLS/policy changes, and stop before any breaking change or risky production behavior.

#### Validation strategy

- Docs-only gate: `node scripts/checks/check-docs.cjs` and `git diff --check`.
- After approval and implementation: focused backend/cache specs, Cool button/user-area specs, then `pnpm lint`.

#### Decision log

- 2026-06-19T09:21+02:00 — Pivoted from Patch SVG previews after read-only Supabase inspection reconfirmed linked migration/typegen drift and missing patch preview remote objects. Staged Cross-entity Cool reactions as planning/approval-gate only because it requires schema/RLS/policy work before code can safely start.
- 2026-06-19T09:20+02:00 — User conditionally approved the next Cool reactions schema/RLS checkpoint only if it is non-breaking for the current production build. Scope remains additive and narrow: polymorphic `reactions` plus aggregate `reaction_counts`, modules + public racks initially, no unrelated RLS/policy changes, and stop before any breaking change or risky production behavior.
