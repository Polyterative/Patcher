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

Cross-entity Cool reactions — gated UI checkpoint complete

Plan: [module-cool-appreciation-button.md](./plans/module-cool-appreciation-button.md)
Status: **Local additive backend checkpoint and disabled-by-default shared UI/data-service checkpoint are implemented. Remote Supabase migration/typegen application remains blocked by recorded linked-database drift, so production-visible Cool wiring must stay gated off until the remote Cool objects exist.**
Staged: 2026-06-19T09:21+02:00

#### Why this is next

- Patch SVG preview backend/storage and timestamp-preservation checkpoints exist locally, but read-only Supabase MCP inspection still shows the linked remote lacks `patches.image`, lacks the `patches` bucket, and has divergent migration history.
- The remaining Patch SVG preview UI/data-service work depends on remote migration/typegen reconciliation and must stay blocked.
- Cross-entity Cool reactions is the next highest-priority non-held INFRA item with a plan. The local backend and shared guarded UI checkpoints are complete; production-facing UI remains gated until remote schema/typegen drift is reconciled.

#### Safety gate

- Read `internaldocs/patterns/BACKEND_METHODS.md` schema-change preflight before any SQL draft.
- Do not remotely apply migrations, RLS/policies, grants, RPCs, generated types, or Supabase mutations for Cool until the linked Supabase drift is reconciled and explicit operational approval is recorded.
- Initial implementation scope should be narrow: modules and public racks first, patches in the structural layer after the data path is proven.
- Any UI wiring before remote migration application must be behind a disabled-by-default feature guard so the current production build never queries missing Cool backend objects.

#### Layer checklist

- [x] Re-read the existing Cool plan and stage it as the active safe task.
- [x] Record the explicit schema/RLS approval question in the plan.
- [x] Record conditional user approval for the narrow, non-breaking schema/RLS checkpoint.
- [x] Draft the narrow schema/RLS/trigger checkpoint for reactions and reaction counts.
- [x] Implement backend methods through `SupabaseService` only, with cache keys and focused tests.
- [x] Add disabled-by-default shared Cool UI/data-service wiring for the approved MVP surfaces, with tests proving no backend calls when gated off.

#### Approval queue

- **Approval requested 2026-06-19T09:21+02:00:** May the next implementation checkpoint draft and apply a narrow Cool reactions schema/RLS plan for a polymorphic `reactions` table plus aggregate `reaction_counts` support, limited initially to modules and public racks? Default if not approved: keep work planning/docs-only and do not create migrations, policies, RPCs, or generated type changes.
- **Approval recorded 2026-06-19T09:20+02:00:** User approved “as usual” only if the checkpoint is not a breaking change to the current production build. Treat this as conditional approval for additive/narrow schema/RLS work only: modules + public racks initially, no unrelated RLS/policy changes, and stop before any breaking change or risky production behavior.

#### Validation strategy

- Docs-only gate: `node scripts/checks/check-docs.cjs` and `git diff --check`.
- Gated UI checkpoint: focused Cool button/data-service specs proving gate-off no-op behavior, plus `pnpm lint`.
- After remote migration/typegen reconciliation: focused backend/cache specs, Cool button/user-area specs, auth E2E where practical, then `pnpm lint`.

#### Decision log

- 2026-06-19T09:21+02:00 — Pivoted from Patch SVG previews after read-only Supabase inspection reconfirmed linked migration/typegen drift and missing patch preview remote objects. Staged Cross-entity Cool reactions as planning/approval-gate only because it requires schema/RLS/policy work before code can safely start.
- 2026-06-19T09:20+02:00 — User conditionally approved the next Cool reactions schema/RLS checkpoint only if it is non-breaking for the current production build. Scope remains additive and narrow: polymorphic `reactions` plus aggregate `reaction_counts`, modules + public racks initially, no unrelated RLS/policy changes, and stop before any breaking change or risky production behavior.
- 2026-06-19T09:32+02:00 — Implemented the local-only backend checkpoint with additive `reactions` / `reaction_counts` migration objects, narrow RLS, SupabaseService add/delete/get methods, cache keys, and focused tests. Skipped remote typegen because linked Supabase drift is already recorded; manually updated `src/backend/database.types.ts` for the two new tables. Reviewer pass narrowed module eligibility to `modules.public = true` so aggregate counts cannot expose non-public module IDs.
- 2026-06-19T09:43+02:00 — Reconciled workflow state after the backend checkpoint. Because the current production database may not have the new Cool objects yet, the next UI/data-service work is only safe if it is disabled by default and tests prove it performs no Cool backend reads/writes while gated off.
- 2026-06-19T09:45+02:00 — Added disabled-by-default `coolReactionsEnabled` environment flag plus shared `app-cool-button` / component-scoped data service. The service routes enabled reads/writes through `SupabaseService`, optimistically toggles with rollback, and focused specs prove feature-off and ineligible paths render no button and make no Cool backend calls.
